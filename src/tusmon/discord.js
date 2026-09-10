export const APPLICATION_ID = "1547555128783929396";
export const embedded = new URLSearchParams(window.location.search).has(
  "frame_id",
);
export const demo =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get("demo") === "1";
const prefix = embedded ? "/.proxy" : "";
let sdk;
let connection;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function requestApi(
  action,
  session,
  body,
  { blob = false, signal } = {},
) {
  const response = await fetch(`${prefix}/api/tusmon?action=${action}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(session ? { Authorization: `Bearer ${session}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: signal || AbortSignal.timeout(18000),
  });
  if (response.ok && blob) return response.blob();
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      "Le service Tus’Mon n’est pas joignable pour le moment.",
      response.status,
    );
  }
  if (!response.ok)
    throw new ApiError(data.error || "La requête a échoué.", response.status);
  return data;
}

export function connectDiscord({ reconnect = false } = {}) {
  if (reconnect) connection = null;
  if (!connection)
    connection = (async () => {
      if (demo) return requestApi("auth", null, { code: "local-demo" });
      if (!embedded)
        throw new Error("Ouvre Tus’Mon avec /tusmon dans Discord.");
      const { DiscordSDK } = await import("@discord/embedded-app-sdk");
      sdk ||= new DiscordSDK(APPLICATION_ID);
      let timer;
      try {
        await Promise.race([
          sdk.ready(),
          new Promise((_, reject) => {
            timer = setTimeout(
              () =>
                reject(
                  new Error(
                    "Discord met trop de temps à répondre. Ferme puis rouvre l’activité.",
                  ),
                ),
              15000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      const { code } = await sdk.commands.authorize({
        client_id: APPLICATION_ID,
        response_type: "code",
        state: crypto.randomUUID(),
        prompt: "none",
        scope: ["identify", "guilds"],
      });
      const result = await requestApi("auth", null, {
        code,
        guildId: sdk.guildId,
      });
      const authenticated = await sdk.commands.authenticate({
        access_token: result.access_token,
      });
      return {
        session: result.session,
        user: { ...result.user, avatar: authenticated.user?.avatar || null },
      };
    })().catch((error) => {
      connection = null;
      throw error;
    });
  return connection;
}

export function canShareMoment() {
  return Boolean(embedded && sdk?.channelId);
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Image illisible."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Hands the result card to the app, which posts it in the channel itself.
 * Nothing is sent from the player's account and no dialog is shown.
 */
export async function shareMoment(blob, session) {
  if (!canShareMoment()) throw new Error("Le partage Discord n’est pas prêt.");
  const response = await fetch(`${prefix}/api/tusmon-share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session,
      channelId: sdk.channelId,
      image: await toBase64(blob),
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("Le résultat n’a pas pu être publié.");
}

export function imageUrl(url) {
  if (!embedded) return url;
  const artwork =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";
  if (url.startsWith(artwork))
    return `${prefix}/pokemon-artwork/${url.slice(artwork.length)}`;
  if (url.startsWith("https://assets.tcgdex.net/"))
    return `${prefix}/card-artwork/${url.slice("https://assets.tcgdex.net/".length)}`;
  return "";
}

export function pokemonImage(id) {
  return `${prefix}/api/pokemon?id=${id}`;
}

export function cardImage(url) {
  return `${prefix}/api/card-image?url=${encodeURIComponent(url)}`;
}

export function resultText(round) {
  return `Tus’Mon · ${round.day}\n${round.status === "won" ? round.rows.length : "X"}/6\n${round.rows.map((row) => row.marks.map((mark) => ({ correct: "🟩", present: "🟨", absent: "⬛" })[mark]).join("")).join("\n")}\n/tusmon`;
}
