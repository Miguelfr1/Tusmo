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
const dictionary = new Set([
  ...readFileSync(
    new URL("../../public/mots/tous-v1.txt", import.meta.url),
    "utf8",
  ).split(/\s+/),
  ...pokemon.map((p) => normalize(p.name)),
]);
export const MAX_ATTEMPTS = 6;
export const GAME_TTL = 60 * 60 * 24 * 35;

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
  if (action.type === "guess") {
    if (typeof action.guess !== "string" || action.guess.length > 40)
      throw new GameError("Nom de Pokémon invalide.");
    const word = normalize(action.guess);
    const solution = normalize(target.name);
    if (word.length !== solution.length)
      throw new GameError(`Il faut ${solution.length} caractères.`);
    if (word[0] !== solution[0])
      throw new GameError("La première lettre est offerte : conserve-la.");
    if (!dictionary.has(word))
      throw new GameError("Ce mot n’est pas dans le dictionnaire français.");
    next.guesses.push(word);
    if (word === solution) next.status = "won";
    else if (next.guesses.length >= MAX_ATTEMPTS) next.status = "lost";
    if (next.status !== "playing") next.finishedAt = now.toISOString();
  } else throw new GameError("Action inconnue.");
  return next;
}

export function publicRound(round, target, now = new Date()) {
  const solution = normalize(target.name);
  return {
    day: round.day,
    status: round.status,
    revision: round.revision,
    firstLetter: solution[0],
    length: solution.length,
    rows: round.guesses.map((word) => ({
      word,
      marks: evaluateGuess(word, solution),
    })),
    solution:
      round.status === "playing"
        ? null
        : { id: target.id, name: target.name, types: target.types },
    resetAt: nextReset(now),
    serverTime: now.toISOString(),
  };
}

export function dailyWallet(saved) {
  return saved || {
    wins: 0,
    streak: 0,
    bestStreak: 0,
  };
}

export function settleWallet(wallet, before, after) {
  if (before === after) return { wallet, round: after };
  if (after.status === "won") {
    const streak = wallet.streak + 1;
    return {
      wallet: {
        ...wallet,
        streak,
        bestStreak: Math.max(wallet.bestStreak, streak),
        wins: wallet.wins + 1,
      },
      round: after,
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
    score: round.status === "won" ? round.guesses.length : 7,
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
