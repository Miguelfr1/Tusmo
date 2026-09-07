import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  CircleHelp,
  Flame,
  Layers,
  Loader2,
  Play,
  Sparkles,
  Trophy,
  Users,
  X,
  BookOpen,
  Share2,
} from "lucide-react";
import { POKEMON_GENERATIONS, findPokemon } from "../data/pokemonByGeneration";
import { getPokemonCard } from "../data/pokemonCards";
import { CoinBadge, DailyReward } from "./PokeCoins";

const art = (id) => `/images/pokemon/${id}.png`;
const heroCard = "/images/cards/280.webp";

export function Brand({ onHome }) {
  return (
    <button className="brand" onClick={onHome} aria-label="Tusmo, accueil">
      <span className="brand-mark">t.</span>tusmo
    </button>
  );
}

function Rules({ close }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="rules-dialog"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <button
        className="icon-button close-dialog"
        autoFocus
        onClick={close}
        aria-label="Fermer les règles"
      >
        <X />
      </button>
      <span className="eyebrow">PETIT MÉMO</span>
      <h2>Un mot. Six essais.</h2>
      <p>
        La première lettre est offerte. Propose un mot de la bonne longueur avec
        le clavier, puis valide.
      </p>
      <div className="rule-example">
        <b className="correct">T</b>
        <b className="present">U</b>
        <b>S</b>
        <b>M</b>
        <b>O</b>
      </div>
      <p>
        <strong>Orange :</strong> bonne lettre, bonne place.
        <br />
        <strong>Jaune :</strong> bonne lettre, autre place.
        <br />
        <strong>Gris :</strong> lettre absente.
      </p>
      <p>
        En mode Pokémon, écris les noms français sans accents, espaces ni
        ponctuation. Pour Nidoran, utilise F ou M. Le clavier numérique permet
        de saisir Porygon2 et Type:0.
      </p>
      <button className="primary-button" onClick={close}>
        À moi de jouer <ArrowRight size={18} />
      </button>
    </dialog>
  );
}

