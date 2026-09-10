import { createServer as createHttpServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { createGameApi } from "../server/tusmon/api.js";
import { createMemoryStore } from "../server/tusmon/store.js";
import { signSession } from "../server/tusmon/auth.js";

// Explicit, loopback-only demo. This module is never imported by production.
const env = {
  TUSMON_SESSION_SECRET: "local-demo-session-only-not-for-production",
  TUSMON_DAILY_SECRET: "local-demo-daily-only-not-for-production",
};
const user = {
  id: "100000000000000001",
  name: "Dresseur local",
  guildId: "100000000000000002",
};
const handler = createGameApi({
  store: createMemoryStore(),
  env,
  authenticate: async () => ({
    session: signSession(user, env.TUSMON_SESSION_SECRET),
    user,
  }),
});
const api = createHttpServer(async (req, res) => {
  try {
    const request = new Request(`http://127.0.0.1:4174${req.url}`, {
      method: req.method,
      headers: req.headers,
      ...(["GET", "HEAD"].includes(req.method)
        ? {}
        : { body: req, duplex: "half" }),
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end("Local demo error");
  }
});
await new Promise((resolve) => api.listen(4174, "127.0.0.1", resolve));
const vite = await createViteServer({
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: { "/api/tusmon": "http://127.0.0.1:4174" },
  },
});
await vite.listen();
console.log(
  "Tus’Mon local demo: http://127.0.0.1:4173/tusmon?demo=1 (memory resets when stopped)",
);
const close = async () => {
  await vite.close();
  api.close();
  process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
