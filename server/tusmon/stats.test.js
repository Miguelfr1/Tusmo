import test from "node:test";
import assert from "node:assert/strict";
import { statsMessage } from "./stats.js";
import { challengeDay } from "./game.js";

const day = challengeDay();
const player = (rank, extra = {}) => ({
  userId: String(rank).repeat(18).slice(0, 18),
  name: `Dresseur ${rank}`,
  status: "won",
  attempts: Math.min(6, rank),
  // Distinct scores keep the fixture free of the tie rule, which has its
  // own test.
  score: rank,
  ...extra,
});
const standing = (count, extra = {}) => ({
  total: count,
  rows: Array.from({ length: count }, (_, index) => player(index + 1)),
  ...extra,
});
const build = (options) =>
  statsMessage({
    day,
    standing: standing(0),
    playButton: "tusmon:play",
    ...options,
  });
const embedOf = (message) => message.data.embeds[0];
const fieldsOf = (message) =>
  embedOf(message).fields.map((field) => field.value);

test("le podium reçoit ses médailles et les suivants leur numéro", () => {
  const [value] = fieldsOf(build({ standing: standing(5) }));
  assert.match(value, /🥇 \*\*Dresseur 1\*\* · 1\/6/);
  assert.match(value, /🥈 \*\*Dresseur 2\*\*/);
  assert.match(value, /🥉 \*\*Dresseur 3\*\*/);
  assert.match(value, /` 4\.` \*\*Dresseur 4\*\*/);
});

test("une partie perdue ne montre pas un nombre d’essais trompeur", () => {
  const board = standing(1);
  board.rows[0].status = "lost";
  const [value] = fieldsOf(build({ standing: board }));
  assert.match(value, /non trouvé/);
  assert.doesNotMatch(value, /\/6/);
});

test("aucune ligne ne prend le joueur à partie", () => {
  const board = standing(3);
  const [value] = fieldsOf(
    build({ standing: board, userId: board.rows[1].userId }),
  );
  assert.match(value, /🥈 \*\*Dresseur 2\*\* · 2\/6$/m);
  assert.doesNotMatch(value, /toi/);
});

test("un joueur hors du top garde sa place affichée", () => {
  const board = standing(20);
  const [value] = fieldsOf(
    build({ standing: board, userId: board.rows[13].userId }),
  );
  assert.match(value, /Tu es 14ᵉ sur 20/);
  assert.match(value, /et 10 autres/);
  assert.equal(
    value.split("\n").filter((row) => row.includes("**")).length,
    10,
  );
});

test("le message ne montre que le classement du serveur", () => {
  const message = build({ standing: standing(4) });
  assert.deepEqual(
    embedOf(message).fields.map((field) => field.name),
    ["🏠 Aujourd’hui"],
  );
  assert.doesNotMatch(JSON.stringify(message), /monde|Monde|global/);
});

test("un classement vide reste une invitation à jouer", () => {
  const message = build({});
  assert.match(fieldsOf(message)[0], /Personne n’a encore joué/);
  assert.deepEqual(message.data.components[0].components[0], {
    type: 2,
    style: 1,
    label: "Jouer",
    custom_id: "tusmon:play",
  });
});

test("un pseudo ne peut pas casser la mise en forme du classement", () => {
  const board = standing(1);
  board.rows[0].name = "**@everyone** `<@1>`";
  const [value] = fieldsOf(build({ standing: board }));
  assert.match(value, /🥇 \*\*everyone 1\*\* · 1\/6/);
  assert.deepEqual(build({}).data.allowed_mentions, { parse: [] });
});

test("le message annonce la prochaine remise à zéro", () => {
  assert.match(embedOf(build({})).description, /<t:\d{10}:R>/);
});

test("deux joueurs à égalité partagent leur rang", () => {
  const tied = {
    total: 4,
    rows: [
      { userId: "1", name: "Un", status: "won", attempts: 2, score: 2 },
      { userId: "2", name: "Deux", status: "won", attempts: 3, score: 3 },
      { userId: "3", name: "Trois", status: "won", attempts: 3, score: 3 },
      { userId: "4", name: "Quatre", status: "won", attempts: 5, score: 5 },
    ],
  };
  const [value] = fieldsOf(build({ standing: tied }));
  assert.match(value, /🥇 \*\*Un\*\*/);
  assert.match(value, /🥈 \*\*Deux\*\*/);
  assert.match(value, /🥈 \*\*Trois\*\*/);
  assert.doesNotMatch(value, /🥉/);
  assert.match(value, /` 4\.` \*\*Quatre\*\*/);
});
