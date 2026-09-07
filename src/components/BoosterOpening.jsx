import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Gift, X } from "lucide-react";
import pokemon from "../data/pokemon.json";
import { cardTier, officialCard } from "../data/adventure.js";

// Distance de glissement, en pixels, pour arracher le sceau.
const TEAR_DISTANCE = 165;
// Les mascottes livrées avec le site : un sachet met toujours une vedette en
// couverture, et celle-ci doit s afficher sans aller la chercher sur le réseau.
const COVER_STARS = [1, 25, 155, 258, 387, 501, 653, 722, 813, 906];
// Au-delà, on ouvre même si le catalogue de cartes n a pas répondu.
const ENRICH_TIMEOUT = 6000;

const reducedMotion = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

function CardFace({ card }) {
  const [failed, setFailed] = useState(false);
  const entry = pokemon.find((p) => p.id === card.pokemonId);
  const src = failed && entry ? officialCard(entry).image : card.image;
  return failed && !entry ? (
    <span className="booster-face-empty">Illustration indisponible</span>
  ) : (
    <img
      src={src}
      alt={card.name}
      onError={() => !failed && setFailed(true)}
      draggable="false"
    />
  );
}

export default function BoosterOpening({ ids, awards, cost, coins, onAgain, onClose }) {
  const [phase, setPhase] = useState("sealing");
  const [tear, setTear] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [order, setOrder] = useState(null);
  const [expired, setExpired] = useState(false);
  const [tilt, setTilt] = useState({ x: 0.5, y: 0.5 });
  const dragRef = useRef(null);
  const dialogRef = useRef(null);
  const [calm] = useState(reducedMotion);
  // Une couverture stable pour un même sachet, différente d un sachet à l autre.
  const featured = useMemo(() => {
    const seed = ids.join("");
    let hash = 2166136261;
    for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return COVER_STARS[(hash >>> 0) % COVER_STARS.length];
  }, [ids]);

  const pending = useMemo(
    () => ids.map((id) => awards[id]).filter(Boolean),
    [ids, awards],
  );
  // Toutes les cartes sont-elles passées par le catalogue ? Sinon on patiente :
  // une illustration ne doit jamais se substituer à une autre à l écran.
  const enriched = pending.every((a) => a.card.source !== "Pokédex");
  const signature = pending.map((a) => a.card.image).join("|");

  useEffect(() => {
    const timer = setTimeout(() => setExpired(true), ENRICH_TIMEOUT);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  // Le pack ne devient déchirable qu une fois les trois visuels décodés.
  useEffect(() => {
    if (phase !== "sealing" || pending.length !== ids.length) return;
    if (!enriched && !expired) return;
    let alive = true;
    Promise.all(
      pending.map((a) => {
        const image = new Image();
        image.src = a.card.image;
        return image.decode().catch(() => {});
      }),
    ).then(() => {
      if (!alive) return;
      setOrder(
        [...pending]
          .sort((a, b) => cardTier(a.card).rank - cardTier(b.card).rank)
          .map((a) => a.card.id || a.card.image),
      );
      setPhase("ready");
    });
    return () => {
      alive = false;
    };
  }, [phase, enriched, expired, signature, pending, ids.length]);

  const cards = useMemo(() => {
    const list = pending.map((a) => ({ ...a, tier: cardTier(a.card) }));
    if (!order) return list;
    return [...list].sort(
      (a, b) =>
        order.indexOf(a.card.id || a.card.image) -
        order.indexOf(b.card.id || b.card.image),
    );
  }, [pending, order]);

  const best = cards.reduce(
    (top, c) => (c.tier.rank > (top?.tier.rank ?? -1) ? c : top),
    null,
  );

  const openPack = useCallback(() => {
    dragRef.current = null;
    setTear(1);
    setPhase("tearing");
    setTimeout(() => setPhase("revealing"), calm ? 240 : 1050);
  }, [calm]);

  const onPointerDown = (event) => {
    if (phase !== "ready") return;
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!dragRef.current) {
      // Hors glissement, le pointeur incline le sachet : le foil réagit.
      if (calm || event.pointerType === "touch") return;
      const box = event.currentTarget.getBoundingClientRect();
      setTilt({
        x: +((event.clientX - box.left) / box.width).toFixed(3),
        y: +((event.clientY - box.top) / box.height).toFixed(3),
      });
      return;
    }
    const across = Math.abs(event.clientX - dragRef.current.x);
    const upward = Math.max(0, dragRef.current.y - event.clientY);
    const progress = Math.min(1, (across + upward) / TEAR_DISTANCE);
    setTear(progress);
    if (progress >= 1) openPack();
  };
  const releaseTear = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setTear(0);
  };
  const resetTilt = () => setTilt({ x: 0.5, y: 0.5 });

  const revealNext = () => {
    if (phase !== "revealing" || revealed >= cards.length) return;
    setRevealed((count) => count + 1);
  };

  useEffect(() => {
    if (!cards.length || revealed < cards.length) return;
    const timer = setTimeout(() => setPhase("complete"), calm ? 200 : 800);
    return () => clearTimeout(timer);
  }, [revealed, cards.length, calm]);

  const opened = phase === "revealing" || phase === "complete";

  return (
    <dialog
      ref={dialogRef}
      className="booster-opening"
      aria-labelledby="booster-title"
      data-phase={phase}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="booster-void" aria-hidden="true">
        <span className="booster-beam" />
        {Array.from({ length: 14 }, (_, i) => (
          <span className="booster-mote" key={i} style={{ "--i": i }} />
        ))}
      </div>

      <button className="booster-close" onClick={onClose} aria-label="Fermer l’ouverture">
        <X size={20} />
      </button>

      <div className="booster-stage">
        {!opened && (
          <div className="booster-pack-zone">
            <div
              className="booster-pack"
              style={{ "--tear": tear, "--px": tilt.x, "--py": tilt.y }}
              data-ready={phase === "ready" || undefined}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={releaseTear}
              onPointerCancel={releaseTear}
              onPointerLeave={resetTilt}
            >
              <div className="booster-pack-tilt">
                <div className="booster-pack-tube">
                  <img
                    className="booster-pack-art"
                    src={`/images/pokemon/${featured}.png`}
                    alt=""
                    draggable="false"
                  />
                  <span className="booster-wordmark">Pokémon</span>
                  <span className="booster-pack-folds" aria-hidden="true" />
                  <span className="booster-pack-foil" aria-hidden="true" />
                  <span className="booster-pack-gloss" aria-hidden="true" />
                  <div className="booster-pack-band">
                    <span className="booster-pack-count">3 CARTES</span>
                  </div>
                </div>
                <span className="booster-crimp" data-edge="bottom" aria-hidden="true" />
                <span className="booster-crimp" data-edge="top" aria-hidden="true" />
              </div>
            </div>
            <span className="booster-shock" aria-hidden="true" />
          </div>
        )}

        {opened && (
          <div className="booster-fan" data-complete={phase === "complete" || undefined}>
            {cards.map((entry, index) => {
              const isOpen = index < revealed;
              const isNext = index === revealed && phase === "revealing";
              return (
                <button
                  key={entry.card.id || entry.card.image}
                  className="booster-card"
                  data-tier={entry.tier.id}
                  data-open={isOpen || undefined}
                  data-next={isNext || undefined}
                  style={{ "--index": index, "--count": cards.length }}
                  disabled={!isNext}
                  aria-label={
                    isOpen
                      ? `${entry.card.name}, ${entry.tier.label}`
                      : `Retourner la carte ${index + 1} sur ${cards.length}`
                  }
                  onClick={revealNext}
                >
                  <span className="booster-aura" aria-hidden="true" />
                  {isOpen && (
                    <span className="booster-burst" aria-hidden="true">
                      {Array.from({ length: 12 }, (_, i) => (
                        <i key={i} style={{ "--a": `${i * 30}deg` }} />
                      ))}
                    </span>
                  )}
                  <span className="booster-card-inner">
                    <span className="booster-card-back">
                      <span className="booster-back-art" aria-hidden="true" />
                      <em>
                        {isNext
                          ? "TOUCHER POUR RETOURNER"
                          : `${index + 1} / ${cards.length}`}
                      </em>
                    </span>
                    <span className="booster-card-front">
                      <CardFace card={entry.card} />
                      <span className="booster-holo" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="booster-card-caption" aria-hidden="true">
                    <strong>{entry.card.name}</strong>
                    <small>{entry.tier.short}</small>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="booster-script">
        {phase === "sealing" && (
          <>
            <span className="booster-kicker">SCELLAGE EN COURS</span>
            <h2 id="booster-title">Trois illustrations se choisissent.</h2>
            <p>Le pack s’ouvre dès que les visuels sont prêts.</p>
          </>
        )}
        {(phase === "ready" || phase === "tearing") && (
          <>
            <span className="booster-kicker">À TOI DE JOUER</span>
            <h2 id="booster-title">Arrache le sceau.</h2>
            <p>Glisse le pack sur le côté, ou utilise le bouton.</p>
            <button className="booster-action" onClick={openPack} disabled={phase === "tearing"}>
              <Gift size={17} /> Ouvrir le booster
            </button>
          </>
        )}
        {phase === "revealing" && (
          <>
            <span className="booster-kicker">
              {revealed} / {cards.length} RÉVÉLÉES
            </span>
            <h2 id="booster-title">Retourne les cartes.</h2>
            <p>
              {revealed
                ? `${cards[revealed - 1].card.name} · ${cards[revealed - 1].tier.label}`
                : "La plus belle attend toujours la fin."}
            </p>
          </>
        )}
        {phase === "complete" && (
          <>
            <span className="booster-kicker" data-tier={best?.tier.id}>
              {best?.tier.label.toUpperCase()}
            </span>
            <h2 id="booster-title">
              {best?.tier.rank >= 2 ? "Quelle trouvaille." : "Trois de plus."}
            </h2>
            <p>
              {cards.map((c) => c.card.name).join(", ")} rejoignent ton album.
            </p>
            <div className="booster-actions">
              <button className="booster-action" onClick={onClose}>
                <BookOpen size={17} /> Ranger dans l’album
              </button>
              {coins >= cost && (
                <button className="booster-action is-ghost" onClick={onAgain}>
                  Encore un booster · {cost} <ArrowRight size={16} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
