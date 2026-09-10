import { GameError } from "./game.js";
import { readSession, APPLICATION_ID } from "./auth.js";

const DISCORD = "https://discord.com/api/v10";
// A generous ceiling for the 560x300 result card, small enough that a forged
// request cannot make the function haul megabytes around.
const MAX_IMAGE_BYTES = 900000;

function botHeaders(env) {
  if (!env.DISCORD_BOT_TOKEN)
    throw new GameError("Le partage automatique n’est pas configuré.", 503);
  return { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` };
}

/**
 * Posts the result card in the channel the activity is running in, the way
 * Wordle does: no picker, no confirmation, just the message.
 */
export async function postResult(body, env, { store, fetchImpl = fetch } = {}) {
  const user = readSession(body.session, env.TUSMON_SESSION_SECRET);
  const channelId = String(body.channelId || "");
  if (!/^\d{17,22}$/.test(channelId))
    throw new GameError("Salon Discord invalide.");
  if (!user.guildId)
    throw new GameError("Ouvre Tus’Mon depuis un serveur pour partager.", 403);
  if (typeof body.image !== "string" || body.image.length > MAX_IMAGE_BYTES)
    throw new GameError("Image de résultat invalide.");
  const image = Buffer.from(body.image, "base64");
  if (
    !image.length ||
    image.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
  )
    throw new GameError("Image de résultat invalide.");

  // One result per round, so a replayed request cannot spam the channel.
  if (store && !(await store.limit(`share:${user.id}`, 3, 3600)))
    throw new GameError("Ton résultat a déjà été publié.", 429);

  const headers = botHeaders(env);
  // The channel comes from the client, so it is only trusted once Discord
  // confirms it belongs to the server the session was verified against.
  const channel = await fetchImpl(`${DISCORD}/channels/${channelId}`, {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!channel.ok)
    throw new GameError("Tus’Mon ne voit pas ce salon Discord.", 403);
  const { guild_id: guildId } = await channel.json();
  if (guildId !== user.guildId)
    throw new GameError("Ce salon n’est pas celui de ta partie.", 403);

  const applicationId = env.DISCORD_APPLICATION_ID || APPLICATION_ID;
  const form = new FormData();
  form.append(
    "payload_json",
    JSON.stringify({
      // The app posts it itself, the way the Wordle bot does: the player
      // never picks a channel and never sends anything.
      content: `${user.name} vient de jouer`,
      allowed_mentions: { parse: [] },
      embeds: [{ color: 0x21644c, image: { url: "attachment://tusmon.png" } }],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: "Jouer",
              url: `https://discord.com/activities/${applicationId}`,
            },
          ],
        },
      ],
    }),
  );
  form.append(
    "files[0]",
    new Blob([image], { type: "image/png" }),
    "tusmon.png",
  );
  const posted = await fetchImpl(`${DISCORD}/channels/${channelId}/messages`, {
    method: "POST",
    headers,
    body: form,
    signal: AbortSignal.timeout(12000),
  });
  if (!posted.ok)
    throw new GameError("Discord a refusé le message de résultat.", 502);
  return { posted: true };
}
