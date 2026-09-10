import {
  APPLICATION_ID,
  PLAY_BUTTON,
  validInteraction,
} from "../../server/tusmon/auth.js";
import { json, readBody } from "../../server/tusmon/api.js";
import { createRedisStore } from "../../server/tusmon/store.js";
import { challengeDay } from "../../server/tusmon/game.js";
import { statsMessage } from "../../server/tusmon/stats.js";

// Discord keeps an interaction usable for a quarter of an hour, which is the
// window the result has to be posted in.
const LAUNCH_TTL = 890;
// Deep enough to tell a player ranked fortieth where they stand.
const STANDINGS_DEPTH = 50;

const openStore = () =>
  createRedisStore({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token:
      process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  });

const whisper = (content) => ({
  type: 4,
  data: { content, flags: 64, allowed_mentions: { parse: [] } },
});

async function stats(interaction) {
  const guildId = interaction.guild_id;
  // The standing only means something between people who share a server.
  if (!guildId)
    return whisper("Le classement Tus’Mon s’affiche sur un serveur.");
  const userId = interaction.member?.user?.id || interaction.user?.id || "";
  const day = challengeDay();
  const standing = await openStore().standings(
    day,
    `guild:${guildId}`,
    STANDINGS_DEPTH,
  );
  return statsMessage({ day, standing, userId, playButton: PLAY_BUTTON });
}

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
    const launching =
      (interaction.type === 2 && interaction.data?.name === "tusmon") ||
      (interaction.type === 3 && interaction.data?.custom_id === PLAY_BUTTON);
    if (launching) {
      if (interaction.channel_id)
        try {
          await openStore().rememberLaunch(
            interaction.channel_id,
            { token: interaction.token, guildId: interaction.guild_id || null },
            LAUNCH_TTL,
          );
        } catch {
          // The game itself matters more than the result message.
        }
      return json({ type: 12 });
    }
    if (interaction.type === 2 && interaction.data?.name === "stats") {
      try {
        return json(await stats(interaction));
      } catch {
        return json(
          whisper("Le classement est momentanément indisponible. Réessaie."),
        );
      }
    }
    return json(whisper("Utilise /tusmon pour ouvrir le Pokémon du jour."));
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }
}
