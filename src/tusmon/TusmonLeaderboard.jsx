import { useCallback, useEffect, useState } from "react";
import { Crown, RefreshCw, Users } from "lucide-react";
import { requestApi } from "./discord.js";

export default function TusmonLeaderboard({ connection, day, revision }) {
  const [scope, setScope] = useState(
    connection.user.guildId ? "guild" : "global",
  );
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshId, setRefreshId] = useState(0);
  const refresh = useCallback(() => setRefreshId((i) => i + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    requestApi(`board&scope=${scope}`, connection.session, null, {
      signal: controller.signal,
    })
      .then((board) => {
        setData(board);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 30000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [connection, day, refresh, refreshId, revision, scope]);
  const selectScope = (next) => {
    setScope(next);
    setData(null);
    setLoading(true);
  };
  return (
    <section className="tm-leaderboard" aria-labelledby="tm-board-title">
      <div className="tm-section-head">
        <div>
          <span className="tm-overline">LE RENDEZ-VOUS DES DRESSEURS</span>
          <h2 id="tm-board-title">Alors, qui l’a trouvé ?</h2>
        </div>
        <button
          className="tm-icon-button"
          aria-label="Actualiser le classement"
          onClick={refresh}
        >
          <RefreshCw size={17} />
        </button>
      </div>
      <div className="tm-board-tabs">
        {connection.user.guildId && (
          <button
            aria-pressed={scope === "guild"}
            onClick={() => selectScope("guild")}
          >
            Ce serveur
          </button>
        )}
        <button
          aria-pressed={scope === "global"}
          onClick={() => selectScope("global")}
        >
          Tous les joueurs
        </button>
        <span>
          <Users size={14} /> {data?.total || 0}
        </span>
      </div>
      <p className="tm-ranking-rule">
        Essais, puis indices. Les scores identiques sont ex æquo.
      </p>
      {error && (
        <p role="alert" className="tm-error">
          {error} <button onClick={refresh}>Réessayer</button>
        </p>
      )}
      {loading && (
        <p role="status" className="tm-board-empty">
          Le classement arrive…
        </p>
      )}
      {!loading && !error && !data?.rows.length && (
        <div className="tm-board-empty">
          <Crown size={32} />
          <strong>La première place attend son Dresseur.</strong>
          <p>
            Les résultats apparaissent à la fin des parties. Aucune réponse
            n’est dévoilée.
          </p>
        </div>
      )}
      {!!data?.rows.length && (
        <>
          <div className="tm-score-header">
            <span>Rang / Dresseur</span>
            <span>Essais</span>
            <span>Indices</span>
          </div>
          <ol className="tm-scores">
            {data.rows.map((row) => (
              <li
                key={row.userId}
                className={row.userId === connection.user.id ? "is-me" : ""}
              >
                <span className="tm-rank">
                  {row.rank === 1 && row.status === "won" ? (
                    <Crown size={18} />
                  ) : (
                    row.rank
                  )}
                </span>
                <span className="tm-player">
                  {row.name}
                  {row.userId === connection.user.id && <small>toi</small>}
                </span>
                <strong>
                  {row.status === "won" ? `${row.attempts}/6` : "X/6"}
                </strong>
                <span>{row.hints}</span>
              </li>
            ))}
          </ol>
          {data.me &&
            !data.rows.some((r) => r.userId === connection.user.id) && (
              <p className="tm-your-rank">
                Ta position : #{data.me.rank} ·{" "}
                {data.me.status === "won" ? `${data.me.attempts}/6` : "X/6"} ·{" "}
                {data.me.hints} indice(s)
              </p>
            )}
          {data.total > 100 && (
            <small>Les 100 premiers résultats sont affichés.</small>
          )}
        </>
      )}
      <footer>
        Mis à jour toutes les 30 secondes. Un seul résultat par compte, même si
        tu changes de serveur.
      </footer>
    </section>
  );
}
