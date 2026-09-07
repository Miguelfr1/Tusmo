export const STARTING_COINS = 100;
export const DAILY_REWARD = 30;
export const HINT_COSTS = [8, 12, 20];
export const MIN_WIN_REWARD = 5;

export function getLocalDay(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function hintSpending(hintsUsed = 0) {
  return HINT_COSTS.slice(0, hintsUsed).reduce((sum, cost) => sum + cost, 0);
}

export function createWallet() {
  return {
    coins: STARTING_COINS,
    streak: 0,
    bestStreak: 0,
    wins: 0,
    lastDailyReward: null,
  };
}

export function claimDailyReward(wallet, date = new Date()) {
  if (wallet.lastDailyReward === getLocalDay(date))
    return { wallet, reward: 0 };
  return {
    wallet: {
      ...wallet,
      coins: wallet.coins + DAILY_REWARD,
      lastDailyReward: getLocalDay(date),
    },
    reward: DAILY_REWARD,
  };
}

// Les indices sont facturés deux fois : à l achat, puis sur la récompense.
// Une partie assistée reste gagnante face à une défaite, jamais face à une
// victoire autonome.
export function calculateWinReward({
  attempts,
  hintsUsed = 0,
  nextStreak,
  masteryEligible = true,
}) {
  const base = 25;
  const speed = Math.max(0, 7 - attempts) * 4;
  const mastery = masteryEligible && hintsUsed === 0 ? 15 : 0;
  const streak = Math.min(20, Math.max(0, nextStreak - 1) * 2);
  const hints = hintsUsed ? -hintSpending(hintsUsed) : 0;
  return {
    base,
    speed,
    mastery,
    streak,
    hints,
    total: Math.max(MIN_WIN_REWARD, base + speed + mastery + streak + hints),
  };
}