export function Landing({
  onAdventure,
  onPokemon,
  onSolo,
  onInfinite,
  onVersus,
  loading,
  multiplayerLoading,
  wallet,
  dailyReward,
  dismissDailyReward,
}) {
  const [rules, setRules] = useState(false);
  return (
    <div className="experience">
      <header className="site-nav">
        <Brand />
        <nav>
          <span className="nav-active">Le terrain de jeu</span>
          <button onClick={onAdventure}>
            <BookOpen size={16} /> Mon aventure
          </button>
          <button onClick={() => setRules(true)}>
            <CircleHelp size={16} /> Comment jouer
          </button>
        </nav>
        <CoinBadge coins={wallet.coins} compact />
      </header>
      <main className="landing-main">
        <button className="adventure-entry" onClick={onAdventure}>
          <BookOpen size={28} />
          <span>
            <strong>Ton aventure Pokémon commence ici.</strong>
            <small>Album, Pokédex, défis quotidiens, quêtes et boutique.</small>
          </span>
          <ArrowRight size={22} />
        </button>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="tiny-star">✳</span> LE BON MOT. LE BON MOMENT.
            </div>
            <h1>
              À toi de
              <br />
              jouer <span>le mot.</span>
              <span className="title-dot">*</span>
            </h1>
            <p>
              Six essais, une première lettre et ce petit
              <br className="desktop-break" /> déclic qui fait toute la
              différence.
            </p>
            <button
              className="primary-button"
              onClick={onSolo}
              disabled={loading}
            >
              {loading ? "Préparation du dictionnaire…" : "Lancer une partie"}{" "}
              <ArrowUpRight size={20} />
            </button>
            <div className="hero-caption">
              <span className="mini-tiles">
                <b>T</b>
                <b>U</b>
                <b>S</b>
              </span>{" "}
              Gratuit. Sans inscription. Juste du jeu.
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Aperçu du mode Pokémon et carte Dracaufeu-ex"
          >
            <span className="art-orbit orbit-one" />
            <span className="art-orbit orbit-two" />
            <span className="art-label">
              <Sparkles size={14} /> UN NOUVEAU TERRAIN DE JEU
            </span>
            <span className="floating-word">
              <b>P</b>
              <b>I</b>
              <b>K</b>
              <b>A</b>
              <b>?</b>
            </span>
            <img className="hero-pokemon" src={art(25)} alt="Pikachu" />
            <div className="hero-card">
              <img
                src={heroCard}
                alt="Carte immersive Dracaufeu-ex, illustration de kantaro"
              />
              <span className="card-shine" />
            </div>
            <span className="art-spark spark-one">✳</span>
            <span className="art-spark spark-two">✧</span>
            <span className="art-sticker">
              <Trophy size={21} />
              <span>
                Un mot trouvé.
                <br />
                <strong>Une belle découverte.</strong>
              </span>
            </span>
            <span className="art-number">ÉDITION POKÉMON / 001</span>
          </div>
        </section>
        <section className="modes-section">
          <div className="section-heading">
            <h2>À chaque humeur, son mode.</h2>
            <span>
              CHOISIS TON PROCHAIN DÉFI <ArrowRight size={15} />
            </span>
          </div>
          <div className="mode-grid">
            <button className="mode-card pokemon-mode" onClick={onPokemon}>
              <span className="mode-top">
                <span className="mode-icon">
                  <Sparkles />
                </span>
                <span className="pill">NOUVELLE AVENTURE</span>
              </span>
              <h3>
                Le mode Pokémon<span>Attrape le bon nom.</span>
              </h3>
              <p>
                Tout le Pokédex. Tes générations préférées.
                <br />
                Et une carte à découvrir à chaque victoire.
              </p>
              <span className="mode-bottom">
                <span>1 025 Pokémon · 9 générations</span>
                <ArrowUpRight />
              </span>
              <img src={art(1)} alt="" />
            </button>
            <button
              className="mode-card"
              onClick={onInfinite}
              disabled={loading}
            >
              <span className="mode-top">
                <span className="mode-icon">
                  <Flame />
                </span>
              </span>
              <h3>
                La suite infinie<span>Ne perds pas le fil.</span>
              </h3>
              <p>
                Enchaîne les mots et fais grimper
                <br />
                ton score. Jusqu’où iras-tu ?
              </p>
              <span className="mode-bottom">
                <span>Solo · Sans limite</span>
                <ArrowUpRight />
              </span>
            </button>
            <button
              className="mode-card"
              onClick={onVersus}
              disabled={loading || multiplayerLoading}
            >
              <span className="mode-top">
                <span className="mode-icon">
                  <Users />
                </span>
              </span>
              <h3>
                Entre amis
                <span>
                  {multiplayerLoading
                    ? "Connexion en cours…"
                    : "Les mots vont vite."}
                </span>
              </h3>
              <p>
                Un salon, cinq mots, un gagnant.
                <br />
                Défie tes amis en temps réel.
              </p>
              <span className="mode-bottom">
                <span>2 à 5 joueurs · Beta</span>
                <ArrowUpRight />
              </span>
            </button>
          </div>
        </section>
        <section className="how-strip">
          <span className="eyebrow">LE PRINCIPE EST SIMPLE</span>
          <div>
            <b>01</b> Observe la première lettre.
          </div>
          <div>
            <b>02</b> Suis les couleurs.
          </div>
          <div>
            <b>03</b> Savoure le déclic. <Sparkles size={17} />
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <Brand />
        <span>Des lettres, des amis et un peu de chance.</span>
        <span>Fait pour le plaisir de jouer.</span>
      </footer>
      <DailyReward amount={dailyReward} onClose={dismissDailyReward} />
      {rules && <Rules close={() => setRules(false)} />}
    </div>
  );
}

