import { useEffect, useRef, useState } from "react";
import { Coins, Gift, X, Flame } from "lucide-react";
import { DAILY_REWARD, HINT_COSTS } from "../data/pokeCoinEconomy";

function untilTomorrow() {
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const minutes = Math.ceil((midnight - now) / 60000);
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

export default function WalletDialog({ coins, close }) {
  const ref = useRef(null);
  const [countdown, setCountdown] = useState(untilTomorrow);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const timer = setInterval(() => setCountdown(untilTomorrow()), 60000);
    return () => {
      clearInterval(timer);
      dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="wallet-dialog"
      aria-labelledby="wallet-title"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <button
        autoFocus
        className="wallet-close"
        onClick={close}
        aria-label="Fermer le portefeuille"
      >
        <X size={20} />
      </button>
      <div className="wallet-hero">
        <span className="coin-symbol" aria-hidden="true">
          P
        </span>
        <span className="eyebrow">TON PETIT TRÉSOR</span>
        <h2 id="wallet-title">Mes PokéCoins</h2>
        <strong className="wallet-total">
          {coins.toLocaleString("fr-FR")}
        </strong>
        <p>De quoi débloquer le prochain déclic.</p>
      </div>
      <div className="wallet-body">
        <div className="wallet-daily">
          <Gift size={22} />
          <div>
            <strong>+{DAILY_REWARD} chaque jour</strong>
            <span>Prochain bonus dans {countdown}, à ton retour.</span>
          </div>
        </div>
        <h3>
          <Coins size={17} /> Comment en gagner
        </h3>
        <dl className="wallet-rates">
          <div>
            <dt>Victoire Pokémon</dt>
            <dd>+25</dd>
          </div>
          <div>
            <dt>Précision · de 6 à 1 essai</dt>
            <dd>+4 à +24</dd>
          </div>
          <div>
            <dt>Victoire sans indice</dt>
            <dd>+15</dd>
          </div>
          <div>
            <dt>Série · dès la 2e victoire</dt>
            <dd>+2 par palier, max. +20</dd>
          </div>
          <div><dt>Défi quotidien remporté</dt><dd>+75 bonus</dd></div>
          <div><dt>Première victoire sur un champion</dt><dd>+150 bonus</dd></div>
          <div><dt>Quêtes du carnet</dt><dd>+40 à +100</dd></div>
        </dl>
        <h3>
          <Flame size={17} /> Un coup de pouce
        </h3>
        <div className="wallet-prices">
          {["Les types", "La génération", "La silhouette"].map(
            (label, index) => (
              <div key={label}>
                <span>{label}</span>
                <strong>
                  {HINT_COSTS[index]} <small>pièces</small>
                </strong>
              </div>
            ),
          )}
        </div>
        <p className="wallet-note">
          Les indices s'achètent dans cet ordre, sans retirer d'essai. Une
          défaite ou un abandon termine la série. Les pièces restent sur ce
          navigateur, sans achat en argent réel.
          {' '}Le mode silhouette ne donne pas le bonus sans indice. Tu peux aussi dépenser tes pièces dans le carnet : booster de 3 illustrations à 120 pièces, cosmétiques de 180 à 300 pièces. Les défis quotidien et champion peuvent être mis en pause.
        </p>
      </div>
    </dialog>
  );
}
