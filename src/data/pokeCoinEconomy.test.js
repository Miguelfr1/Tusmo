import test from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_REWARD,
  HINT_COSTS,
  MIN_WIN_REWARD,
  calculateWinReward,
  claimDailyReward,
  createWallet,
  hintSpending,
} from "./pokeCoinEconomy.js";

test("le bonus quotidien ne peut être réclamé qu’une fois par jour", () => {
  const date = new Date(2026, 8, 7);
  const first = claimDailyReward(createWallet(), date);
  const second = claimDailyReward(first.wallet, date);
  assert.equal(first.reward, DAILY_REWARD);
  assert.equal(second.reward, 0);
  assert.equal(second.wallet.coins, createWallet().coins + DAILY_REWARD);
});

test("une victoire sans indice récompense davantage que tous les indices", () => {
  const perfect = calculateWinReward({
    attempts: 1,
    hintsUsed: 0,
    nextStreak: 1,
  });
  const assisted = calculateWinReward({
    attempts: 4,
    hintsUsed: 3,
    nextStreak: 1,
  });
  assert.ok(perfect.total > assisted.total);
  assert.ok(assisted.total >= MIN_WIN_REWARD);
});

test("un indice coûte toujours plus qu il ne rapporte", () => {
  const autonomous = calculateWinReward({
    attempts: 1,
    hintsUsed: 0,
    nextStreak: 99,
  });
  for (let hintsUsed = 1; hintsUsed <= HINT_COSTS.length; hintsUsed++) {
    const best = calculateWinReward({ attempts: 1, hintsUsed, nextStreak: 99 });
    assert.ok(
      best.total - hintSpending(hintsUsed) < autonomous.total,
      `${hintsUsed} indice(s) restent avantageux face à une victoire autonome`,
    );
  }
});

test("acheter la série complète d indices ne peut pas être rentable", () => {
  const spent = hintSpending(HINT_COSTS.length);
  const best = calculateWinReward({
    attempts: 1,
    hintsUsed: HINT_COSTS.length,
    nextStreak: 99,
  });
  assert.ok(best.total < spent, "les trois indices se remboursent encore");
});

test("une victoire assistée rapporte toujours quelque chose", () => {
  const worst = calculateWinReward({
    attempts: 6,
    hintsUsed: 3,
    nextStreak: 1,
  });
  assert.equal(worst.total, MIN_WIN_REWARD);
});

test("le mode silhouette ne donne pas le bonus sans indice", () => {
  const silhouette = calculateWinReward({
    attempts: 2,
    hintsUsed: 0,
    nextStreak: 1,
    masteryEligible: false,
  });
  assert.equal(silhouette.mastery, 0);
  assert.equal(silhouette.hints, 0);
});

test("le bonus de série est plafonné", () => {
  assert.equal(
    calculateWinReward({ attempts: 3, hintsUsed: 1, nextStreak: 99 }).streak,
    20,
  );
});