export function PokemonSetup({
  selected,
  toggle,
  selectAll,
  count,
  launch,
  home,
  wallet,
}) {
  return (
    <div className="experience">
      <header className="site-nav">
        <Brand onHome={home} />
        <button className="text-button" onClick={home}>
          <ChevronLeft size={16} /> Tous les modes
        </button>
        <CoinBadge coins={wallet.coins} compact />
      </header>
      <main className="setup-main">
        <span className="eyebrow">
          <Sparkles size={15} /> LE MODE POKÉMON
        </span>
        <div className="setup-heading">
          <div>
            <h1>
              Ton Pokédex.
              <br />
              <em>Tes règles du jeu.</em>
            </h1>
            <p>De Kanto à Paldea, choisis les régions de ton aventure.</p>
          </div>
          <div className="selection-summary">
            <strong>{count.toLocaleString("fr-FR")}</strong>
            <span>Pokémon à deviner</span>
          </div>
        </div>
        <div className="selection-toolbar">
          <span>{selected.length} générations sélectionnées</span>
          <button className="text-button" onClick={selectAll}>
            <Layers size={16} /> Tout sélectionner
          </button>
        </div>
        <div className="generation-grid">
          {POKEMON_GENERATIONS.map((g) => (
            <button
              key={g.id}
              aria-pressed={selected.includes(g.id)}
              className={`generation-card ${selected.includes(g.id) ? "selected" : ""}`}
              onClick={() => toggle(g.id)}
            >
              <span className="generation-check">
                {selected.includes(g.id) && <Check size={14} />}
              </span>
              <span className="eyebrow">
                GÉNÉRATION {String(g.id).padStart(2, "0")}
              </span>
              <h2>{g.region}</h2>
              <span>{g.total} Pokémon</span>
              <img src={art(g.mascot)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
        <div className="launch-bar">
          <div>
            <strong>Le Pokédex national au complet.</strong>
            <p>
              1 025 espèces, sans limite de longueur. Formes régionales
              regroupées par espèce.
            </p>
            <small>
              Sans accents ni ponctuation · Nidoran F / M · Chiffres conservés
            </small>
            <div className="economy-note">
              <span className="coin-symbol">P</span>
              <span>
                <b>Gagne au moins 25 PokéCoins par victoire</b>
                Bonus de rapidité, sans indice et de série
                {wallet.streak > 0 && ` · Série actuelle : ${wallet.streak}`}
              </span>
            </div>
          </div>
          <button className="primary-button" onClick={launch}>
            C'est parti <Play size={17} />
          </button>
        </div>
      </main>
    </div>
  );
}

export function Victory({
  word,
  attempts,
  pokemon,
  hintUsed = false,
  reward,
  coins,
  next,
  home,
  collectedCard,
  shareText,
  nextLabel,
}) {
  const entry = pokemon ? findPokemon(word) : null;
  const [card, setCard] = useState(null);
  const [cardLoading, setCardLoading] = useState(!!entry);
  const [failed, setFailed] = useState(null);
  const [shareFeedback, setShareFeedback] = useState("");
  // La victoire enregistre d abord un repli « Pokédex » dans l album, remplacé
  // par la vraie carte quelques instants plus tard. Tant que ce repli est le
  // seul visuel disponible, on ne montre rien : sinon le Pokémon apparaît, puis
  // sa carte le remplace.
  const savedCard =
    collectedCard && collectedCard.source !== "Pokédex" ? collectedCard : null;
  const shownCard = card || savedCard;
  // Une seule image : la carte. L illustration officielle n arrive qu en
  // dernier recours, une fois la recherche terminée, pour éviter deux
  // apparitions successives sur une connexion lente.
  const illustration =
    shownCard && failed !== shownCard.image
      ? shownCard
      : entry && !cardLoading
        ? {
            name: entry.name,
            image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${entry.id}.png`,
            source: "Illustration officielle",
          }
        : null;
  useEffect(() => {
    if (!entry) return;
    let active = true;
    const timer = setTimeout(() => {
      if (active) setCardLoading(false);
    }, 12000);
    getPokemonCard(entry)
      .then(async (result) => {
        if (!active || !result) return;
        const preview = new Image();
        preview.src = result.image;
        await preview.decode();
        if (active) setCard(result);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCardLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [entry]);
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="victory-dialog"
      aria-labelledby="victory-title"
      onCancel={(e) => {
        e.preventDefault();
        home();
      }}
    >
      <div className="victory-layout">
        <div className="reward-stage">
          <span className="reward-orbit" />
          <span className="reward-spark">✳</span>
          <div
            key={illustration?.image || "trophy"}
            className={`reward-card ${!illustration?.artist ? "official-reward" : ""}`}
          >
            {illustration && failed !== illustration.image ? (
              <img
                src={illustration.image}
                onError={() => setFailed(illustration.image)}
                alt={`${illustration.name}, ${illustration.artist || "illustration officielle"}`}
              />
            ) : (
              <div className="reward-fallback">
                <Trophy size={70} />
                <strong>
                  Une victoire
                  <br />
                  qui brille.
                </strong>
              </div>
            )}
            <span className="card-shine" />
          </div>
          <span className="reward-caption" role="status">
            {cardLoading ? (
              <>
                <Loader2 size={12} className="reward-loader" /> Une carte se
                prépare…
              </>
            ) : (
              illustration?.source || "UNE BELLE VICTOIRE"
            )}
          </span>
        </div>
        <div className="victory-copy">
          <span className="eyebrow">
            <Trophy size={16} /> BIEN JOUÉ !
          </span>
          <h2 id="victory-title">
            Bravo,
            <br />
            <em>quel talent.</em>
          </h2>
          <p>
            Tu as trouvé <strong>{entry?.name || word}</strong>
            <br />
            en {attempts} essai{attempts > 1 ? "s" : ""}.
          </p>
          {pokemon && (
            <span className="hint-result">
              {hintUsed === 0
                ? "Sans indice"
                : `${hintUsed} ${hintUsed > 1 ? "indices utilisés" : "indice utilisé"}`}
            </span>
          )}
          {pokemon && reward && (
            <div className="coin-reward">
              <div className="coin-reward-head">
                <span className="coin-symbol">P</span>
                <div>
                  <small>RÉCOMPENSE</small>
                  <strong>+{reward.total} PokéCoins</strong>
                </div>
                <CoinBadge coins={coins} compact />
              </div>
              <div className="reward-breakdown">
                <span>
                  Victoire <b>+{reward.base}</b>
                </span>
                <span>
                  Précision <b>+{reward.speed}</b>
                </span>
                {reward.mastery > 0 && (
                  <span>
                    Sans indice <b>+{reward.mastery}</b>
                  </span>
                )}
                {reward.streak > 0 && (
                  <span>
                    Série <b>+{reward.streak}</b>
                  </span>
                )}
                {reward.hints < 0 && (
                  <span className="reward-cost">
                    Indices <b>{reward.hints}</b>
                  </span>
                )}
                {!!reward.special && (
                  <span>
                    Défi accompli <b>+{reward.special}</b>
                  </span>
                )}
              </div>
            </div>
          )}
          {illustration && (
            <div className="reward-details">
              <Sparkles size={20} />
              <div>
                <strong>{illustration.name}</strong>
                <span>
                  {illustration.set || "Le Pokémon que tu viens de trouver."}
                </span>
                <small>
                  {illustration.artist
                    ? `Illustration : ${illustration.artist} · TCGdex`
                    : "Illustration officielle · Pokémon"}
                </small>
              </div>
            </div>
          )}
          <button autoFocus className="primary-button" onClick={next}>
            {nextLabel || "Encore une partie"} <ArrowRight size={18} />
          </button>
          {pokemon && collectedCard && (
            <p className="share-result-feedback">
              Illustration enregistrée dans ton album.
            </p>
          )}
          {shareText && (
            <button
              className="share-result-button"
              onClick={async () => {
                try {
                  if (navigator.share)
                    await navigator.share({
                      title: "Mon résultat Tusmo",
                      text: shareText,
                    });
                  else {
                    await navigator.clipboard.writeText(shareText);
                    setShareFeedback(
                      "Résultat copié, sans révéler le Pokémon.",
                    );
                  }
                } catch (error) {
                  if (error.name !== "AbortError")
                    setShareFeedback(
                      "Le partage est indisponible dans ce navigateur.",
                    );
                }
              }}
            >
              <Share2 size={16} /> Partager sans spoiler
            </button>
          )}
          {shareFeedback && (
            <p role="status" className="share-result-feedback">
              {shareFeedback}
            </p>
          )}
          <button className="text-button" onClick={home}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function Defeat({ word, pokemon, score, next, home }) {
  const entry = pokemon ? findPokemon(word) : null;
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="rules-dialog defeat-dialog"
      aria-labelledby="defeat-title"
      onCancel={(e) => {
        e.preventDefault();
        home();
      }}
    >
      <span className="eyebrow">L'AVENTURE CONTINUE</span>
      <h2 id="defeat-title">À un mot près.</h2>
      <p>Il se cachait juste ici :</p>
      <strong className="answer-word">{entry?.name || word}</strong>
      {score !== undefined && (
        <p>
          Ta série :{" "}
          <strong>
            {score} mot{score > 1 ? "s" : ""}
          </strong>
        </p>
      )}
      <p>Chaque tentative compte. Le prochain sera peut-être le bon !</p>
      <button autoFocus className="primary-button" onClick={next}>
        On réessaie <ArrowRight size={18} />
      </button>
      <button className="text-button" onClick={home}>
        Retour à l'accueil
      </button>
    </dialog>
  );
}
