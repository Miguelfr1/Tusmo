import { challengeNumber, nextReset } from "./game.js";

// Only the podium plus a few chasers: past that the message stops being
// readable in a channel and starts being a wall of names.
const SHOWN = 10;
const MEDALS = ["🥇", "🥈", "🥉"];
const COLOR = 0x21644c;

const escape = (name) =>
  String(name || "Dresseur")
    .slice(0, 32)
    .replace(/[\\*_`~|<>@#:[\]]/g, "");

const points = (row) => row.score ?? (row.status === "won" ? row.attempts : 7);

// Two players who found it in three tries are both second, and nobody is
// third: the same rule as the podium of any race.
const rankOf = (rows, index) =>
  rows.findIndex((row) => points(row) === points(rows[index])) + 1;

function line(row, rank) {
  const badge = MEDALS[rank - 1] || `\`${String(rank).padStart(2, " ")}.\``;
  const score = row.status === "won" ? `${row.attempts}/6` : "non trouvé";
  return `${badge} **${escape(row.name)}** · ${score}`;
}

function board(standing, userId) {
  if (!standing?.rows?.length) return "_Personne n’a encore joué._";
  const rows = standing.rows;
  const shown = rows
    .slice(0, SHOWN)
    .map((row, index) => line(row, rankOf(rows, index)))
    .join("\n");
  const rest = standing.total - Math.min(rows.length, SHOWN);
  const mine = rows.findIndex((row) => row.userId === userId);
  const tail = [];
  if (rest > 0) tail.push(`_… et ${rest} autre${rest > 1 ? "s" : ""}._`);
  // Someone ranked 40th still wants to know where they stand.
  if (mine >= SHOWN)
    tail.push(`_Tu es ${rankOf(rows, mine)}ᵉ sur ${standing.total}._`);
  return [shown, ...tail].join("\n");
}

/**
 * Builds the /stats reply: the day’s standings for this server, with the same
 * Jouer button as the result card.
 */
export function statsMessage({ day, standing, userId, playButton, now }) {
  const reset = Math.floor(Date.parse(nextReset(now)) / 1000);
  const total = standing?.total || 0;
  return {
    type: 4,
    data: {
      allowed_mentions: { parse: [] },
      embeds: [
        {
          color: COLOR,
          title: `🏆 Tus’Mon n°${challengeNumber(day)}`,
          description: `Le classement du serveur, trié au nombre d’essais. Nouveau Pokémon <t:${reset}:R>.`,
          fields: [{ name: "🏠 Aujourd’hui", value: board(standing, userId) }],
          footer: {
            text: total
              ? `${total} dresseur${total > 1 ? "s ont" : " a"} joué aujourd’hui`
              : "Sois le premier à tenter ta chance",
          },
        },
      ],
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 1, label: "Jouer", custom_id: playButton },
          ],
        },
      ],
    },
  };
}
