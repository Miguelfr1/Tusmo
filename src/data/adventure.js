export const PACK_COST = 120;
export const DAILY_CHALLENGE_REWARD = 75;
export const CHAMPION_REWARD = 150;
export const COSMETICS = [
  {
    id: "grid-classic",
    slot: "grid",
    name: "Terrain original",
    price: 0,
    color: "#ed713a",
  },
  {
    id: "grid-ocean",
    slot: "grid",
    name: "Lagon de Carapuce",
    price: 180,
    color: "#167caa",
  },
  {
    id: "grid-forest",
    slot: "grid",
    name: "Forêt de Bulbizarre",
    price: 180,
    color: "#287652",
  },
  {
    id: "background-classic",
    slot: "background",
    name: "Clairière",
    price: 0,
    color: "#f6f5ec",
  },
  {
    id: "background-night",
    slot: "background",
    name: "Nuit à Johto",
    price: 250,
    color: "#dce3f4",
  },
  {
    id: "background-sunset",
    slot: "background",
    name: "Crépuscule à Alola",
    price: 250,
    color: "#f8dfcd",
  },
  {
    id: "effect-classic",
    slot: "effect",
    name: "Éclat doré",
    price: 0,
    color: "#efbb42",
  },
  {
    id: "effect-stars",
    slot: "effect",
    name: "Pluie d’étoiles",
    price: 300,
    color: "#e5bd58",
  },
  {
    id: "coin-classic",
    slot: "coin",
    name: "Pièce dorée",
    price: 0,
    color: "#eaba3d",
  },
  {
    id: "coin-silver",
    slot: "coin",
    name: "Argent lunaire",
    price: 200,
    color: "#a5b6cd",
  },
];

