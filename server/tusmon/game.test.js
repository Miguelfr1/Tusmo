import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  challengeDay,
  nextReset,
  targetForDay,
  normalize,
  evaluateGuess,
  newRound,
  publicRound,
  applyAction,
  dailyWallet,
  settleWallet,
  rankedRows,
} from "./game.js";
import { readSession, signSession, validInteraction } from "./auth.js";
import { createGameApi } from "./api.js";
import { createMemoryStore, createRedisStore } from "./store.js";

const env = {
  TUSMON_SESSION_SECRET: "test-session-secret-long-enough-123456",
  TUSMON_DAILY_SECRET: "test-daily-secret-long-enough-12345678",
};
const now = new Date("2026-09-10T10:00:00Z");
const day = challengeDay(now);
const user = {
  id: "100000000000000001",
  name: "Test",
  guildId: "100000000000000002",
};
const target = targetForDay(day, env.TUSMON_DAILY_SECRET);
const action = (type, revision = 0, extra = {}) => ({
  type,
  day,
  revision,
  requestId: `request-${revision}`,
  ...extra,
});
const pokemon = JSON.parse(
  readFileSync(new URL("../../src/data/pokemon.json", import.meta.url), "utf8"),
);
const frenchWords = readFileSync(
  new URL("../../public/mots/tous-v1.txt", import.meta.url),
  "utf8",
).split(/\s+/);
const wrongFrenchWord = (answer) => {
  const solution = normalize(answer);
  return frenchWords.find(
    (word) =>
      word.length === solution.length &&
      word[0] === solution[0] &&
      word !== solution,
  );
};

