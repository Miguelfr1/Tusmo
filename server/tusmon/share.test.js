import test from "node:test";
import assert from "node:assert/strict";
import { collectResults, postResult } from "./share.js";
import { signSession } from "./auth.js";
import { createMemoryStore } from "./store.js";

const env = { TUSMON_SESSION_SECRET: "x".repeat(40) };
const guildId = "2".repeat(18);
const channelId = "3".repeat(18);
const png = Buffer.concat([
  Buffer.from("89504e470d0a1a0a", "hex"),
  Buffer.alloc(64),
]).toString("base64");
const player = { avatar: "", status: "won", length: 5, marks: ["ccccc"] };
const bodyFor = (name, id) => ({
  session: signSession({ id, name, guildId }, env.TUSMON_SESSION_SECRET),
  channelId,
  player,
});
const miggs = () => bodyFor("miggs", "1".repeat(18));
const nekroz = () => bodyFor("NeKroZ", "4".repeat(18));

async function launched() {
  const store = createMemoryStore();
  await store.rememberLaunch(channelId, { token: "tok", guildId }, 900);
  return store;
}

test("the card gathers everyone who played in that channel today", async () => {
  const store = await launched();
  assert.deepEqual(
    (await collectResults(miggs(), env, { store })).players.map((p) => p.name),
    ["miggs"],
  );
  const both = await collectResults(nekroz(), env, { store });
  assert.deepEqual(
    both.players.map((p) => p.name),
    ["miggs", "NeKroZ"],
  );
});

test("the result edits the message the /tusmon command left behind", async () => {
  const store = await launched();
  await collectResults(miggs(), env, { store });
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push([url, options.method]);
    return { ok: true };
  };
  const body = { ...miggs(), image: png };
  assert.deepEqual(await postResult(body, env, { store, fetchImpl }), {
    posted: true,
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /\/webhooks\/\d+\/tok\/messages\/@original$/);
  assert.equal(calls[0][1], "PATCH");
  // The same player never publishes twice, however often they reopen it.
  await assert.rejects(postResult(body, env, { store, fetchImpl }), /publié/);
});

test("a result with no live interaction is not posted", async () => {
  const store = createMemoryStore();
  await assert.rejects(
    postResult({ ...miggs(), image: png }, env, {
      store,
      fetchImpl: async () => ({ ok: true }),
    }),
    /tusmon/,
  );
});

test("a channel from another server is refused", async () => {
  const store = createMemoryStore();
  await store.rememberLaunch(
    channelId,
    { token: "tok", guildId: "9".repeat(18) },
    900,
  );
  await assert.rejects(collectResults(miggs(), env, { store }), /salon/i);
});

test("an uneditable launch message falls back to a follow-up", async () => {
  const store = await launched();
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(options.method);
    return { ok: options.method === "POST" };
  };
  await postResult({ ...miggs(), image: png }, env, { store, fetchImpl });
  assert.deepEqual(calls, ["PATCH", "POST"]);
});

test("anything that is not a PNG is refused", async () => {
  const store = await launched();
  await assert.rejects(
    postResult({ ...miggs(), image: "aGVsbG8=" }, env, {
      store,
      fetchImpl: async () => ({ ok: true }),
    }),
    /Image/,
  );
});

test("a forged grid is refused", async () => {
  const store = await launched();
  await assert.rejects(
    collectResults(
      { ...miggs(), player: { ...player, marks: ["cczzz"] } },
      env,
      { store },
    ),
    /invalide/,
  );
});
