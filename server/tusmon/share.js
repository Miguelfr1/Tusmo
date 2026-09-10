import { challengeDay, GameError } from "./game.js";
import { readSession, APPLICATION_ID, PLAY_BUTTON } from "./auth.js";

const DISCORD = "https://discord.com/api/v10";
// A generous ceiling for the 560x300 result card, small enough that a forged
// request cannot make the function haul megabytes around.
const MAX_IMAGE_BYTES = 900000;

function resultPayload(round) {
  const score = round?.status === "won" ? `${round.attempts}/6` : "X/6";
  return {
    attachments: [{ id: 0, filename: "tusmon.png" }],
    embeds: [
      {
        color: 0x21644c,
        title: `Tus’Mon n°${round?.number || ""} · ${score}`.trim(),
        image: { url: "attachment://tusmon.png" },
      },
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

/**
 * Posts the result card the way Wordle does: by editing the message the
 * /tusmon command left in the channel. The app answers through its own
 * interaction, so nothing here needs a bot sitting in the server.
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
  if (!store) throw new GameError("Le partage n’est pas disponible.", 503);

  const launch = await store.recallLaunch(user.id);
  if (!launch?.token)
    throw new GameError(
      "Relance /tusmon pour que ton résultat soit publié.",
      409,
    );
  // One result per player per day, held server side so a reopened activity
  // never posts twice and a replayed request cannot spam the channel.
  if (
    !(await store.limit(
      `share:${challengeDay(new Date())}:${user.id}`,
      1,
      7200,
    ))
  )
    throw new GameError("Ton résultat a déjà été publié.", 429);

  const applicationId = env.DISCORD_APPLICATION_ID || APPLICATION_ID;
  const form = new FormData();
  form.append("payload_json", JSON.stringify(resultPayload(body.round)));
  form.append(
    "files[0]",
    new Blob([image], { type: "image/png" }),
    "tusmon.png",
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