export function createAdventure() {
  return {
    version: 1,
    discoveries: {},
    awards: {},
    results: {},
    claimedQuests: [],
    champions: [],
    owned: COSMETICS.filter((c) => !c.price).map((c) => c.id),
    equipped: {
      grid: "grid-classic",
      background: "background-classic",
      effect: "effect-classic",
      coin: "coin-classic",
    },
    daily: {},
    challenge: null,
    lastPack: [],
  };
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
export function seededIndex(seed, size) {
  let hash = 2166136261;
  for (const char of seed)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % size;
}
export function dailyPokemon(entries, day = dayKey()) {
  return entries[seededIndex(`tusmo-daily-v1:${day}`, entries.length)];
}
export function championTeam(entries, region) {
  return [...entries]
    .sort(
      (a, b) =>
        seededIndex(`${region}:${a.id}`, 2147483647) -
        seededIndex(`${region}:${b.id}`, 2147483647),
    )
    .slice(0, 5);
}
export function officialCard(pokemon) {
  return {
    id: `official-${pokemon.id}`,
    pokemonId: pokemon.id,
    name: pokemon.name,
    image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`,
    rarity: "Illustration officielle",
    source: "Pokédex",
    set: "Illustrations Pokémon",
  };
}
export function addAward(
  adventure,
  eventId,
  pokemon,
  card = officialCard(pokemon),
  origin = "Victoire",
  date = new Date().toISOString(),
) {
  if (adventure.awards[eventId]) return adventure;
  return {
    ...adventure,
    awards: {
      ...adventure.awards,
      [eventId]: { card, pokemonId: pokemon.id, obtainedAt: date, origin },
    },
  };
}
export function recordResult(adventure, id, result) {
  if (adventure.results[id]) return adventure;
  const results = { ...adventure.results, [id]: result };
  const discoveries = { ...adventure.discoveries };
  if (result.won)
    discoveries[result.pokemon.id] =
      discoveries[result.pokemon.id] || result.date;
  let next = { ...adventure, results, discoveries };
  if (result.won)
    next = addAward(
      next,
      id,
      result.pokemon,
      undefined,
      "Victoire",
      result.date,
    );
  return next;
}
export function getStats(adventure) {
  const results = Object.values(adventure.results);
  const wins = results.filter((r) => r.won);
  const byPokemon = {};
  for (const r of results) {
    const item = (byPokemon[r.pokemon.id] ||= {
      pokemon: r.pokemon,
      games: 0,
      attempts: 0,
      losses: 0,
    });
    item.games++;
    item.attempts += r.won ? r.attempts : 6;
    item.losses += r.won ? 0 : 1;
  }
  return {
    games: results.length,
    wins: wins.length,
    winRate: results.length
      ? Math.round((wins.length / results.length) * 100)
      : 0,
    average: wins.length
      ? wins.reduce((n, r) => n + r.attempts, 0) / wins.length
      : 0,
    distribution: Array.from(
      { length: 6 },
      (_, i) => wins.filter((r) => r.attempts === i + 1).length,
    ),
    hardest: Object.values(byPokemon)
      .sort((a, b) => b.attempts / b.games - a.attempts / a.games)
      .slice(0, 5),
  };
}
export function getQuests(adventure, bestStreak = 0) {
  const wins = Object.values(adventure.results).filter((r) => r.won);
  return [
    {
      id: "kanto-3",
      title: "Premier voyage",
      description: "Découvrir 3 Pokémon différents de Kanto",
      value: Object.keys(adventure.discoveries).filter((id) => +id <= 151)
        .length,
      target: 3,
      reward: 60,
    },
    {
      id: "no-hint",
      title: "Instinct de Dresseur",
      description: "Gagner sans indice, hors mode silhouette",
      value: wins.filter((r) => !r.hints && r.mode !== "silhouette").length,
      target: 1,
      reward: 40,
    },
    {
      id: "streak-5",
      title: "Sur ta lancée",
      description: "Atteindre une série de 5 victoires",
      value: bestStreak,
      target: 5,
      reward: 100,
    },
  ].map((q) => ({
    ...q,
    value: Math.min(q.value, q.target),
    claimed: adventure.claimedQuests.includes(q.id),
  }));
}
export function getBadges(adventure) {
  const wins = Object.values(adventure.results).filter((r) => r.won);
  const water = new Set(
    wins
      .filter((r) => r.pokemon.types.includes("Eau"))
      .map((r) => r.pokemon.id),
  ).size;
  const johto = Object.keys(adventure.discoveries).filter(
    (id) => +id > 151 && +id <= 251,
  ).length;
  return [
    {
      id: "water",
      name: "Expert Eau",
      description: "10 espèces de type Eau découvertes",
      value: water,
      target: 10,
    },
    {
      id: "johto",
      name: "Maître de Johto",
      description: "Les 100 Pokémon de Johto découverts",
      value: johto,
      target: 100,
    },
    {
      id: "first",
      name: "Coup de génie",
      description: "Une victoire au premier essai",
      value: wins.some((r) => r.attempts === 1) ? 1 : 0,
      target: 1,
    },
    {
      id: "explorer",
      name: "Grand explorateur",
      description: "100 espèces découvertes",
      value: Object.keys(adventure.discoveries).length,
      target: 100,
    },
  ].map((b) => ({ ...b, unlocked: b.value >= b.target }));
}
export function shareResult(target, guesses, hints, mode = "classique") {
  const rows = guesses.map((guess) => {
    const left = [...target];
    const marks = [...guess].map((letter, i) => {
      if (letter === target[i]) {
        left[i] = null;
        return "🟩";
      }
      return null;
    });
    return [...guess]
      .map((letter, i) => {
        if (marks[i]) return marks[i];
        const at = left.indexOf(letter);
        if (at < 0) return "⬛";
        left[at] = null;
        return "🟨";
      })
      .join("");
  });
  return `Tusmo Pokémon · ${mode}\n${guesses.at(-1) === target ? guesses.length : "X"}/6 · ${hints} indice(s)\n${rows.join("\n")}\n${guesses.at(-1) === target ? "Une illustration ajoutée à mon album !\n" : ""}https://tusmo-sigma.vercel.app`;
}
