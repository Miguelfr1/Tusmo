import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const pokemon = JSON.parse(
  readFileSync(new URL("../../src/data/pokemon.json", import.meta.url), "utf8"),
);
export const normalize = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/♀/g, "F")
    .replace(/♂/g, "M")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
const dictionary = new Set(pokemon.map((p) => normalize(p.name)));
const boundaries = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
const regions = [
  "Kanto",
  "Johto",
  "Hoenn",
  "Sinnoh",
  "Unys",
  "Kalos",
  "Alola",
  "Galar & Hisui",
  "Paldea",
];
export const MAX_ATTEMPTS = 6;
export const GAME_TTL = 60 * 60 * 24 * 35;
export const HINT_PRICES = [8, 12, 20];

export class GameError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function challengeDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (key) => parts.find((p) => p.type === key).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function nextReset(date = new Date()) {
  const day = challengeDay(date);
  let low = date.getTime(),
    high = low + 27 * 60 * 60 * 1000;
  while (high - low > 500) {
    const middle = Math.floor((low + high) / 2);
    if (challengeDay(new Date(middle)) === day) low = middle;
    else high = middle;
  }
  return new Date(Math.ceil(high / 1000) * 1000).toISOString();
}

export function targetForDay(day, secret) {
  if (!secret || secret.length < 32)
    throw new GameError("Le défi quotidien n’est pas encore configuré.", 503);
  const number = createHmac("sha256", secret)
    .update(`tusmon-v1:${day}`)
    .digest()
    .readUInt32BE(0);
  return pokemon[number % pokemon.length];
}

export function evaluateGuess(guess, target) {
  const remaining = [...target];
  const marks = [...guess].map((letter, i) => {
    if (letter === target[i]) {
      remaining[i] = null;
      return "correct";
    }
    return "absent";
  });
  [...guess].forEach((letter, i) => {
    if (marks[i] === "correct") return;
    const index = remaining.indexOf(letter);
    if (index !== -1) {
      marks[i] = "present";
      remaining[index] = null;
    }
  });
  return marks;
}

export function newRound(day, user) {
  return {
    day,
    userId: user.id,
    name: user.name,
    guesses: [],
    hints: 0,
    status: "playing",
    revision: 0,
    requests: [],
  };
}

export function applyAction(round, action, target, now = new Date()) {
  if (
    !action ||
    typeof action.requestId !== "string" ||
    !/^[\w-]{8,80}$/.test(action.requestId)
  )
    throw new GameError("Identifiant de requête invalide.");
  if (round.requests.includes(action.requestId)) return round;
  if (action.day !== round.day || action.day !== challengeDay(now))
    throw new GameError(
      "Un nouveau défi est disponible. Actualise la partie.",
      409,
    );
  if (round.status !== "playing")
    throw new GameError("Ta partie du jour est déjà terminée.", 409);
  if (action.revision !== round.revision)
    throw new GameError(
      "Ta partie a avancé dans une autre fenêtre. Actualise-la.",
      409,
    );
  const next = {
    ...round,
    guesses: [...round.guesses],
    revision: round.revision + 1,
    requests: [...round.requests, action.requestId],
  };
  if (action.type === "hint") {
    if (round.hints >= 3)
      throw new GameError("Tous les indices sont déjà révélés.");
    next.hints++;
  } else if (action.type === "guess") {
    if (typeof action.guess !== "string" || action.guess.length > 40)
      throw new GameError("Nom de Pokémon invalide.");
    const word = normalize(action.guess);
    const solution = normalize(target.name);
    if (word.length !== solution.length)
      throw new GameError(`Il faut ${solution.length} caractères.`);
    if (word[0] !== solution[0])
      throw new GameError("La première lettre est offerte : conserve-la.");
    if (!dictionary.has(word))
      throw new GameError("Ce nom n’est pas dans le Pokédex français.");
    next.guesses.push(word);
    if (word === solution) next.status = "won";
    else if (next.guesses.length >= MAX_ATTEMPTS) next.status = "lost";
    if (next.status !== "playing") next.finishedAt = now.toISOString();
  } else throw new GameError("Action inconnue.");
  return next;
}

export function publicRound(round, target, now = new Date()) {
  const solution = normalize(target.name);
  const generation = boundaries.findIndex((end) => target.id <= end);
  return {
    day: round.day,
    status: round.status,
    revision: round.revision,
    firstLetter: solution[0],
    length: solution.length,
    hints: round.hints,
    rows: round.guesses.map((word) => ({
      word,
      marks: evaluateGuess(word, solution),
    })),
    types: round.hints >= 1 ? target.types : null,
    region: round.hints >= 2 ? regions[generation] : null,
    silhouette: round.hints >= 3,
    reward: round.reward || null,
    solution:
      round.status === "playing"
        ? null
        : { id: target.id, name: target.name, types: target.types },
    resetAt: nextReset(now),
    serverTime: now.toISOString(),
  };
}

export function dailyWallet(saved, day) {
  const wallet = saved || {
    coins: 100,
    wins: 0,
    streak: 0,
    bestStreak: 0,
    lastDaily: null,
  };
  return wallet.lastDaily === day
    ? wallet
    : { ...wallet, coins: wallet.coins + 30, lastDaily: day };
}

export function settleWallet(wallet, before, after, action) {
  if (before === after) return { wallet, round: after };
  if (action.type === "hint") {
    const cost = HINT_PRICES[before.hints];
    if (wallet.coins < cost)
      throw new GameError("Tu n’as pas assez de PokéCoins pour cet indice.");
    return { wallet: { ...wallet, coins: wallet.coins - cost }, round: after };
  }
  if (after.status === "won") {
    const streak = wallet.streak + 1;
    const reward = {
      base: 25,
      precision: (7 - after.guesses.length) * 4,
      mastery: after.hints === 0 ? 15 : 0,
      streak: Math.min(20, (streak - 1) * 2),
      daily: 75,
    };
    reward.total = Object.values(reward).reduce((a, b) => a + b, 0);
    return {
      wallet: {
        ...wallet,
        coins: wallet.coins + reward.total,
        streak,
        bestStreak: Math.max(wallet.bestStreak, streak),
        wins: wallet.wins + 1,
      },
      round: { ...after, reward },
    };
  }
  return {
    wallet: after.status === "lost" ? { ...wallet, streak: 0 } : wallet,
    round: after,
  };
}

export function leaderboardEntry(round) {
  if (round.status === "playing") return null;
  return {
    userId: round.userId,
    name: round.name,
    status: round.status,
    attempts: round.guesses.length,
    hints: round.hints,
    score:
      (round.status === "won" ? round.guesses.length : 7) * 10 + round.hints,
  };
}

export function rankedRows(entries) {
  const rows = [...entries].sort(
    (a, b) => a.score - b.score || a.name.localeCompare(b.name, "fr"),
  );
  return rows.map((row) => ({
    ...row,
    rank: rows.findIndex((item) => item.score === row.score) + 1,
  }));
}
