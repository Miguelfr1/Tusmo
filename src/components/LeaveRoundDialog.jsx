import { useEffect, useRef } from "react";
import { Flame } from "lucide-react";

export default function LeaveRoundDialog({ streak, cancel, confirm }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="rules-dialog leave-dialog"
      aria-labelledby="leave-title"
      onCancel={cancel}
    >
      <span className="eyebrow">
        <Flame size={18} /> TA SÉRIE EST EN COURS
      </span>
      <h2 id="leave-title">Tu quittes déjà ?</h2>
      <p>
        Tu as enchaîné{" "}
        <strong>
          {streak} victoire{streak > 1 ? "s" : ""}
        </strong>
        . Quitter cette partie termine ta série. Ton solde de PokéCoins reste
        conservé.
      </p>
      <button autoFocus className="primary-button" onClick={cancel}>
        Continuer la partie
      </button>
      <button className="text-button" onClick={confirm}>
        Quitter et terminer ma série
      </button>
    </dialog>
  );
}
