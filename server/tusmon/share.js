import { challengeDay, GameError } from "./game.js";
import { readSession, APPLICATION_ID, PLAY_BUTTON } from "./auth.js";

const DISCORD = "https://discord.com/api/v10";
// A generous ceiling for the result card, small enough that a forged request
// cannot make the function haul megabytes around.
const MAX_IMAGE_BYTES = 1200000;
// The roster outlives the day it belongs to, never the puzzle after it.
const ROSTER_TTL = 172800;
const MAX_PLAYERS = 8;

function readPlayer(body, user) {
  const player = body.player;
  if (!player || typeof player !== "object")
    throw new GameError("Résultat invalide.");
  const marks = Array.isArray(player.marks) ? player.marks : [];
  if (marks.length > 6 || marks.some((row) => !/^[cpa]{1,20}$/.test(row)))
    throw new GameError("Résultat invalide.");
  if (
    !Number.isInteger(player.length) ||
    player.length < 3 ||
    player.length > 20
  )
    throw new GameError("Résultat invalide.");
  return {
    id: user.id,
    name: user.name,
    avatar: /^[a-f0-9_]{1,64}$/i.test(player.avatar || "") ? player.avatar : "",
    status: player.status === "won" ? "won" : "lost",
    length: player.length,
    marks,
    at: Date.now(),
  };
}

function sentence(players) {
  const names = players.map((player) => player.name);
  if (names.length === 1) return `${names[0]} a joué`;
  return `${names.slice(0, -1).join(", ")} et ${names.at(-1)} ont joué`;
}

function resultPayload(players, day) {
  return {
    content: sentence(players),
    allowed_mentions: { parse: [] },
    attachments: [{ id: 0, filename: `tusmon-${day}.png` }],
    embeds: [
      { color: 0x21644c, image: { url: `attachment://tusmon-${day}.png` } },
    ],
    components: [
      {
        type: 1,
        components: [
          // Not a link: the button comes back as an interaction that answers
          // with LAUNCH_ACTIVITY, so pressing it is the same as /tusmon.
          { type: 2, style: 1, label: "Jouer", custom_id: PLAY_BUTTON },
        ],
      },
    ],
  };
}

async function launchFor(body, user, store) {
  const channelId = String(body.channelId || "");
  if (!/^\d{17,22}$/.test(channelId))
    throw new GameError("Salon Discord invalide.");
  const launch = await store.recallLaunch(channelId);
  if (!launch?.token)
    throw new GameError(
      "Relance /tusmon pour que ton résultat soit publié.",
      409,
    );
  // The channel comes from the client, so it is only trusted once it matches
  // the server the session was verified against.
  if (launch.guildId && launch.guildId !== user.guildId)
    throw new GameError("Ce salon n’est pas celui de ta partie.", 403);
  return { channelId, launch };
}

/**
 * Adds the player to the day's roster for that channel and hands back everyone
 * who has finished, so the card can show them all.
 */
export async function collectResults(body, env, { store }) {
  const user = readSession(body.session, env.TUSMON_SESSION_SECRET);
  const { channelId } = await launchFor(body, user, store);
  const day = challengeDay(new Date());
  if (!(await store.limit(`join:${day}:${user.id}`, 4, 3600)))
    throw new GameError("Ton résultat a déjà été enregistré.", 429);
  await store.saveResult(
    day,
    channelId,
    user.id,
    readPlayer(body, user),
    ROSTER_TTL,
  );
  return {
    players: (await store.results(day, channelId)).slice(0, MAX_PLAYERS),
  };
}

/**
 * Posts the card the way Wordle does: by editing the message the /tusmon
 * command left in the channel. The app answers through its own interaction,
 * so nothing here needs a bot sitting in the server.
 */
export async function postResult(body, env, { store, fetchImpl = fetch } = {}) {
  const user = readSession(body.session, env.TUSMON_SESSION_SECRET);
  if (typeof body.image !== "string" || body.image.length > MAX_IMAGE_BYTES)
    throw new GameError("Image de résultat invalide.");
  const image = Buffer.from(body.image, "base64");
  if (
    !image.length ||
    image.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
  )
    throw new GameError("Image de résultat invalide.");
  const { channelId, launch } = await launchFor(body, user, store);
  const day = challengeDay(new Date());
  // One publication per player per day: a card is refreshed by whoever
  // finishes next, never by the same player reopening the activity.
  if (!(await store.limit(`share:${day}:${user.id}`, 1, 7200)))
    throw new GameError("Ton résultat a déjà été publié.", 429);
  const players = (await store.results(day, channelId)).slice(0, MAX_PLAYERS);

  const applicationId = env.DISCORD_APPLICATION_ID || APPLICATION_ID;
  const form = new FormData();
  form.append(
    "payload_json",
    JSON.stringify(
      resultPayload(players.length ? players : [{ name: user.name }], day),
    ),
  );
  form.append(
    "files[0]",
    new Blob([image], { type: "image/png" }),
    `tusmon-${day}.png`,
  );
  const base = `${DISCORD}/webhooks/${applicationId}/${launch.token}`;
  const edited = await fetchImpl(`${base}/messages/@original`, {
    method: "PATCH",
    body: form,
    signal: AbortSignal.timeout(12000),
  });
  if (edited.ok) return { posted: true };
  // A launch message that cannot be edited still deserves the result, so the
  // card goes out as a follow-up on the same interaction.
  const followUp = await fetchImpl(base, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(12000),
  });
  if (!followUp.ok)
    throw new GameError("Discord a refusé le message de résultat.", 502);
  return { posted: true };
}
