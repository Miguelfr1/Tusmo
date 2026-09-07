import { createElement, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Crown,
  Eye,
  Gift,
  Medal,
  Search,
  ShoppingBag,
  Sparkles,
  Trophy,
  TrendingUp,
} from "lucide-react";
import pokemon from "../data/pokemon.json";
import {
  POKEMON_GENERATIONS,
  getGeneration,
} from "../data/pokemonByGeneration";
import {
  COSMETICS,
  PACK_COST,
  dayKey,
  getQuests,
  getBadges,
  getStats,
  officialCard,
} from "../data/adventure.js";
import { Brand } from "./Experience";
import { CoinBadge } from "./PokeCoins";

const tabs = [
  ["play", "Les défis", Trophy],
  ["album", "Album", BookOpen],
  ["pokedex", "Pokédex", Search],
  ["quests", "Quêtes & badges", Medal],
  ["shop", "Boutique", ShoppingBag],
  ["stats", "Statistiques", TrendingUp],
];

function Artwork({ entry, hidden = false, ...props }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="art-unavailable">
      {hidden ? "?" : "Illustration indisponible"}
    </span>
  ) : (
    <img
      {...props}
      src={officialCard(entry).image}
      alt={hidden ? "Pokémon non découvert" : entry.name}
      loading="lazy"
      className={hidden ? "undiscovered" : ""}
      onError={() => setFailed(true)}
    />
  );
}

