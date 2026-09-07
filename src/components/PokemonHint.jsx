import { useState } from "react";
import { Eye, Flame, Loader2, MapPin, RefreshCw } from "lucide-react";
import { findPokemon, getGeneration } from "../data/pokemonByGeneration";

export default function PokemonHint({ word, onReveal }) {
  const [step, setStep] = useState(0); // 0 = rien, 1 = types, 2 = gen, 3 = silhouette
  const [silhouetteStatus, setSilhouetteStatus] = useState("idle");
  const [retryToken, setRetryToken] = useState(0);
  const pokemon = findPokemon(word);
  if (!pokemon) return null;

  const gen = getGeneration(pokemon.id);
  const types = pokemon.types || [];

  const unlock = (nextStep) => {
    setStep(nextStep);
    if (nextStep < 3) onReveal(nextStep);
  };

  return (
    <section className="pokemon-hint" aria-label="Indices Pokémon">
      {/* Revealed hints */}
      <div className="hint-stack">
        {step >= 1 && (
          <div className="hint-chip">
            <Flame size={14} /> {types.join(" · ") || "???"}
          </div>
        )}
        {step >= 2 && (
          <div className="hint-chip">
            <MapPin size={14} /> Gen {gen?.id} · {gen?.region}
          </div>
        )}
      </div>

      {/* Silhouette panel */}
      {step >= 3 && (
        <div className="hint-reveal">
          <div className="hint-visual">
            {silhouetteStatus !== "error" && (
              <img
                className={
                  silhouetteStatus === "ready"
                    ? "hint-silhouette is-ready"
                    : "hint-silhouette"
                }
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png?retry=${retryToken}`}
                alt="Silhouette du Pokémon à deviner"
                onLoad={() => {
                  setSilhouetteStatus("ready");
                  onReveal(3);
                }}
                onError={() => setSilhouetteStatus("error")}
              />
            )}
            {silhouetteStatus === "idle" && (
              <Loader2 className="animate-spin" size={22} aria-hidden="true" />
            )}
            {silhouetteStatus === "error" && (
              <button
                className="text-button"
                onClick={() => {
                  setRetryToken((token) => token + 1);
                  setSilhouetteStatus("idle");
                }}
              >
                <RefreshCw size={16} /> Réessayer
              </button>
            )}
          </div>
          <div aria-live="polite">
            <strong>
              {silhouetteStatus === "ready"
                ? "Quel est ce Pokémon ?"
                : silhouetteStatus === "error"
                  ? "Silhouette indisponible"
                  : "Un Pokémon approche…"}
            </strong>
            <p>
              {silhouetteStatus === "ready"
                ? "Sa forme te dit quelque chose ?"
                : silhouetteStatus === "error"
                  ? "Vérifie ta connexion."
                  : "Préparation de ton indice."}
            </p>
          </div>
        </div>
      )}

      {/* Next hint button */}
      {step < 3 && (
        <button className="hint-button" onClick={() => unlock(step + 1)}>
          <Eye size={16} />
          {step === 0
            ? "Un petit indice ?"
            : step === 1
              ? "Encore un indice ?"
              : "Voir la silhouette"}
          <span>Indice {step + 1}/3 · Aucun essai retiré</span>
        </button>
      )}
    </section>
  );
}
