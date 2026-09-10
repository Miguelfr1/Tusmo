import test from "node:test";
import assert from "node:assert/strict";
import { postResult } from "./share.js";
import { signSession } from "./auth.js";
import { createMemoryStore } from "./store.js";

const env = { TUSMON_SESSION_SECRET: "x".repeat(40) };
const user = { id: "1".repeat(18), name: "NeKroZ", guildId: "2".repeat(18) };
const png = Buffer.concat([
  Buffer.from("89504e470d0a1a0a", "hex"),
  Buffer.alloc(64),
]).toString("base64");
const body = () => ({
  session: signSession(user, env.TUSMON_SESSION_SECRET),
  image: png,
  round: { number: 1, status: "won", attempts: 3 },
});

test("the result edits the message the /tusmon command left behind", async () => {
  const store = createMemoryStore();
  await store.rememberLaunch(user.id, { token: "tok", channelId: "9" }, 900);
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push([url, options.method]);
    return { ok: true };
  };
  assert.deepEqual(await postResult(body(), env, { store, fetchImpl }), {
    posted: true,
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /\/webhooks\/\d+\/tok\/messages\/@original$/);
  assert.equal(calls[0][1], "PATCH");
  // The same round never goes out twice, however often the activity reopens.
  await assert.rejects(postResult(body(), env, { store, fetchImpl }), /publié/);
});

test("a result with no live interaction is not posted", async () => {
  const store = createMemoryStore();
  await assert.rejects(
    postResult(body(), env, { store, fetchImpl: async () => ({ ok: true }) }),
    /tusmon/,
  );
});

test("an uneditable launch message falls back to a follow-up", async () => {
  const store = createMemoryStore();
  await store.rememberLaunch(user.id, { token: "tok" }, 900);
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(options.method);
    return { ok: options.method === "POST" };
  };
  await postResult(body(), env, { store, fetchImpl });
  assert.deepEqual(calls, ["PATCH", "POST"]);
});

test("anything that is not a PNG is refused", async () => {
  const store = createMemoryStore();
  await store.rememberLaunch(user.id, { token: "tok" }, 900);
  await assert.rejects(
    postResult({ ...body(), image: "aGVsbG8=" }, env, {
      store,
      fetchImpl: async () => ({ ok: true }),
    }),
    /Image/,
  );
});
