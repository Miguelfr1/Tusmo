import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdventure, recordResult, addAward, dailyPokemon, dayKey, championTeam, getStats, getQuests, getBadges, shareResult, COSMETICS } from './adventure.js';

const pika = { id: 25, name: 'Pikachu', types: ['Électrik'] };
const water = { id: 7, name: 'Carapuce', types: ['Eau'] };
const result = (pokemon = pika, extras = {}) => ({ pokemon, won: true, attempts: 2, hints: 0, mode: 'classic', date: '2026-09-07T12:00:00.000Z', ...extras });

test('a victory discovers species and creates exactly one collectible per round', () => {
  const a = recordResult(createAdventure(), 'round-1', result());
  assert.equal(Object.keys(a.awards).length, 1);
  assert.equal(a.awards['round-1'].card.pokemonId, 25);
  assert.equal(Object.keys(a.discoveries).length, 1);
  assert.equal(recordResult(a, 'round-1', result()), a);
});
test('repeated victories count duplicates, never extra discoveries', () => {
  const a = recordResult(recordResult(createAdventure(), '1', result()), '2', result());
  assert.equal(Object.keys(a.awards).length, 2);
  assert.equal(Object.keys(a.discoveries).length, 1);
});
test('booster awards do not unlock the Pokédex or quests', () => {
  const a = addAward(createAdventure(), 'pack-1', pika);
  assert.equal(Object.keys(a.discoveries).length, 0);
  assert.equal(getQuests(a)[0].value, 0);
});
test('defeat affects statistics but awards no card', () => {
  let a = recordResult(createAdventure(), '1', result());
  a = recordResult(a, '2', result(water, { won: false }));
  const stats = getStats(a);
  assert.equal(stats.winRate, 50);
  assert.equal(stats.average, 2);
  assert.equal(stats.hardest[0].pokemon.id, 7);
  assert.equal(Object.keys(a.awards).length, 1);
});
test('daily draw is deterministic and uses a UTC calendar day', () => {
  const entries = Array.from({ length: 1025 }, (_, id) => ({ id: id + 1 }));
  assert.deepEqual(dailyPokemon(entries, '2026-09-07'), dailyPokemon(entries, '2026-09-07'));
  assert.equal(dayKey(new Date('2026-09-08T01:00:00+02:00')), '2026-09-07');
  assert.ok(new Set(Array.from({ length: 30 }, (_, i) => dailyPokemon(entries, `2026-09-${i + 1}`).id)).size > 20);
});
test('champion team is stable and contains five distinct regional species', () => {
  const entries = Array.from({ length: 151 }, (_, id) => ({ id: id + 1 }));
  const team = championTeam(entries, 1);
  assert.equal(team.length, 5);
  assert.equal(new Set(team.map(p => p.id)).size, 5);
  assert.deepEqual(team, championTeam(entries, 1));
});
test('quest and badge thresholds reflect successful play', () => {
  let a = createAdventure();
  [1, 4, 7].forEach(id => { a = recordResult(a, String(id), result({ id, name: 'Test', types: ['Eau'] }, { attempts: 1 })); });
  assert.equal(getQuests(a, 5).every(q => q.value === q.target), true);
  assert.equal(getBadges(a).find(b => b.id === 'first').unlocked, true);
  assert.equal(getBadges(a).find(b => b.id === 'water').unlocked, false);
});
test('silhouette never completes the no-hint quest', () => {
  const a = recordResult(createAdventure(), '1', result(pika, { mode: 'silhouette' }));
  assert.equal(getQuests(a)[1].value, 0);
});
test('share text does not reveal guessed names and handles repeated letters', () => {
  const text = shareResult('ABBA', ['AAAA', 'ABBA'], 2, 'quotidien');
  assert.ok(text.includes('🟩⬛⬛🟩'));
  assert.ok(!text.includes('ABBA'));
  assert.ok(!text.includes('AAAA'));
  assert.ok(text.includes('2/6'));
});
test('every cosmetic slot has a free equipped default', () => {
  const a = createAdventure();
  for (const [slot, id] of Object.entries(a.equipped)) assert.ok(COSMETICS.some(c => c.id === id && c.slot === slot && c.price === 0));
});
