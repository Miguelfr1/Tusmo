import test from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_REWARD,
  HINT_COSTS,
  calculateWinReward,
  claimDailyReward,
  createWallet,
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
  assert.ok(
    assisted.total > HINT_COSTS.reduce((sum, cost) => sum + cost, 0) / 2,
  );
});

test("le bonus de série est plafonné", () => {
  assert.equal(
    calculateWinReward({ attempts: 3, hintsUsed: 1, nextStreak: 99 }).streak,
    20,
  );
});
