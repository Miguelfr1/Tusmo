import { GameError, GAME_TTL } from "./game.js";

// Compare-and-set and leaderboard publication happen in one Redis transaction.
const COMMIT = `
local old = redis.call('GET', KEYS[1])
if (old or '') ~= ARGV[1] then return 0 end
local profile = redis.call('GET', KEYS[2])
if (profile or '') ~= ARGV[7] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
redis.call('SET', KEYS[2], ARGV[8])
if ARGV[4] ~= '' then
  for i = 3, #KEYS, 2 do
    redis.call('ZADD', KEYS[i], ARGV[5], ARGV[6])
    redis.call('HSET', KEYS[i+1], ARGV[6], ARGV[4])
    redis.call('EXPIRE', KEYS[i], ARGV[3])
    redis.call('EXPIRE', KEYS[i+1], ARGV[3])
  end
end
return 1`;
const LIMIT = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n`;
const gameKey = (day, id) => `tusmon:v1:game:${day}:${id}`;
const profileKey = (id) => `tusmon:v1:profile:${id}`;
const boardKey = (day, scope) => `tusmon:v1:board:${day}:${scope}`;
// Where the interaction that opened the activity is parked, so the result can
// be posted from that interaction instead of from a bot in the server. It is
// kept per channel: everyone playing the same instance shares one card.
const launchKey = (channelId) => `tusmon:v1:launch:${channelId}`;
// Everyone who finished the day's Pokémon in that channel, so the card can
// show them all rather than only whoever posted last.
const resultsKey = (day, channelId) =>
  `tusmon:v1:results:${day}:${channelId}`;

export function createRedisStore({ url, token }) {
  if (!url || !token || !url.startsWith("https://"))
    throw new GameError(
      "La sauvegarde Tus’Mon n’est pas encore configurée.",
      503,
    );
  const command = async (args) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      throw new GameError(
        "La sauvegarde est indisponible. Aucun essai supplémentaire ne sera consommé en réessayant.",
        503,
      );
    const data = await response.json();
    if (data.error)
      throw new GameError("La sauvegarde est momentanément indisponible.", 503);
    return data.result;
  };
  return {
    async read(day, id) {
      const [raw, profileRaw] = await command([
        "MGET",
        gameKey(day, id),
        profileKey(id),
      ]);
      return {
        raw: raw || "",
        round: raw ? JSON.parse(raw) : null,
        profileRaw: profileRaw || "",
        wallet: profileRaw ? JSON.parse(profileRaw) : null,
      };
    },
    async commit(day, id, saved, round, wallet, entry, guildId) {
      const scopes = ["global", ...(guildId ? [`guild:${guildId}`] : [])];
      const keys = [
        gameKey(day, id),
        profileKey(id),
        ...scopes.flatMap((scope) => [
          boardKey(day, scope),
          `${boardKey(day, scope)}:rows`,
        ]),
      ];
      return (
        (await command([
          "EVAL",
          COMMIT,
          keys.length,
          ...keys,
          saved.raw,
          JSON.stringify(round),
          GAME_TTL,
          entry ? JSON.stringify(entry) : "",
          entry?.score || 0,
          id,
          saved.profileRaw,
          JSON.stringify(wallet),
        ])) === 1
      );
    },
    async leaderboard(day, scope, userId) {
      const key = boardKey(day, scope);
      const ids = await command(["ZRANGE", key, 0, 99]);
      const rows = ids.length
        ? await command(["HMGET", `${key}:rows`, ...ids])
        : [];
      const own = await command(["HGET", `${key}:rows`, userId]);
      const me = own ? JSON.parse(own) : null;
      if (me)
        me.rank = 1 + (await command(["ZCOUNT", key, "-inf", `(${me.score}`]));
      return {
        rows: rows.filter(Boolean).map(JSON.parse),
        me,
        total: await command(["ZCARD", key]),
      };
    },
    async rememberLaunch(channelId, launch, seconds) {
      await command([
        "SET",
        launchKey(channelId),
        JSON.stringify(launch),
        "EX",
        seconds,
      ]);
    },
    async recallLaunch(channelId) {
      const raw = await command(["GET", launchKey(channelId)]);
      return raw ? JSON.parse(raw) : null;
    },
    async saveResult(day, channelId, id, player, seconds) {
      const key = resultsKey(day, channelId);
      await command(["HSET", key, id, JSON.stringify(player)]);
      await command(["EXPIRE", key, seconds]);
    },
    async results(day, channelId) {
      const flat = await command(["HGETALL", resultsKey(day, channelId)]);
      const players = [];
      for (let i = 1; i < flat.length; i += 2) players.push(JSON.parse(flat[i]));
      return players.sort((a, b) => a.at - b.at);
    },
    async limit(key, max, seconds = 60) {
      return (
        (await command([
          "EVAL",
          LIMIT,
          1,
          `tusmon:v1:limit:${key}`,
          seconds,
        ])) <= max
      );
    },
  };
}

// Only injected by the local development script and tests, never by production.
export function createMemoryStore() {
  const games = new Map(),
    profiles = new Map(),
    boards = new Map(),
    launches = new Map(),
    results = new Map(),
    limits = new Map();
  return {
    async read(day, id) {
      const raw = games.get(gameKey(day, id)) || "",
        profileRaw = profiles.get(id) || "";
      return {
        raw,
        round: raw ? JSON.parse(raw) : null,
        profileRaw,
        wallet: profileRaw ? JSON.parse(profileRaw) : null,
      };
    },
    async commit(day, id, saved, round, wallet, entry, guildId) {
      if (
        (games.get(gameKey(day, id)) || "") !== saved.raw ||
        (profiles.get(id) || "") !== saved.profileRaw
      )
        return false;
      games.set(gameKey(day, id), JSON.stringify(round));
      profiles.set(id, JSON.stringify(wallet));
      if (entry)
        for (const scope of [
          "global",
          ...(guildId ? [`guild:${guildId}`] : []),
        ]) {
          const key = boardKey(day, scope);
          if (!boards.has(key)) boards.set(key, new Map());
          boards.get(key).set(id, entry);
        }
      return true;
    },
    async leaderboard(day, scope, userId) {
      const rows = [...(boards.get(boardKey(day, scope))?.values() || [])].sort(
        (a, b) => a.score - b.score,
      );
      const me = rows.find((r) => r.userId === userId);
      return {
        rows: rows.slice(0, 100),
        total: rows.length,
        me: me
          ? { ...me, rank: rows.findIndex((r) => r.score === me.score) + 1 }
          : null,
      };
    },
    async rememberLaunch(channelId, launch, seconds) {
      launches.set(channelId, { launch, until: Date.now() + seconds * 1000 });
    },
    async recallLaunch(channelId) {
      const entry = launches.get(channelId);
      return entry && entry.until > Date.now() ? entry.launch : null;
    },
    async saveResult(day, channelId, id, player) {
      const key = `${day}:${channelId}`;
      if (!results.has(key)) results.set(key, new Map());
      results.get(key).set(id, player);
    },
    async results(day, channelId) {
      return [...(results.get(`${day}:${channelId}`)?.values() || [])].sort(
        (a, b) => a.at - b.at,
      );
    },
    async limit(key, max, seconds = 60) {
      const old = limits.get(key);
      const entry =
        old && old.until > Date.now()
          ? old
          : { count: 0, until: Date.now() + seconds * 1000 };
      entry.count++;
      limits.set(key, entry);
      return entry.count <= max;
    },
  };
}
