import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import WalletDialog from "./WalletDialog";

export function CoinBadge({ coins, compact = false }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={`coin-badge ${compact ? "is-compact" : ""}`}
        aria-label={`Ouvrir le portefeuille : ${coins} PokéCoins`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className="coin-symbol">P</span>
        <strong>{coins.toLocaleString("fr-FR")}</strong>
        <span className="coin-label">PokéCoins</span>
      </button>
      {open && <WalletDialog coins={coins} close={() => setOpen(false)} />}
    </>
  );
}

export function DailyReward({ amount, onClose }) {
  // Une félicitation n a pas à rester en travers de l écran : elle se retire
  // seule, et le bouton sert à qui veut aller plus vite.
  useEffect(() => {
    if (!amount) return;
    const timer = setTimeout(onClose, 7000);
    return () => clearTimeout(timer);
  }, [amount, onClose]);
  if (!amount) return null;
  return (
    <aside className="daily-reward" role="status">
      <span className="daily-gift">
        <Gift size={20} />
      </span>
      <div>
        <small>BONUS DU JOUR</small>
        <strong>+{amount} PokéCoins</strong>
        <span>Merci d'être revenu jouer !</span>
      </div>
      <button onClick={onClose} aria-label="Fermer">
        <X size={16} />
      </button>
    </aside>
  );
}
