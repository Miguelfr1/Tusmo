const cache = new Map();

// Prefer illustration-focused rarities, with traditional TCG cards winning ties.
export function cardArtScore(card) {
  const rarity = (card.rarity || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  let score = 0;
  if (
    /illustration.*special|special.*illustration|alternative|alternate/.test(
      rarity,
    )
  )
    score = 100;
  else if (/illustration/.test(rarity)) score = 90;
  else if (/trois etoiles|three star|immersive|crown/.test(rarity)) score = 85;
  else if (/secret/.test(rarity)) score = 80;
  else if (
    /deux etoiles|two star|une etoile|one star|full art|ultra/.test(rarity)
  )
    score = 70;
  else if (/art rare|v.?max|v.?star|ex\b|gx\b/.test(rarity)) score = 60;
  else if (/rare/.test(rarity)) score = 30;
  else if (/peu commune|uncommon/.test(rarity)) score = -5;
  else if (/commune|common/.test(rarity)) score = -10;
  // Classic TCG cards get a small bonus over Pocket for visual quality
  return score + (card.image?.includes("/tcgp/") ? 0 : 5);
}

async function fetchPokemonCard(pokemon, signal) {
  const response = await fetch(
    `https://api.tcgdex.net/v2/fr/cards?name=${encodeURIComponent(pokemon.name)}`,
    { signal },
  );
  if (!response.ok) throw new Error("Catalogue indisponible");
  const list = await response.json();
  // High set numbers include secret and illustration rares. Bound API traffic.
  const sorted = list
    .filter((card) => card.image)
    .sort((a, b) => (Number(b.localId) || 0) - (Number(a.localId) || 0));
  const classic = sorted.filter((card) => !card.image.includes("/tcgp/"));
  const pocket = sorted.filter((card) => card.image.includes("/tcgp/"));
  const candidates = [...classic.slice(0, 6), ...pocket.slice(0, 2)];
  const details = await Promise.all(
    candidates.map(async (card) => {
      try {
        const result = await fetch(
          `https://api.tcgdex.net/v2/fr/cards/${encodeURIComponent(card.id)}`,
          { signal },
        );
        if (!result.ok) return null;
        const detail = await result.json();
        // Never show another species, even if its name matches the search string.
        return detail.dexId?.includes(pokemon.id) && detail.image
          ? detail
          : null;
      } catch {
        return null;
      }
    }),
  );
  if (signal?.aborted) throw signal.reason;
  const best = details
    .filter(Boolean)
    .sort((a, b) => cardArtScore(b) - cardArtScore(a))[0];
  if (!best) return null;
  return {
    id: best.id,
    pokemonId: pokemon.id,
    rarity: best.rarity || 'Carte Pokémon',
    name: best.name,
    artist: best.illustrator,
    image: `${best.image}/high.webp`,
    set: best.set?.name,
    source: best.image.includes("/tcgp/") ? "TCG Pocket" : "JCC Pokémon",
  };
}

export async function getPokemonCard(pokemon) {
  if (cache.has(pokemon.id)) return cache.get(pokemon.id);
  // Shared requests survive a dialog closing or React remounting it.
  const request = fetchPokemonCard(pokemon, AbortSignal.timeout(10000));
  cache.set(pokemon.id, request);
  try {
    const card = await request;
    if (!card) cache.delete(pokemon.id);
    return card;
  } catch (error) {
    cache.delete(pokemon.id);
    throw error;
  }
}
