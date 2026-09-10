import { json, readBody } from "../server/tusmon/api.js";
import { createRedisStore } from "../server/tusmon/store.js";
import { collectResults, postResult } from "../server/tusmon/share.js";
import { GameError } from "../server/tusmon/game.js";

export async function POST(request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json"))
      throw new GameError("Format de requête invalide.", 415);
    const body = JSON.parse(await readBody(request, 1600000));
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new GameError("Requête invalide.");
    const store = createRedisStore({
      url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
      token:
        process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
    });
    // The card is drawn in the browser, so a round trip collects the day's
    // players first and the next call brings back the image to publish.
    const run = body.image ? postResult : collectResults;
    return json(await run(body, process.env, { store }));
  } catch (error) {
    return json(
      {
        error:
          error instanceof GameError
            ? error.message
            : "Le partage du résultat a échoué.",
      },
      error instanceof GameError ? error.status : 503,
    );
  }
}
