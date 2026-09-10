import { useEffect, useState } from "react";
import {
  Share2,
  ArrowRight,
  Clock,
} from "lucide-react";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "./tusmon.css";
import useDailyGame from "./useDailyGame.js";
import TusmonBoard from "./TusmonBoard.jsx";
import TusmonLeaderboard from "./TusmonLeaderboard.jsx";
import {
  cardImage,
  demo,
  embedded,
  requestApi,
  resultText,
} from "./discord.js";
const todayLabel = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

function Result({ round, connection }) {
  const [card, setCard] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [share, setShare] = useState("");
  const [showText, setShowText] = useState(false);
  useEffect(() => {
    if (round.status !== "won") return;
    const controller = new AbortController();
    requestApi("card", connection.session, null, { signal: controller.signal })
      .then((result) => {
        setCard(
          result.day === round.day && result.card?.id ? result.card : false,
        );
      })
      .catch(() => setCard(false));
    return () => controller.abort();
  }, [connection.session, round.day, round.status]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resultText(round));
      setShare("Résultat copié !");
    } catch {
      setShowText(true);
      setShare("Sélectionne et copie ton résultat ci-dessous.");
    }
  };
  return (
    <section
      className={`tm-result ${round.status}`}
      aria-label="Résultat du jour"
    >
      <h2>{round.status === "won" ? "Trouvé !" : "Raté"}</h2>
      <p>
        <strong>{round.solution.name}</strong> · {round.status === "won" ? round.rows.length : "X"}/6
      </p>
      <div
        className={`tm-art ${card && !imageFailed ? "is-card" : card === null ? "is-loading" : "is-empty"}`}
      >
        {card && !imageFailed && (
          <img
            src={cardImage(card.image)}
            alt={`Carte ${round.solution.name}`}
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <button className="tm-primary" onClick={copy}>
        <Share2 size={17} /> Partager
      </button>
      {share && <p role="status">{share}</p>}
      {showText && (
        <textarea
          aria-label="Résultat à copier"
          readOnly
          value={resultText(round)}
          onFocus={(e) => e.target.select()}
        />
      )}
    </section>
  );
}

function Countdown({ round, refresh, busy }) {
  const [offset] = useState(() => Date.now() - Date.parse(round.serverTime));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(round.resetAt) - now + offset) / 1000),
  );
  const formatted = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  return (
    <div className="tm-countdown">
      <Clock size={15} />
      {seconds ? (
        <span>
          Prochain Pokémon dans <strong>{formatted}</strong> · minuit à Paris
        </span>
      ) : (
        <button disabled={busy} onClick={refresh}>
          Découvrir le nouveau défi
        </button>
      )}
    </div>
  );
}

export default function TusmonApp() {
  const [tab, setTab] = useState("play");
  const game = useDailyGame({ keyboardEnabled: tab === "play" });
  const round = game.data?.round;
  const blocked = game.busy || game.retryable || game.expiredSession;
  return (
    <main
      className={`tusmon ${round ? "is-game" : ""} ${round && round.status !== "playing" ? "is-finished" : ""} ${round?.status === "playing" && tab === "play" ? "with-keyboard" : ""}`}
    >
      <header className="tm-header">
        <a
          className="tm-logo"
          href={embedded ? undefined : "/"}
          aria-label="Tus’Mon"
        >
          <span className="tm-ball" />
          Tus’<em>Mon</em>
        </a>
        <span className="tm-daily-badge">LE DÉFI QUOTIDIEN</span>
      </header>
      {!round ? (
        <section className="tm-welcome">
          <h1 className="tm-hero-logo">
            <span className="tm-ball" />
            Tus’<em>Mon</em>
          </h1>
          <p>Devine chaque jour un Pokémon et grimpe dans le classement.</p>
          <div className="tm-mascots" aria-hidden="true">
            <img
              className="tm-welcome-card"
              src="/images/cards/280.webp"
              alt=""
            />
            <img
              className="tm-welcome-sprite"
              src="/images/pokemon/25.png"
              alt=""
            />
          </div>
          {embedded || demo ? (
            <button
              className="tm-primary"
              disabled={game.busy}
              onClick={game.connect}
            >
              Jouer
              <ArrowRight size={19} />
            </button>
          ) : (
            <div className="tm-open-discord">
              Ouvre Discord et lance <code>/tusmon</code>
              <small>
                Le mode infini reste disponible sur{" "}
                <a href="/">le site classique</a>.
              </small>
            </div>
          )}
          <p className="tm-byline">
            <span>{todayLabel}</span>
            <span>Fait par miggs - v1</span>
          </p>
          {demo && (
            <p className="tm-demo">
              Démo locale uniquement : progression temporaire, aucun compte
              Discord utilisé.
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="tm-title">
            <div>
              <h1>
                Le Pokémon du jour<span>#{round.day.replaceAll("-", "")}</span>
              </h1>
            </div>
            <p>
              Salut {game.connection.user.name}{" "}
              <span>À toi de faire parler les lettres.</span>
            </p>
          </div>
          <nav className="tm-mobile-tabs" aria-label="Vue de l’activité">
            <button
              aria-pressed={tab === "play"}
              onClick={() => setTab("play")}
            >
              Jouer
            </button>
            <button
              aria-pressed={tab === "board"}
              onClick={() => setTab("board")}
            >
              Classement
            </button>
          </nav>
          <div className={`tm-layout view-${tab}`}>
            <section className="tm-play">
              <div className="tm-game-meta">
                <strong>
                  {round.status === "playing"
                    ? `Essai ${round.rows.length + 1} sur 6`
                    : "Partie du jour terminée"}
                </strong>
                <span>{round.length} lettres · noms français</span>
              </div>
              <TusmonBoard
                round={round}
                draft={game.draft}
                cursor={game.cursor}
                onKey={game.onKey}
                disabled={blocked}
              />
              {round.status !== "playing" && (
                <Result
                  key={round.day}
                  round={round}
                  connection={game.connection}
                />
              )}
              <Countdown
                key={`${round.day}:${round.revision}`}
                round={round}
                refresh={game.refresh}
                busy={game.busy}
              />
            </section>
            <div className="tm-board-panel">
              <TusmonLeaderboard
                connection={game.connection}
                day={round.day}
                revision={round.revision}
              />
            </div>
          </div>
        </>
      )}
      {game.error && (
        <div className="tm-error tm-feedback" role="alert">
          {game.error}
          {game.retryable && (
            <button disabled={game.busy} onClick={() => game.send()}>
              Réessayer sans doubler l’essai
            </button>
          )}
          {game.expiredSession && (
            <button disabled={game.busy} onClick={game.connect}>
              Jouer
            </button>
          )}
        </div>
      )}
    </main>
  );
}
