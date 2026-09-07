import pokemon from "./pokemon.json";

// French species names: PokeAPI, retrieved 2026-09-07. National Pokédex 1-1025.
// Forms share a species entry. Gender symbols stay distinct as F / M.
export const normalizePokemon = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/♀/g, "F")
    .replace(/♂/g, "M")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
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
const mascots = [1, 155, 258, 387, 501, 653, 722, 813, 906];
export const POKEMON_GENERATIONS = boundaries.map((end, index) => {
  const entries = pokemon.filter(
    ({ id }) => id > (boundaries[index - 1] || 0) && id <= end,
  );
  return {
    id: index + 1,
    label: "Génération " + (index + 1),
    region: regions[index],
    mascot: mascots[index],
    total: entries.length,
    playableCount: entries.length,
    pokemonNames: entries.map((p) => p.name),
    playableNames: entries.map((p) => normalizePokemon(p.name)),
  };
});
export const POKEMON_GENERATION_IDS = POKEMON_GENERATIONS.map((g) => g.id);
export const getPokemonGenerationsByIds = (ids = []) =>
  POKEMON_GENERATIONS.filter((g) => ids.includes(g.id));
export const getPokemonWordPool = (ids = []) => [
  ...new Set(getPokemonGenerationsByIds(ids).flatMap((g) => g.playableNames)),
];
export const findPokemon = (word) =>
  pokemon.find((p) => normalizePokemon(p.name) === word);
export const getGeneration = (pokemonId) => {
  const idx = boundaries.findIndex((end) => pokemonId <= end);
  return idx >= 0 ? { id: idx + 1, region: regions[idx] } : null;
};
