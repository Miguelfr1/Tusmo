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

function line(row, rank, userId) {
  const badge = MEDALS[rank - 1] || `\`${String(rank).padStart(2, " ")}.\``;
  const score = row.status === "won" ? `${row.attempts}/6` : "non trouvé";
  const you = row.userId === userId ? " ← toi" : "";
  return `${badge} **${escape(row.name)}** · ${score}${you}`;
}

function board(standing, userId) {
  if (!standing?.rows?.length) return "_Personne n’a encore joué._";
  const rows = standing.rows;
  const shown = rows
    .slice(0, SHOWN)
    .map((row, index) => line(row, rankOf(rows, index), userId))
    .join("\n");
  const rest = standing.total - Math.min(rows.length, SHOWN);
  const mine = rows.findIndex((row) => row.userId === userId);
  const tail = [];
  if (rest > 0) tail.push(`_… et ${rest} autre${rest > 1 ? "s" : ""}._`);
  // Someone ranked 40th still wants to know where they stand.
  if (mine >= SHOWN)
    tail.push(`_Toi : ${rankOf(rows, mine)}ᵉ sur ${standing.total}._`);
  return [shown, ...tail].join("\n");
}

/**
 * Builds the /stats reply: the day’s standings, the server’s first when the
 * command is used in one, with the same Jouer button as the result card.
 */
export function statsMessage({ day, guild, global, userId, playButton, now }) {
  const reset = Math.floor(Date.parse(nextReset(now)) / 1000);
  const fields = [];
  if (guild)
    fields.push({ name: "🏠 Sur ce serveur", value: board(guild, userId) });
  fields.push({
    name: guild ? "🌍 Partout dans le monde" : "🌍 Classement du jour",
    value: board(global, userId),
  });
  return {
    type: 4,
    data: {
      allowed_mentions: { parse: [] },
      embeds: [
        {
          color: COLOR,
          title: `🏆 Tus’Mon n°${challengeNumber(day)}`,
          description: `Le classement du jour, trié au nombre d’essais. Nouveau Pokémon <t:${reset}:R>.`,
          fields,
          footer: {
            text: `${global.total} dresseur${global.total > 1 ? "s" : ""} ${global.total > 1 ? "ont" : "a"} joué aujourd’hui`,
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
