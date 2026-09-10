import { createHash } from "node:crypto";
import {
  applyAction,
  challengeDay,
  dailyWallet,
  settleWallet,
  GameError,
  leaderboardEntry,
  newRound,
  publicRound,
  rankedRows,
  targetForDay,
} from "./game.js";
import { exchangeDiscordCode, readSession } from "./auth.js";
import { getPokemonCard } from "../../src/data/pokemonCards.js";

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function readBody(request, limit = 16384) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new GameError("Requête trop volumineuse.", 413);
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new GameError("Requête trop volumineuse.", 413);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createGameApi({
  store,
  env,
  clock = () => new Date(),
  authenticate = exchangeDiscordCode,
  cardProvider = getPokemonCard,
}) {
  return async (request) => {
    try {
      const url = new URL(request.url);
      const action = url.searchParams.get("action") || "state";
      const expectedMethod = ["auth", "play"].includes(action) ? "POST" : "GET";
      if (request.method !== expectedMethod)
        return json({ error: "Méthode non autorisée." }, 405);
      let body = {};
      if (request.method === "POST") {
        if (!request.headers.get("content-type")?.includes("application/json"))
          throw new GameError("Format de requête invalide.", 415);
        try {
          body = JSON.parse(await readBody(request));
        } catch (error) {
          if (error instanceof GameError) throw error;
          throw new GameError("JSON invalide.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new GameError("Requête invalide.");
      }
      if (action === "auth") {
        const ip =
          request.headers.get("x-vercel-forwarded-for") ||
          request.headers.get("x-forwarded-for") ||
          "local";
        const key = createHash("sha256").update(ip).digest("hex").slice(0, 24);
        if (!(await store.limit(`auth:${key}`, 20)))
          throw new GameError(
            "Trop de connexions. Réessaie dans une minute.",
            429,
          );
        return json(await authenticate(body, env));
      }
      const token = request.headers
        .get("authorization")
        ?.replace(/^Bearer /, "");
      const user = readSession(
        token,
        env.TUSMON_SESSION_SECRET,
        clock().getTime(),
      );
      if (!(await store.limit(`user:${user.id}`, 100)))
        throw new GameError("Ralentis un instant, puis réessaie.", 429);
      const now = clock();
      const day = challengeDay(now);
      const target = targetForDay(day, env.TUSMON_DAILY_SECRET);
      let saved = await store.read(day, user.id);
      let round = saved.round || newRound(day, user);
      let wallet = dailyWallet(saved.wallet, day);
      if (action === "play" || action === "state") {
        let committed = false;
        for (let attempt = 0; attempt < 4; attempt++) {
          const result =
            action === "play"
              ? settleWallet(
                  wallet,
                  round,
                  applyAction(round, body, target, now),
                  body,
                )
              : { wallet, round };
          committed = await store.commit(
            day,
            user.id,
            saved,
            result.round,
            result.wallet,
            leaderboardEntry(result.round),
            user.guildId,
          );
          if (committed) {
            round = result.round;
            wallet = result.wallet;
            break;
          }
          saved = await store.read(day, user.id);
          round = saved.round || newRound(day, user);
          wallet = dailyWallet(saved.wallet, day);
        }
        if (!committed)
          throw new GameError(
            "La partie est occupée dans une autre fenêtre. Actualise-la.",
            409,
          );
      } else if (action === "board") {
        const scope =
          url.searchParams.get("scope") === "guild"
            ? user.guildId
              ? `guild:${user.guildId}`
              : null
            : "global";
        if (!scope)
          throw new GameError(
            "Ouvre Tus’Mon depuis un serveur pour voir son classement.",
          );
        // The same finished result can be compared in another verified server, never replayed.
        if (round.status !== "playing")
          await store.commit(
            day,
            user.id,
            saved,
            round,
            wallet,
            leaderboardEntry(round),
            user.guildId,
          );
        const board = await store.leaderboard(day, scope, user.id);
        return json({
          day,
          rows: rankedRows(board.rows),
          me: board.me,
          total: board.total,
        });
      } else if (action === "card") {
        if (round.status !== "won")
          throw new GameError(
            "Trouve le Pokémon pour découvrir son illustration.",
            403,
          );
        let card = null;
        try {
          card = await cardProvider(target);
        } catch {
          /* Official artwork remains available. */
        }
        return json({ day, card });
      } else if (action !== "state")
        throw new GameError("Action inconnue.", 404);
      return json({
        round: publicRound(round, target, now),
        user: { id: user.id, name: user.name, guildId: user.guildId },
      });
    } catch (error) {
      return json(
        {
          error:
            error instanceof GameError
              ? error.message
              : "Le service est indisponible. Ta partie sauvegardée n’est pas perdue.",
        },
        error instanceof GameError ? error.status : 503,
      );
    }
  };
}
