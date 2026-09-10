import { createGameApi, json } from "../server/tusmon/api.js";
import { createRedisStore } from "../server/tusmon/store.js";

function handler(request) {
  try {
    const store = createRedisStore({
      url:
        process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
      token:
        process.env.UPSTASH_REDIS_REST_TOKEN ||
        process.env.KV_REST_API_TOKEN,
    });
    return createGameApi({ store, env: process.env })(request);
  } catch {
    return json(
      { error: "Tus’Mon est en cours de configuration. Reviens bientôt !" },
      503,
    );
  }
}

export const GET = handler;
export const POST = handler;
