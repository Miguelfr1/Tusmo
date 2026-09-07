export const STARTING_COINS = 100;
export const DAILY_REWARD = 30;
export const HINT_COSTS = [8, 12, 20];

export function getLocalDay(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
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

export function calculateWinReward({ attempts, hintsUsed, nextStreak }) {
  const base = 25;
  const speed = Math.max(0, 7 - attempts) * 4;
  const mastery = hintsUsed === 0 ? 15 : 0;
  const streak = Math.min(20, Math.max(0, nextStreak - 1) * 2);
  return {
    base,
    speed,
    mastery,
    streak,
    total: base + speed + mastery + streak,
  };
}
