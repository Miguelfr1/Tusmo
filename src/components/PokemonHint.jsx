import { useState } from "react";
import {
  Eye,
  Flame,
  Loader2,
  MapPin,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { findPokemon, getGeneration } from "../data/pokemonByGeneration";

export default function PokemonHint({
  word,
  coins,
  costs,
  onPurchase,
  onReveal,
  initialStep = 0,
}) {
  const [step, setStep] = useState(initialStep);
  const [silhouetteStatus, setSilhouetteStatus] = useState("idle");
  const [retryToken, setRetryToken] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const pokemon = findPokemon(word);
  if (!pokemon) return null;

  const gen = getGeneration(pokemon.id);
  const types = pokemon.types || [];

  const unlock = (nextStep) => {
    if (!onPurchase(nextStep)) return;
    setStep(nextStep);
    if (nextStep < 3) onReveal(nextStep);
  };

  return (
    <section className="pokemon-hint" aria-label="Indices Pokémon">
      <button
        className="hint-toggle"
        aria-expanded={expanded}
        aria-controls="pokemon-hints-panel"
        onClick={() => setExpanded((value) => !value)}
      >
        <Eye size={17} />
        <span>
          Mes indices <small>{step}/3</small>
        </span>
        <ChevronDown size={16} />
      </button>
      <div id="pokemon-hints-panel" className="hint-panel" hidden={!expanded}>
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
                <Loader2
                  className="animate-spin"
                  size={22}
                  aria-hidden="true"
                />
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
          <button
            className="hint-button"
            onClick={() => unlock(step + 1)}
            disabled={coins < costs[step]}
          >
            <Eye size={16} />
            {
              [
                "Révéler les types",
                "Révéler la génération",
                "Révéler la silhouette",
              ][step]
            }
            <span>
              <i className="mini-coin" aria-hidden="true">
                P
              </i>{" "}
              {costs[step]} pièces
            </span>
          </button>
        )}
        {step < 3 && (
          <p className="hint-help" role="status">
            {coins < costs[step]
              ? `Il te manque ${costs[step] - coins} pièces. Gagne une partie sans indice pour en obtenir.`
              : `Solde : ${coins} pièces. Aucun essai retiré.`}
          </p>
        )}
      </div>
    </section>
  );
}
