import { APPLICATION_ID, validInteraction } from "../../server/tusmon/auth.js";
import { json, readBody } from "../../server/tusmon/api.js";
import { createRedisStore } from "../../server/tusmon/store.js";

// Discord keeps an interaction usable for a quarter of an hour, which is the
// window the result has to be posted in.
const LAUNCH_TTL = 890;

export async function POST(request) {
  try {
    const body = await readBody(request, 65536);
    if (
      !validInteraction(
        body,
        request.headers.get("x-signature-ed25519"),
        request.headers.get("x-signature-timestamp"),
        process.env.DISCORD_PUBLIC_KEY,
      )
    )
      return json({ error: "Signature invalide." }, 401);
    const interaction = JSON.parse(body);
    if (interaction.type === 1) return json({ type: 1 });
    if (
      interaction.application_id !==
      (process.env.DISCORD_APPLICATION_ID || APPLICATION_ID)
    )
      return json({ error: "Application invalide." }, 403);
    if (interaction.type === 2 && interaction.data?.name === "tusmon") {
      const userId = (interaction.member?.user || interaction.user)?.id;
      if (userId)
        try {
          const store = createRedisStore({
            url:
              process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
            token:
              process.env.UPSTASH_REDIS_REST_TOKEN ||
              process.env.KV_REST_API_TOKEN,
          });
          await store.rememberLaunch(
            userId,
            { token: interaction.token, channelId: interaction.channel_id },
            LAUNCH_TTL,
          );
        } catch {
          // The game itself matters more than the result message.
        }
      return json({ type: 12 });
    }
    return json({
      type: 4,
      data: {
        content: "Utilise /tusmon pour ouvrir le Pokémon du jour.",
        flags: 64,
        allowed_mentions: { parse: [] },
      },
    });
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }
}