test("all 1025 species can be selected deterministically; secret required", () => {
  assert.equal(pokemon.length, 1025);
  assert.deepEqual(target, targetForDay(day, env.TUSMON_DAILY_SECRET));
  assert.throws(() => targetForDay(day, "short"));
  const ids = new Set(
    Array.from(
      { length: 18000 },
      (_, i) => targetForDay(`test-${i}`, env.TUSMON_DAILY_SECRET).id,
    ),
  );
  assert.equal(ids.size, 1025);
});
test("Paris midnight including spring and autumn clock changes", () => {
  assert.equal(challengeDay(new Date("2026-09-10T22:00:00Z")), "2026-09-11");
  for (const [start, expected] of [
    ["2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z"],
    ["2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z"],
  ]) {
    assert.ok(
      Math.abs(Date.parse(nextReset(new Date(start))) - Date.parse(expected)) <=
        1000,
    );
  }
});
test("normalization and repeated letters preserve Tusmo rules", () => {
  assert.equal(normalize("Nidoran♀"), "NIDORANF");
  assert.equal(normalize("Porygon-Z"), "PORYGONZ");
  assert.deepEqual(evaluateGuess("AAB", "ABC"), [
    "correct",
    "absent",
    "present",
  ]);
  assert.deepEqual(evaluateGuess("BAA", "ABC"), [
    "present",
    "present",
    "absent",
  ]);
});
test("public state conceals species until completion and rejects invalid guesses", () => {
  const round = newRound(day, user);
  const visible = publicRound(round, target, now);
  assert.equal(visible.solution, null);
  assert.equal("types" in visible, false);
  assert.equal("reward" in visible, false);
  assert.throws(() =>
    applyAction(round, action("guess", 0, { guess: "UNKNOWN" }), target, now),
  );
  assert.throws(() => applyAction(round, action("hint", 9), target, now));
  assert.throws(() =>
    applyAction(round, action("hint", 0, { day: "2026-09-09" }), target, now),
  );
});
test("French words are accepted; hints and currency are absent", () => {
  const pikachu = pokemon.find((p) => p.name === "Pikachu");
  let round = newRound(day, user);
  round = applyAction(
    round,
    action("guess", 0, { guess: "PARFAIT" }),
    pikachu,
    now,
  );
  assert.deepEqual(round.guesses, ["PARFAIT"]);
  assert.throws(() => applyAction(round, action("hint", 1), pikachu, now));
  const profile = dailyWallet(null);
  assert.equal("coins" in profile, false);
  const command = action("guess", 1, { guess: pikachu.name });
  ({ round } = settleWallet(
    profile,
    round,
    applyAction(round, command, pikachu, now),
  ));
  assert.equal(round.status, "won");
  assert.equal("reward" in round, false);
  assert.equal(publicRound(round, pikachu, now).solution.id, pikachu.id);
  assert.equal(applyAction(round, command, target, now), round);
  assert.throws(() =>
    applyAction(round, action("guess", 4, { guess: target.name }), target, now),
  );
});
test("six misses end the round, no seventh attempt", () => {
  const pikachu = pokemon.find((p) => p.name === "Pikachu");
  const wrong = pokemon.find(
    (p) =>
      normalize(p.name).length === 7 &&
      normalize(p.name).startsWith("P") &&
      p.id !== pikachu.id,
  );
  let round = newRound(day, user);
  for (let i = 0; i < 6; i++)
    round = applyAction(
      round,
      action("guess", i, { guess: wrong.name }),
      pikachu,
      now,
    );
  assert.equal(round.status, "lost");
  assert.equal(round.guesses.length, 6);
  assert.throws(() =>
    applyAction(
      round,
      action("guess", 6, { guess: pikachu.name }),
      pikachu,
      now,
    ),
  );
});
test("signed sessions reject tampering and expiry", () => {
  const token = signSession(user, env.TUSMON_SESSION_SECRET, now.getTime());
  assert.equal(
    readSession(token, env.TUSMON_SESSION_SECRET, now.getTime()).id,
    user.id,
  );
  assert.throws(() =>
    readSession(`${token}x`, env.TUSMON_SESSION_SECRET, now.getTime()),
  );
  assert.throws(() =>
    readSession(token, env.TUSMON_SESSION_SECRET, now.getTime() + 3600000),
  );
});
test("Discord signature validates exact raw body, key and fresh timestamp", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const key = publicKey
    .export({ type: "spki", format: "der" })
    .subarray(-32)
    .toString("hex");
  const body = '{"type":1}',
    timestamp = String(now.getTime() / 1000);
  const signature = sign(
    null,
    Buffer.from(timestamp + body),
    privateKey,
  ).toString("hex");
  assert.equal(
    validInteraction(body, signature, timestamp, key, now.getTime()),
    true,
  );
  assert.equal(
    validInteraction(body + " ", signature, timestamp, key, now.getTime()),
    false,
  );
  assert.equal(
    validInteraction(body, signature, timestamp, key, now.getTime() + 301000),
    false,
  );
});
function fixture() {
  const store = createMemoryStore();
  let time = now;
  const api = createGameApi({
    store,
    env,
    clock: () => time,
    cardProvider: async (p) => ({ pokemonId: p.id }),
  });
  const call = async (route, body, player = user) => {
    const response = await api(
      new Request(`https://test.local/api/tusmon?action=${route}`, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${signSession(player, env.TUSMON_SESSION_SECRET, time.getTime())}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
    return { status: response.status, data: await response.json() };
  };
  return {
    call,
    store,
    advance: (date) => {
      time = date;
    },
  };
}
test("API retry is idempotent; two concurrent windows cannot spend twice", async () => {
  const { call } = fixture();
  await call("state");
  const guess = wrongFrenchWord(target.name);
  const commands = [
    action("guess", 0, { guess }),
    action("guess", 0, { guess, requestId: "different-id" }),
  ];
  const results = await Promise.all([
    call("play", commands[0]),
    call("play", commands[1]),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const saved = await call("state");
  assert.equal(saved.data.round.rows.length, 1);
  assert.equal("wallet" in saved.data, false);
  const retry = await call("play", commands[results.findIndex((r) => r.status === 200)]);
  assert.equal(retry.status, 200);
  assert.equal(retry.data.round.rows.length, 1);
});
test("same challenge across accounts, no answer in leaderboard, no replay across servers", async () => {
  const { call } = fixture();
  const a = await call("state"),
    b = await call("state", null, { ...user, id: "100000000000000003" });
  assert.deepEqual(a.data.round, b.data.round);
  assert.equal((await call("card")).status, 403);
  assert.equal((await call("silhouette")).status, 404);
  const won = await call(
    "play",
    action("guess", 0, { guess: target.name, userId: "spoofed" }),
  );
  assert.equal(won.data.round.status, "won");
  assert.equal(won.data.user.id, user.id);
  assert.equal((await call("card")).data.card.pokemonId, target.id);
  const otherServer = { ...user, guildId: "100000000000000004" };
  const board = await call("board&scope=guild", null, otherServer);
  assert.equal(board.data.total, 1);
  assert.equal(board.data.rows[0].rank, 1);
  assert.equal(JSON.stringify(board.data).includes("guesses"), false);
  assert.equal(JSON.stringify(board.data).includes(target.name), false);
  assert.equal(
    (
      await call(
        "play",
        action("guess", 1, { guess: target.name }),
        otherServer,
      )
    ).status,
    409,
  );
  assert.equal(
    (await call("board&scope=guild", null, { ...user, guildId: null })).status,
    400,
  );
});
test("new day permits one new game without exposing currency", async () => {
  const { call, advance } = fixture();
  await call("state");
  await call("play", action("guess", 0, { guess: target.name }));
  await call("state");
  advance(new Date("2026-09-11T10:00:00Z"));
  const next = await call("state");
  assert.equal(next.data.round.status, "playing");
  assert.equal(next.data.round.rows.length, 0);
  assert.equal("wallet" in next.data, false);
  assert.equal("hints" in next.data.round, false);
  assert.equal((await call("play", action("hint"))).status, 409);
});
test("ranking ties share rank; production fails closed without persistent storage", () => {
  assert.deepEqual(
    rankedRows([
      { name: "A", score: 10 },
      { name: "B", score: 10 },
      { name: "C", score: 20 },
    ]).map((r) => r.rank),
    [1, 1, 3],
  );
  assert.throws(() => createRedisStore({}));
});
