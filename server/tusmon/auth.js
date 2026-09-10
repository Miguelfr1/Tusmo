import {
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify,
} from "node:crypto";
import { GameError } from "./game.js";

export const APPLICATION_ID = "1547555128783929396";
// The Jouer button under a result, which opens the activity like the command.
export const PLAY_BUTTON = "tusmon:play";
const requireSecret = (secret) => {
  if (!secret || secret.length < 32)
    throw new GameError(
      "La connexion Tus’Mon n’est pas encore configurée.",
      503,
    );
};

export function signSession(user, secret, now = Date.now()) {
  requireSecret(secret);
  const body = Buffer.from(
    JSON.stringify({
      ...user,
      exp: Math.floor(now / 1000) + 3600,
      audience: "tusmon-v1",
    }),
  ).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

export function readSession(token, secret, now = Date.now()) {
  requireSecret(secret);
  if (typeof token !== "string" || token.length > 3000)
    throw new GameError("Reconnecte-toi à Discord pour continuer.", 401);
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra)
    throw new GameError("Session invalide.", 401);
  const expected = createHmac("sha256", secret).update(body).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    throw new GameError("Session invalide.", 401);
  let user;
  try {
    user = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    throw new GameError("Session invalide.", 401);
  }
  if (
    user.audience !== "tusmon-v1" ||
    !Number.isFinite(user.exp) ||
    user.exp <= now / 1000 ||
    !/^\d{17,22}$/.test(user.id)
  )
    throw new GameError(
      "Ta session a expiré. Reconnecte-toi, ta partie est sauvegardée.",
      401,
    );
  return user;
}

export async function exchangeDiscordCode({ code, guildId }, env) {
  if (!env.DISCORD_CLIENT_SECRET)
    throw new GameError(
      "La connexion Discord n’est pas encore configurée.",
      503,
    );
  if (typeof code !== "string" || !code || code.length > 200)
    throw new GameError("Code Discord invalide.");
  const applicationId = env.DISCORD_APPLICATION_ID || APPLICATION_ID;
  const tokenResponse = await fetch(
    "https://discord.com/api/v10/oauth2/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: applicationId,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!tokenResponse.ok)
    throw new GameError("Discord n’a pas validé la connexion. Réessaie.", 401);
  const token = await tokenResponse.json();
  const headers = { Authorization: `Bearer ${token.access_token}` };
  const meResponse = await fetch("https://discord.com/api/v10/oauth2/@me", {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!meResponse.ok)
    throw new GameError("Impossible de vérifier ton compte Discord.", 401);
  const me = await meResponse.json();
  if (me.application?.id !== applicationId || !me.user?.id)
    throw new GameError("Cette connexion ne correspond pas à Tus’Mon.", 401);
  let verifiedGuild = null;
  if (guildId && /^\d{17,22}$/.test(guildId)) {
    const guildsResponse = await fetch(
      "https://discord.com/api/v10/users/@me/guilds?limit=200",
      { headers, signal: AbortSignal.timeout(8000) },
    );
    if (!guildsResponse.ok)
      throw new GameError(
        "Impossible de vérifier ton serveur Discord. Réessaie.",
        503,
      );
    const guilds = await guildsResponse.json();
    if (guilds.some((guild) => guild.id === guildId)) verifiedGuild = guildId;
  }
  const user = {
    id: me.user.id,
    name: (me.user.global_name || me.user.username || "Dresseur").slice(0, 80),
    guildId: verifiedGuild,
  };
  return {
    access_token: token.access_token,
    session: signSession(user, env.TUSMON_SESSION_SECRET),
    user,
  };
}

export function validInteraction(
  body,
  signature,
  timestamp,
  publicKey,
  now = Date.now(),
) {
  if (
    !/^[a-f0-9]{128}$/i.test(signature || "") ||
    !/^[a-f0-9]{64}$/i.test(publicKey || "") ||
    !/^\d+$/.test(timestamp || "")
  )
    return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(publicKey, "hex"),
      ]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.concat([Buffer.from(timestamp), Buffer.from(body)]),
      key,
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}
