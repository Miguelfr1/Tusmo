import { useEffect, useState } from "react";
import {
  Coins,
  Sparkles,
  Trophy,
  Share2,
  ArrowRight,
  Clock,
  ChevronDown,
} from "lucide-react";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "./tusmon.css";
import useDailyGame from "./useDailyGame.js";
import TusmonBoard from "./TusmonBoard.jsx";
import TusmonLeaderboard from "./TusmonLeaderboard.jsx";
import { demo, embedded, imageUrl, requestApi, resultText } from "./discord.js";

const artwork = (id) =>
  imageUrl(
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
  );
const prices = [8, 12, 20];
const hints = [
  "Révéler les types",
  "Révéler la région",
  "Révéler la silhouette",
];

function Silhouette({ connection }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let objectUrl;
    const controller = new AbortController();
    requestApi("silhouette", connection.session, null, {
      blob: true,
      signal: controller.signal,
    })
      .then((blob) => {
        if (!controller.signal.aborted) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
          setError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [connection, retry]);
  return (
    <div className="tm-silhouette">
      {url ? (
        <img src={url} alt="Silhouette du Pokémon à trouver" />
      ) : error ? (
        <button onClick={() => setRetry((n) => n + 1)}>
          Recharger la silhouette, gratuitement
        </button>
      ) : (
        <span role="status">La silhouette arrive…</span>
      )}
    </div>
  );
}

function Result({ round, connection }) {
  const [card, setCard] = useState(null);
  const [failed, setFailed] = useState(false);
  const [share, setShare] = useState("");
  const [showText, setShowText] = useState(false);
  useEffect(() => {
    if (round.status !== "won") return;
    const controller = new AbortController();
    requestApi("card", connection.session, null, { signal: controller.signal })
      .then((result) => {
        if (
          result.day === round.day &&
          result.card?.pokemonId === round.solution.id
        )
          setCard(result.card);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [connection, round.day, round.solution.id, round.status]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resultText(round));
      setShare("Résultat copié !");
    } catch {
      setShowText(true);
      setShare("Sélectionne et copie ton résultat ci-dessous.");
    }
  };
  const cardImage = card && !failed && imageUrl(card.image);
  return (
    <section
      className={`tm-result ${round.status}`}
      aria-label="Résultat du jour"
    >
      <span className="tm-overline">
        {round.status === "won" ? "POKÉMON DÉCOUVERT" : "RENDEZ-VOUS DEMAIN"}
      </span>
      <h2>{round.status === "won" ? "Bravo, Dresseur !" : "Bien tenté !"}</h2>
      <p>
        C’était <strong>{round.solution.name}</strong>.{" "}
        {round.status === "won"
          ? `${round.rows.length} essai(s), bien joué.`
          : "Un nouveau Pokémon t’attend demain."}
      </p>
      {round.reward && (
        <div className="tm-reward">
          <Coins size={22} /> +{round.reward.total} PokéCoins{" "}
          <small>dont 75 de bonus quotidien</small>
        </div>
      )}
      <div className={`tm-art ${cardImage ? "is-card" : ""}`}>
        <img
          src={cardImage || artwork(round.solution.id)}
          alt={cardImage ? `Carte ${card.name}` : round.solution.name}
          onError={cardImage ? () => setFailed(true) : undefined}
        />
      </div>
      {cardImage && (
        <small>
          {card.source} · {card.set}
          {card.artist ? ` · ${card.artist}` : ""}
        </small>
      )}
      <button className="tm-primary" onClick={copy}>
        <Share2 size={17} /> Partager sans spoiler
      </button>
      <p role="status">{share}</p>
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
  const [walletOpen, setWalletOpen] = useState(false);
  const round = game.data?.round;
  const blocked = game.busy || game.retryable || game.expiredSession;
  return (
    <main
      className={`tusmon ${round?.status === "playing" && tab === "play" ? "with-keyboard" : ""}`}
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
        {game.data && (
          <button
            className="tm-wallet"
            onClick={() => setWalletOpen(!walletOpen)}
            aria-expanded={walletOpen}
          >
            <Coins size={19} />
            {game.data.wallet.coins}
            <span className="tm-sr"> PokéCoins, détails</span>
          </button>
        )}
      </header>
      {walletOpen && (
        <aside className="tm-wallet-detail">
          <strong>Ton portefeuille Discord</strong>
          <p>
            100 pièces de bienvenue, +30 à la première connexion du jour. Une
            victoire rapporte au moins 104 pièces, avec des bonus de précision,
            sans indice et de série de victoires.
          </p>
          <p>
            Indices : types 8 · région 12 · silhouette 20. Ce portefeuille est
            distinct de celui du site.
          </p>
        </aside>
      )}
      {!round ? (
        <section className="tm-welcome">
          <div className="tm-overline">9 GÉNÉRATIONS · 1 025 POKÉMON</div>
          <h1>
            Un Pokémon.
            <br />
            <em>Toute la communauté.</em>
          </h1>
          <p>
            Le Tusmo que tu connais, un rendez-vous chaque jour.
            <br />
            Six essais. La première lettre offerte. À toi de jouer.
          </p>
          <div className="tm-mascots" aria-hidden="true">
            {[1, 25, 906].map((id) => (
              <img key={id} src={`/images/pokemon/${id}.png`} alt="" />
            ))}
          </div>
          <div className="tm-welcome-rules">
            <span>
              <Sparkles /> Les 9 générations, sans filtre
            </span>
            <span>
              <Trophy /> Un classement sans spoiler
            </span>
            <span>
              <Clock /> Une partie par jour et par compte
            </span>
          </div>
          {embedded || demo ? (
            <button
              className="tm-primary"
              disabled={game.busy}
              onClick={game.connect}
            >
              {game.busy ? "Connexion à Discord…" : "Jouer au Pokémon du jour"}
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
              <span className="tm-overline">
                9 GÉNÉRATIONS · MÊME POKÉMON POUR TOUS
              </span>
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
              {round.status === "playing" ? (
                <details className="tm-hints">
                  <summary>
                    <Sparkles size={17} /> Un petit coup de pouce ?
                    <span>{round.hints}/3</span>
                    <ChevronDown size={16} />
                  </summary>
                  <p>Chaque indice est débloqué pour toute ta partie.</p>
                  {round.types && (
                    <p className="tm-hint-value">
                      Types : {round.types.join(" · ")}
                    </p>
                  )}
                  {round.region && (
                    <p className="tm-hint-value">Région : {round.region}</p>
                  )}
                  {round.silhouette && (
                    <Silhouette connection={game.connection} />
                  )}{" "}
                  {round.hints < 3 && (
                    <button
                      className="tm-hint-buy"
                      disabled={
                        blocked || game.data.wallet.coins < prices[round.hints]
                      }
                      onClick={() => game.send("hint")}
                    >
                      {hints[round.hints]}{" "}
                      <span>
                        <Coins size={16} />
                        {prices[round.hints]}
                      </span>
                    </button>
                  )}
                </details>
              ) : (
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
              Reconnecter Discord
            </button>
          )}
        </div>
      )}
      <footer className="tm-footer">
        Tus’Mon · Un petit défi, une grande communauté.
        <span>
          Projet de fans non affilié à Nintendo, Game Freak ou The Pokémon
          Company.
        </span>
      </footer>
    </main>
  );
}
