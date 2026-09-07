import { useCallback, useEffect, useRef, useState } from "react";
import {
  calculateWinReward,
  claimDailyReward,
  createWallet,
} from "../data/pokeCoinEconomy";
import {
  createAdventure,
  recordResult,
  addAward,
  COSMETICS,
  PACK_COST,
  getQuests,
  DAILY_CHALLENGE_REWARD,
  CHAMPION_REWARD,
} from "../data/adventure.js";
import { getPokemonCard } from "../data/pokemonCards.js";

const STORAGE_KEY = "tusmo-pokecoin-wallet-v1";

function readWallet() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Number.isFinite(saved.coins)
      ? {
          ...createWallet(),
          ...saved,
          adventure: { ...createAdventure(), ...saved.adventure },
        }
      : { ...createWallet(), adventure: createAdventure() };
  } catch {
    return { ...createWallet(), adventure: createAdventure() };
  }
}

export default function usePokeCoins() {
  const [initial] = useState(() => claimDailyReward(readWallet()));
  const [wallet, setWallet] = useState(initial.wallet);
  const walletRef = useRef(wallet);
  const [dailyReward, setDailyReward] = useState(initial.reward);
  const settledRounds = useRef(new Set());
  const writerRef = useRef(!navigator.locks);
  const [isWriter, setIsWriter] = useState(!navigator.locks);
  const [saveError, setSaveError] = useState(() => {
    try {
      if (!navigator.locks) localStorage.setItem(STORAGE_KEY, JSON.stringify(initial.wallet));
      return false;
    } catch {
      return true;
    }
  });

  const updateWallet = useCallback((next) => {
    if (!writerRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
    walletRef.current = next;
    setWallet(next);
  }, []);

  useEffect(() => {
    let closed = false;
    let release;
    let timer;
    const receive = () => {
      if (writerRef.current) return;
      const latest = readWallet();
      walletRef.current = latest;
      setWallet(latest);
    };
    const acquire = () => navigator.locks.request('tusmo-wallet-writer-v1', { ifAvailable: true }, async lock => {
      if (!lock || closed) return;
      clearInterval(timer);
      writerRef.current = true;
      const daily = claimDailyReward(readWallet());
      updateWallet(daily.wallet);
      setDailyReward(daily.reward);
      setIsWriter(true);
      await new Promise(resolve => { release = resolve; });
    });
    if (navigator.locks) { acquire(); timer = setInterval(acquire, 1500); }
    window.addEventListener('storage', receive);
    return () => { closed = true; clearInterval(timer); writerRef.current = !navigator.locks; release?.(); window.removeEventListener('storage', receive); };
  }, [updateWallet]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!writerRef.current) return;
      const daily = claimDailyReward(walletRef.current);
      if (daily.reward) {
        updateWallet(daily.wallet);
        setDailyReward(daily.reward);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [updateWallet]);

  const spend = useCallback(
    (amount, adventureChange) => {
      const current = walletRef.current;
      if (!Number.isFinite(amount) || amount < 0 || current.coins < amount)
        return false;
      updateWallet({ ...current, coins: current.coins - amount, adventure: adventureChange ? adventureChange(current.adventure) : current.adventure });
      return true;
    },
    [updateWallet],
  );

  const rewardWin = useCallback(
    (roundId, attempts, hintsUsed, context) => {
      if (
        settledRounds.current.has(roundId) ||
        walletRef.current.adventure.results[roundId]
      )
        return null;
      settledRounds.current.add(roundId);
      const current = walletRef.current;
      const nextStreak = current.streak + 1;
      const reward = calculateWinReward({
        attempts,
        hintsUsed,
        nextStreak,
        masteryEligible: context?.mode !== "silhouette",
      });
      let adventure = current.adventure;
      if (context?.pokemon) {
        adventure = recordResult(adventure, roundId, {
          ...context,
          won: true,
          attempts,
          hints: hintsUsed,
          date: new Date().toISOString(),
        });
        if (
          context.mode === "daily" &&
          !adventure.daily[context.day]?.rewardGranted
        ) {
          reward.special = DAILY_CHALLENGE_REWARD;
          adventure = {
            ...adventure,
            daily: {
              ...adventure.daily,
              [context.day]: {
                ...adventure.daily[context.day],
                status: "won",
                rewardGranted: true,
              },
            },
          };
        }
        if (
          context.mode === "champion" &&
          context.championIndex === 4 &&
          !adventure.champions.includes(context.region)
        ) {
          reward.special = CHAMPION_REWARD;
          adventure = {
            ...adventure,
            champions: [...adventure.champions, context.region],
          };
        }
        reward.total += reward.special || 0;
        if (context.mode === 'daily') adventure = { ...adventure, daily: { ...adventure.daily, [context.day]: { ...adventure.daily[context.day], status: 'won', guesses: context.guesses } } };
        if (context.mode === 'champion') adventure = { ...adventure, challenge: { ...adventure.challenge, status: 'won', guesses: context.guesses } };
      }
      updateWallet({
        ...current,
        coins: current.coins + reward.total,
        streak: nextStreak,
        bestStreak: Math.max(current.bestStreak, nextStreak),
        wins: current.wins + 1,
        adventure,
      });
      return reward;
    },
    [updateWallet],
  );

  const recordLoss = useCallback(
    (roundId, context) => {
      if (
        settledRounds.current.has(roundId) ||
        walletRef.current.adventure.results[roundId]
      )
        return;
      settledRounds.current.add(roundId);
      const current = walletRef.current;
      let adventure = current.adventure;
      if (context?.pokemon)
        adventure = recordResult(adventure, roundId, {
          ...context,
          won: false,
          attempts: context.attempts || 6,
          hints: context.hints || 0,
          date: new Date().toISOString(),
        });
      if (context?.mode === 'daily') adventure = { ...adventure, daily: { ...adventure.daily, [context.day]: { ...adventure.daily[context.day], status: 'lost', guesses: context.guesses } } };
      if (context?.mode === 'champion') adventure = { ...adventure, challenge: { ...adventure.challenge, status: 'lost', guesses: context.guesses } };
      updateWallet({ ...current, streak: 0, adventure });
    },
    [updateWallet],
  );

  const updateAdventure = useCallback(
    (change) => {
      const current = walletRef.current;
      updateWallet({ ...current, adventure: change(current.adventure) });
    },
    [updateWallet],
  );

  const enrichAward = useCallback(
    async (eventId, pokemon) => {
      try {
        const card = await getPokemonCard(pokemon);
        if (!card) return;
        updateAdventure((a) =>
          a.awards[eventId]
            ? {
                ...a,
                awards: {
                  ...a.awards,
                  [eventId]: { ...a.awards[eventId], card },
                },
              }
            : a,
        );
      } catch {
        /* The official illustration remains collectible offline. */
      }
    },
    [updateAdventure],
  );

  const claimQuest = useCallback(
    (id) => {
      const current = walletRef.current;
      const quest = getQuests(current.adventure, current.bestStreak).find(
        (q) => q.id === id,
      );
      if (!quest || quest.claimed || quest.value < quest.target) return false;
      updateWallet({
        ...current,
        coins: current.coins + quest.reward,
        adventure: {
          ...current.adventure,
          claimedQuests: [...current.adventure.claimedQuests, id],
        },
      });
      return true;
    },
    [updateWallet],
  );

  const buyCosmetic = useCallback(
    (id) => {
      const item = COSMETICS.find((c) => c.id === id);
      const current = walletRef.current;
      if (!item) return false;
      const owned = current.adventure.owned.includes(id);
      if (!owned && current.coins < item.price) return false;
      updateWallet({
        ...current,
        coins: current.coins - (owned ? 0 : item.price),
        adventure: {
          ...current.adventure,
          owned: owned
            ? current.adventure.owned
            : [...current.adventure.owned, id],
          equipped: { ...current.adventure.equipped, [item.slot]: id },
        },
      });
      return true;
    },
    [updateWallet],
  );

  const openPack = useCallback(
    (pokemon) => {
      const current = walletRef.current;
      if (current.coins < PACK_COST || pokemon.length !== 3) return null;
      let adventure = current.adventure;
      const ids = pokemon.map((p) => {
        const id = `pack:${crypto.randomUUID()}`;
        adventure = addAward(adventure, id, p, undefined, "Booster");
        return id;
      });
      updateWallet({
        ...current,
        coins: current.coins - PACK_COST,
        adventure: { ...adventure, lastPack: ids },
      });
      pokemon.forEach((p, i) => enrichAward(ids[i], p));
      return ids;
    },
    [enrichAward, updateWallet],
  );

  return {
    wallet,
    dailyReward,
    dismissDailyReward: () => setDailyReward(0),
    spend,
    rewardWin,
    recordLoss,
    saveError,
    updateAdventure,
    enrichAward,
    claimQuest,
    buyCosmetic,
    openPack,
    isWriter,
  };
}