function CardImage({ card }) {
  const [failed, setFailed] = useState(false);
  const entry = pokemon.find((p) => p.id === card.pokemonId);
  return failed ? (
    entry ? (
      <Artwork entry={entry} />
    ) : (
      <span>Illustration indisponible</span>
    )
  ) : (
    <img
      src={card.image}
      alt={card.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function Album({ adventure, onPlay }) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [order, setOrder] = useState("recent");
  const grouped = new Map();
  Object.values(adventure.awards).forEach((award) => {
    const id = award.card.id || award.card.image;
    const old = grouped.get(id);
    grouped.set(id, {
      ...award,
      count: (old?.count || 0) + 1,
      obtainedAt:
        old && old.obtainedAt > award.obtainedAt
          ? old.obtainedAt
          : award.obtainedAt,
    });
  });
  const cards = [...grouped.values()]
    .filter(
      (a) =>
        a.card.name
          .toLocaleLowerCase("fr")
          .includes(search.toLocaleLowerCase("fr")) &&
        (source === "all" || a.card.source === source),
    )
    .sort((a, b) =>
      order === "name"
        ? a.card.name.localeCompare(b.card.name, "fr")
        : b.obtainedAt.localeCompare(a.obtainedAt),
    );
  return (
    <section aria-labelledby="album-title">
      <div className="adventure-section-title">
        <div>
          <h2 id="album-title">Ton album, tes trouvailles.</h2>
          <p>
            {grouped.size} illustration{grouped.size > 1 ? 's différentes' : ' différente'} ·{" "}
            {Object.keys(adventure.awards).length} exemplaire{Object.keys(adventure.awards).length > 1 ? 's' : ''}
          </p>
        </div>
        <BookOpen size={32} />
      </div>
      <div className="adventure-filters">
        <label>
          <Search size={18} />
          <input
            aria-label="Rechercher dans l’album"
            placeholder="Chercher un Pokémon"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Origine des cartes"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="all">Toutes les illustrations</option>
          <option>JCC Pokémon</option>
          <option>TCG Pocket</option>
          <option>Pokédex</option>
        </select>
        <select
          aria-label="Trier l’album"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="recent">Plus récentes</option>
          <option value="name">Nom du Pokémon</option>
        </select>
      </div>
      {!cards.length ? (
        <div className="adventure-empty">
          <BookOpen size={44} />
          <h3>
            {grouped.size ? "Aucun résultat" : "La première page t’attend."}
          </h3>
          <p>
            {grouped.size
              ? "Essaie un autre nom ou filtre."
              : "Trouve un Pokémon pour recevoir son illustration. Les doublons sont conservés et comptés."}
          </p>
          {!grouped.size && (
            <button className="primary-button" onClick={onPlay}>
              Trouver mon premier Pokémon <ArrowRight size={18} />
            </button>
          )}
        </div>
      ) : (
        <div className="album-grid">
          {cards.map((a) => (
            <article className="album-item" key={a.card.id || a.card.image}>
              <div className="album-art">
                <CardImage card={a.card} />
                <span className="duplicate-count">×{a.count}</span>
              </div>
              <h3>{a.card.name}</h3>
              <p>{a.card.rarity}</p>
              <small>
                {a.card.source} · {a.card.set}
              </small>
              <small>
                {new Date(a.obtainedAt).toLocaleDateString("fr-FR")} ·{" "}
                {a.origin}
              </small>
              {a.card.artist && <small>Illustration : {a.card.artist}</small>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Pokedex({ adventure }) {
  const [generation, setGeneration] = useState(1);
  const [search, setSearch] = useState("");
  const [onlyFound, setOnlyFound] = useState(false);
  const entries = pokemon.filter((p) => getGeneration(p.id).id === generation);
  const found = entries.filter((p) => adventure.discoveries[p.id]).length;
  const filtered = entries.filter(
    (p) =>
      (!onlyFound || adventure.discoveries[p.id]) &&
      (String(p.id).includes(search) ||
        (adventure.discoveries[p.id] &&
          p.name
            .toLocaleLowerCase("fr")
            .includes(search.toLocaleLowerCase("fr")))),
  );
  return (
    <section>
      <div className="adventure-section-title">
        <div>
          <h2>Chaque découverte compte.</h2>
          <p>
            {Object.keys(adventure.discoveries).length} / 1 025 Pokémon trouvés.
            Les boosters ne débloquent pas le Pokédex.
          </p>
        </div>
      </div>
      <div className="region-tabs" aria-label="Régions">
        {POKEMON_GENERATIONS.map((g) => (
          <button
            key={g.id}
            aria-pressed={generation === g.id}
            onClick={() => setGeneration(g.id)}
          >
            {g.region}
            <small>
              {Math.round(
                (pokemon.filter(
                  (p) =>
                    getGeneration(p.id).id === g.id &&
                    adventure.discoveries[p.id],
                ).length /
                  g.total) *
                  100,
              )}{" "}
              %
            </small>
          </button>
        ))}
      </div>
      <div className="dex-progress">
        <span>
          {found} / {entries.length} découverts dans cette région
        </span>
        <progress aria-label="Progression de la région" value={found} max={entries.length} />
      </div>
      <div className="adventure-filters">
        <label>
          <Search size={18} />
          <input
            aria-label="Rechercher dans le Pokédex"
            placeholder="Numéro ou nom déjà découvert"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={onlyFound}
            onChange={(e) => setOnlyFound(e.target.checked)}
          />{" "}
          Découverts uniquement
        </label>
      </div>
      <div className="dex-grid">
        {filtered.map((p) => (
          <article
            key={p.id}
            className={adventure.discoveries[p.id] ? "dex-found" : ""}
          >
            <span>#{String(p.id).padStart(4, "0")}</span>
            <Artwork entry={p} hidden={!adventure.discoveries[p.id]} />
            <h3>{adventure.discoveries[p.id] ? p.name : "???"}</h3>
            {adventure.discoveries[p.id] && (
              <small>{p.types.join(" / ")}</small>
            )}
          </article>
        ))}
      </div>
      {!filtered.length && (
        <p className="adventure-empty">
          Aucun Pokémon ne correspond à ce filtre.
        </p>
      )}
    </section>
  );
}

function Quests({ wallet, claimQuest, notify }) {
  const quests = getQuests(wallet.adventure, wallet.bestStreak);
  return (
    <section>
      <h2>Un petit objectif. Une belle récompense.</h2>
      <p className="adventure-muted">
        Des quêtes uniques pour accompagner ton voyage. Réclame tes pièces une
        fois l’objectif atteint.
      </p>
      <div className="quest-list">
        {quests.map((q) => (
          <article key={q.id}>
            <div>
              <h3>{q.title}</h3>
              <p>{q.description}</p>
              <progress aria-label={q.title} value={q.value} max={q.target} />
              <small>
                {q.value} / {q.target}
              </small>
            </div>
            <button
              className="secondary-button"
              disabled={q.claimed || q.value < q.target}
              onClick={() => {
                if (claimQuest(q.id)) notify(`+${q.reward} PokéCoins !`);
              }}
            >
              {q.claimed ? (
                <>
                  <Check size={16} /> Réclamée
                </>
              ) : (
                `Réclamer ${q.reward} pièces`
              )}
            </button>
          </article>
        ))}
      </div>
      <h2 className="badge-heading">Tes insignes de Dresseur</h2>
      <div className="badge-grid">
        {getBadges(wallet.adventure).map((b) => (
          <article key={b.id} className={b.unlocked ? "badge-earned" : ""}>
            <Medal size={40} />
            <h3>{b.name}</h3>
            <p>{b.description}</p>
            <small>
              {b.unlocked
                ? "Débloqué"
                : `${Math.min(b.value, b.target)} / ${b.target}`}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}

function Challenges({ adventure, onStart, onClassic }) {
  const [region, setRegion] = useState(1);
  const [today, setToday] = useState(dayKey);
  useEffect(() => {
    const refresh = () => setToday(dayKey());
    const timer = setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  const daily = adventure.daily[today];
  const challenge = adventure.challenge;
  return (
    <section>
      <div className="challenge-feature">
        <div>
          <CalendarDays size={28} />
          <h2>Le rendez-vous du jour.</h2>
          <p>
            Un Pokémon commun à tous. Six essais pour le trouver. Une victoire,
            et 75 pièces bonus.
          </p>
          <small>
            Nouveau défi à 00:00 UTC · {today} · progression sauvegardée
          </small>
          <button
            className="primary-button"
            disabled={daily?.status === "won" || daily?.status === "lost"}
            onClick={() => onStart("daily")}
          >
            {daily?.status === "won"
              ? "Défi remporté !"
              : daily?.status === "lost"
                ? "À demain pour un nouveau défi"
                : daily
                  ? "Reprendre le défi"
                  : "Jouer le défi quotidien"}
            <ArrowRight size={18} />
          </button>
        </div>
        <img src="/images/pokemon/25.png" alt="Pikachu" />
      </div>
      <div className="challenge-pair">
        <article>
          <Eye size={28} />
          <h2>Qui se cache ici ?</h2>
          <p>
            La silhouette dès le départ. Une lettre supplémentaire après chaque
            erreur. Pas d’indice à acheter dans ce mode.
          </p>
          <button
            className="secondary-button"
            onClick={() => onStart("silhouette")}
          >
            Jouer en mode silhouette <ArrowRight size={17} />
          </button>
        </article>
        <article>
          <Crown size={28} />
          <h2>La route du champion.</h2>
          <p>
            Cinq Pokémon d’une région, cinq victoires à la suite. Au premier
            sans-faute : 150 pièces et l’insigne exclusif de la région.
          </p>
          <label className="champion-select">
            Région
          <select
            value={region}
            disabled={challenge?.status === 'playing' || (challenge?.status === 'won' && challenge.index < 4)}
              onChange={(e) => setRegion(Number(e.target.value))}
            >
              {POKEMON_GENERATIONS.map((g) => (
                <option value={g.id} key={g.id}>
                  {g.region}
                  {adventure.champions.includes(g.id) ? " · Champion" : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button"
            onClick={() => onStart("champion", region)}
          >
            {challenge?.status === "playing" ||
            (challenge?.status === "won" && challenge.index < 4)
              ? "Reprendre le parcours en cours"
              : "Affronter le champion"}{" "}
            <ArrowRight size={17} />
          </button>
          {challenge && (
            <small>
              Parcours actuel :{" "}
              {
                POKEMON_GENERATIONS.find((g) => g.id === challenge.region)
                  ?.region
              }{" "}
              ·{" "}
              {challenge.status === "won"
                ? challenge.index + 1
                : challenge.index}{" "}
              / 5 victoires
            </small>
          )}
        </article>
      </div>
      {!!adventure.champions.length && (
        <div className="champion-insignia">
          {adventure.champions.map((id) => (
            <span key={id}>
              <Crown size={22} /> Champion de{" "}
              {POKEMON_GENERATIONS.find((g) => g.id === id)?.region}
            </span>
          ))}
        </div>
      )}
      <button className="adventure-text-button" onClick={onClassic}>
        Envie de liberté ? Jouer une partie Pokémon classique{" "}
        <ArrowRight size={18} />
      </button>
    </section>
  );
}

function Shop({ wallet, buyCosmetic, openPack, notify }) {
  const [pack, setPack] = useState(null);
  const [revealed, setRevealed] = useState(0);
  const [confirmPack, setConfirmPack] = useState(false);
  const purchasePack = () => {
    const pool = [...pokemon];
    const picks = Array.from(
      { length: 3 },
      () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0],
    );
    const ids = openPack(picks);
    if (!ids) {
      notify("Pas assez de PokéCoins.");
      return;
    }
    setPack(ids);
    setRevealed(0);
    setConfirmPack(false);
    notify("Booster ajouté à ton album. Tes cartes sont sauvegardées.");
  };
  const visiblePack = pack || wallet.adventure.lastPack;
  return (
    <section>
      <div className="booster-banner">
        <div className="booster-foil" aria-hidden="true">
          <Sparkles />
          <b>TUSMO</b>
          <span>
            TRÉSORS
            <br />
            POKÉMON
          </span>
          <small>3 ILLUSTRATIONS</small>
        </div>
        <div>
          <h2>Une surprise à déballer.</h2>
          <p>
            Trois espèces tirées au hasard parmi les 1 025, à chances égales.
            Une illustration pour chacune, ajoutée à ton album. Les doublons
            sont possibles entre boosters.
          </p>
          <small>
            JCC, Pocket ou illustration officielle selon disponibilité. Aucun
            argent réel, aucun avantage en jeu.
          </small>
          {confirmPack ? (
            <div className="pack-confirm">
              <p>
                Dépenser {PACK_COST} pièces ? Solde après achat :{" "}
                {wallet.coins - PACK_COST}.
              </p>
              <button className="primary-button" onClick={purchasePack}>
                Confirmer l’achat
              </button>
              <button
                className="secondary-button"
                onClick={() => setConfirmPack(false)}
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              className="primary-button"
              disabled={wallet.coins < PACK_COST}
              onClick={() => setConfirmPack(true)}
            >
              <Gift size={18} /> Un booster · {PACK_COST} pièces
            </button>
          )}
        </div>
      </div>
      {!!visiblePack?.length && (
        <div className="pack-opening" aria-live="polite">
          <h3>{pack ? "Ton booster est prêt." : "Ton dernier booster"}</h3>
          <div className="pack-cards">
            {visiblePack.map((id, i) => {
              const award = wallet.adventure.awards[id];
              if (!award) return null;
              return (
                <button
                  key={id}
                  className={
                    !pack || i < revealed
                      ? "pack-card is-revealed"
                      : "pack-card"
                  }
                  disabled={!pack || i < revealed}
                  aria-label={
                    !pack || i < revealed
                      ? award.card.name
                      : `Révéler la carte ${i + 1}`
                  }
                  onClick={() => setRevealed(i + 1)}
                >
                  {!pack || i < revealed ? (
                    <>
                      <CardImage card={award.card} />
                      <strong>{award.card.name}</strong>
                      <small>{award.card.rarity}</small>
                    </>
                  ) : (
                    <>
                      <Sparkles size={38} />
                      <strong>Toucher pour révéler</strong>
                      <span>{i + 1} / 3</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="adventure-section-title">
        <div>
          <h2>À ton image.</h2>
          <p>
            Des cosmétiques uniquement. Acheter équipe directement ton choix.
          </p>
        </div>
      </div>
      <div className="cosmetic-list">
        {["grid", "background", "effect", "coin"].map((slot) => (
          <section key={slot}>
            <h3>
              {
                {
                  grid: "Couleurs de grille",
                  background: "Ambiances",
                  effect: "Effets de victoire",
                  coin: "Style des pièces",
                }[slot]
              }
            </h3>
            <div>
              {COSMETICS.filter((c) => c.slot === slot).map((c) => {
                const owned = wallet.adventure.owned.includes(c.id);
                const equipped = wallet.adventure.equipped[slot] === c.id;
                return (
                  <article key={c.id}>
                    <span
                      className={`cosmetic-swatch preview-${slot}`}
                      style={{ "--swatch": c.color }}
                    >
                      {slot === "coin" ? (
                        "P"
                      ) : slot === "effect" ? (
                        <Sparkles />
                      ) : slot === "grid" ? (
                        "A"
                      ) : (
                        <span />
                      )}
                    </span>
                    <div>
                      <h4>{c.name}</h4>
                      <small>
                        {owned ? "Dans ton inventaire" : `${c.price} PokéCoins`}
                      </small>
                    </div>
                    <button
                      className="secondary-button"
                      disabled={equipped || (!owned && wallet.coins < c.price)}
                      onClick={() => {
                        if (buyCosmetic(c.id)) notify(`${c.name} équipé !`);
                      }}
                    >
                      {equipped ? (
                        <>
                          <Check size={15} /> Équipé
                        </>
                      ) : owned ? (
                        "Équiper"
                      ) : (
                        "Acheter"
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function Statistics({ wallet }) {
  const stats = getStats(wallet.adventure);
  return (
    <section>
      <h2>Ton carnet de Dresseur.</h2>
      <p className="adventure-muted">
        Les parties Pokémon depuis l’activation du carnet. Les abandons comptent
        comme des défaites.
      </p>
      <dl className="stats-strip">
        {[
          [stats.games, "Parties"],
          [`${stats.winRate} %`, "Victoires"],
          [stats.average.toFixed(1), "Essais par victoire"],
          [wallet.bestStreak, "Meilleure série"],
        ].map(([value, label]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="stats-columns">
        <section>
          <h3>La précision, essai par essai</h3>
          {stats.distribution.map((count, i) => (
            <div className="stat-bar" key={i}>
              <span>{i + 1}</span>
              <progress
                aria-label={`Victoires en ${i + 1} essais`}
                value={count}
                max={Math.max(1, ...stats.distribution)}
              />
              <b>{count}</b>
            </div>
          ))}
        </section>
        <section>
          <h3>Ceux qui te donnent du fil à retordre</h3>
          {!stats.hardest.length ? (
            <p>Joue ta première partie pour commencer ton carnet.</p>
          ) : (
            <ol className="hardest-list">
              {stats.hardest.map((item) => (
                <li key={item.pokemon.id}>
                  <span>
                    {item.pokemon.name}
                    <small>
                      {item.games} partie(s) · {item.losses} défaite(s)
                    </small>
                  </span>
                  <b>
                    {(item.attempts / item.games).toFixed(1)}
                    <small>essais*</small>
                  </b>
                </li>
              ))}
            </ol>
          )}
          <small>* Une défaite compte pour 6 essais dans ce classement.</small>
        </section>
      </div>
    </section>
  );
}

export default function Adventure({
  wallet,
  home,
  onClassic,
  onStart,
  claimQuest,
  buyCosmetic,
  openPack,
  saveError,
}) {
  const [tab, setTab] = useState("play");
  const [notice, setNotice] = useState("");
  const props = {
    wallet,
    adventure: wallet.adventure,
    onStart,
    onClassic,
    claimQuest,
    buyCosmetic,
    openPack,
    notify: setNotice,
  };
  return (
    <div className="experience adventure-page">
      <header className="site-nav">
        <Brand onHome={home} />
        <button className="adventure-text-button" onClick={home}>
          <ArrowLeft size={17} /> Le jeu
        </button>
        <CoinBadge coins={wallet.coins} compact />
      </header>
      <main className="adventure-main">
        <div className="adventure-heading">
          <div>
            <span className="adventure-kicker">LE CARNET DU DRESSEUR</span>
            <h1>Ton aventure Pokémon.</h1>
            <p>
              Des découvertes, des défis et une collection qui te ressemble.
            </p>
          </div>
          <span className="trainer-stamp">
            <BookOpen size={24} />
            {Object.keys(wallet.adventure.discoveries).length}
            <small>rencontres</small>
          </span>
        </div>
        <nav className="adventure-tabs" aria-label="Carnet du Dresseur">
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => {
                setTab(id);
                setNotice("");
              }}
            >
              {createElement(Icon, { size: 18 })}
              {label}
            </button>
          ))}
        </nav>
        {saveError && (
          <p role="alert" className="adventure-notice">
            La sauvegarde locale est indisponible. Ne ferme pas cette page : ta
            progression risque de ne pas être conservée.
          </p>
        )}
        {notice && (
          <p role="status" className="adventure-notice">
            {notice}
            <button
              aria-label="Fermer le message"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </p>
        )}
        <div className="adventure-content">
          {tab === "play" && <Challenges {...props} />}{" "}
          {tab === "album" && (
            <Album adventure={wallet.adventure} onPlay={onClassic} />
          )}{" "}
          {tab === "pokedex" && <Pokedex adventure={wallet.adventure} />}{" "}
          {tab === "quests" && <Quests {...props} />}{" "}
          {tab === "shop" && <Shop {...props} />}{" "}
          {tab === "stats" && <Statistics wallet={wallet} />}
        </div>
        <footer className="adventure-footer">
          Sauvegardé dans ce navigateur, sans compte. Effacer les données du
          site efface aussi les pièces et la collection. Les anciennes victoires
          ne peuvent pas être reconstituées.
        </footer>
      </main>
    </div>
  );
}
