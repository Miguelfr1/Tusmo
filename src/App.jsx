import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Trophy,
  AlertCircle,
  Loader2,
  Play,
  Home,
  Flame,
  Users,
  Copy,
  XCircle,
  Sparkles,
} from "lucide-react";
import {
  POKEMON_GENERATION_IDS,
  getPokemonWordPool,
} from "./data/pokemonByGeneration";

import {
  Landing,
  PokemonSetup,
  Victory,
  Defeat,
} from "./components/Experience";
import PokemonHint from "./components/PokemonHint";
import { Keyboard, PlayerCard, WordGrid } from "./components/GameBoard";

// ID de l'application pour le chemin de stockage
const appId = "tusmo-game-v1";

// --- DATA & DICTIONARY ---

// 1. URL pour la VALIDATION (Dictionnaire complet ~200k mots)
const ALL_WORDS_URL =
  "https://raw.githubusercontent.com/words/an-array-of-french-words/master/index.json";

// 2. URL pour les SOLUTIONS (Fréquence ~10k mots)
const COMMON_WORDS_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt";

const FALLBACK_WORDS = [
  "ARBRE",
  "AVION",
  "BALLE",
  "BATON",
  "BOITE",
  "BOULE",
  "BRIQUE",
  "CADRE",
  "CHIEN",
  "CRANE",
  "CYGNE",
  "DANSE",
  "DENTS",
  "DROIT",
  "ECRAN",
  "ENCRE",
  "FERME",
  "FLEUR",
  "FOIRE",
  "FUSEE",
  "GAZON",
  "GEANT",
  "GIVRE",
  "GLACE",
  "GRAIN",
  "GRAND",
  "GRUE",
  "GUIDE",
  "HOTEL",
  "HYMNE",
  "IDEAL",
  "IMAGE",
  "JAUNE",
  "JEUNE",
  "JOUET",
  "LAPIN",
  "LIVRE",
  "LOUP",
  "LUMIERE",
  "MAIRE",
  "MELON",
  "MONDE",
  "MOTO",
  "NACRE",
  "NAIRE",
  "NOIRE",
  "OCEAN",
  "OMBRES",
  "ONCLE",
  "ORAGE",
  "ORDRE",
  "PAGNE",
  "PANIER",
  "PEINT",
  "PHARE",
  "PIANO",
  "PIED",
  "PILOTE",
  "PLAGE",
  "PLUME",
  "POING",
  "POINT",
  "POMME",
  "PONTS",
  "PORTE",
  "POSTE",
  "POULE",
  "PRUNE",
  "RADIO",
  "RAYON",
  "REPAS",
  "REVEIL",
  "ROBE",
  "ROBOT",
  "ROUGE",
  "ROUTE",
  "SABLE",
  "SALADE",
  "SALON",
  "SAUCE",
  "SAVON",
  "SERIE",
  "SIEGE",
  "SINGE",
  "SIROP",
  "SKI",
  "SOEUR",
  "SOIR",
  "SOLEIL",
  "SOURIS",
  "SPORT",
  "STADE",
  "STATUE",
  "SUCRE",
  "TABLE",
  "TABLIER",
  "TACHE",
  "TALON",
  "TAPIS",
  "TARTE",
  "TASSE",
  "TELE",
  "TENTE",
  "TERRE",
  "TIGRE",
  "TITRE",
  "TOILE",
  "TOIT",
  "TOMATE",
  "TRAIN",
  "TRONE",
  "TROU",
  "TUBE",
  "TULIPE",
  "USINE",
  "VALISE",
  "VASE",
  "VELO",
  "VENT",
  "VERRE",
  "VESTE",
  "VIANDE",
  "VIDEO",
  "VILLE",
  "VIOLON",
  "VITRE",
  "VOILE",
  "VOIX",
  "VOLCAN",
  "WAGON",
  "ZEBRE",
  "ZERO",
];

const normalize = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
};

const generateLobbyCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate a random session ID to ensure unique players even if Auth UID is identical (testing env fix)
const generateSessionId = () => {
  return (
    "player_" +
    Math.random().toString(36).substring(2, 9) +
    Date.now().toString(36)
  );
};

// --- LOGIC HELPERS ---

const getInitialGuessMask = (target, guesses) => {
  if (!target) return "";
  const mask = Array(target.length).fill(".");
  mask[0] = target[0];

  guesses.forEach((guess) => {
    guess.split("").forEach((char, i) => {
      if (char === target[i]) {
        mask[i] = char;
      }
    });
  });

  return mask.join("");
};

// --- MAIN APP ---

export default function TusmoClone() {
  const [dictionary, setDictionary] = useState([]);
  const [solutionDictionary, setSolutionDictionary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [multiplayer, setMultiplayer] = useState(null);
  const [multiplayerLoading, setMultiplayerLoading] = useState(false);
  const [sessionId] = useState(() => generateSessionId());

  // Navigation
  const [view, setView] = useState("menu");
  const [gameMode, setGameMode] = useState("single");
  const [selectedPokemonGenerations, setSelectedPokemonGenerations] = useState(
    POKEMON_GENERATION_IDS,
  );

  // Game Logic
  const [score, setScore] = useState(0);
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState("playing");
  const [hintUsed, setHintUsed] = useState(0);
  const [roundId, setRoundId] = useState(0);
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const [usedKeys, setUsedKeys] = useState({});
  const [inputIndex, setInputIndex] = useState(0);

  // Versus Logic
  const [lobbyCode, setLobbyCode] = useState("");
  const [lobbyData, setLobbyData] = useState(null);
  const [versusProgress, setVersusProgress] = useState(0);
  const [inputCode, setInputCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const pokemonWordPool = getPokemonWordPool(selectedPokemonGenerations);

  // --- INIT ---

  useEffect(() => {
    const initApp = async () => {
      setPlayerName(`Joueur ${Math.floor(Math.random() * 1000)}`);

      try {
        const dictResponse = await fetch(ALL_WORDS_URL, {
          signal: AbortSignal.timeout(10000),
        });
        if (!dictResponse.ok) throw new Error("Dictionnaire indisponible");
        const dictData = await dictResponse.json();
        const fullDict = dictData
          .filter((word) => word.length >= 5 && word.length <= 8)
          .map(normalize);
        const uniqueFullDict = [...new Set(fullDict)];
        setDictionary(uniqueFullDict);

        const freqResponse = await fetch(COMMON_WORDS_URL, {
          signal: AbortSignal.timeout(10000),
        });
        if (!freqResponse.ok) throw new Error("Liste de mots indisponible");
        const freqText = await freqResponse.text();
        const freqDict = freqText
          .split("\n")
          .map((line) => line.split(" ")[0])
          .filter((word) => word && word.length >= 5 && word.length <= 8)
          .filter(
            (word) =>
              !word.includes("-") && !word.includes(" ") && !word.includes("'"),
          )
          .map(normalize);

        const uniqueSolutions = [...new Set(freqDict)].slice(0, 4000);
        const verifiedSolutions = uniqueSolutions.filter((w) =>
          uniqueFullDict.includes(w),
        );
        setSolutionDictionary(verifiedSolutions);
      } catch (err) {
        console.error("Fallback dico", err);
        const fb = FALLBACK_WORDS.map(normalize);
        setDictionary(fb);
        setSolutionDictionary(fb);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const openMultiplayer = async () => {
    if (isLoading || multiplayerLoading) return;
    setMultiplayerLoading(true);
    try {
      const { loadMultiplayerServices } =
        await import("./services/firebaseClient");
      const services = await loadMultiplayerServices();
      setMultiplayer(services);
      setUser(services.auth.currentUser);
      setView("lobby-menu");
    } catch (error) {
      console.error("Connexion multijoueur indisponible :", error);
      showMessage("Le multijoueur est momentanément indisponible.");
    } finally {
      setMultiplayerLoading(false);
    }
  };

  useEffect(() => {
    if (!multiplayer) return;
    return multiplayer.onAuthStateChanged(multiplayer.auth, setUser);
  }, [multiplayer]);

  // Lobby Sync
  useEffect(() => {
    if (!multiplayer?.db || !lobbyCode || !user) return;
    const lobbyRef = multiplayer.doc(
      multiplayer.db,
      "artifacts",
      appId,
      "public",
      "data",
      "lobbies",
      lobbyCode,
    );
    const unsubscribe = multiplayer.onSnapshot(
      lobbyRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLobbyData(data);
          if (data.status === "playing" && view === "lobby-waiting")
            startVersusGame(data);
        } else if (view.includes("lobby") || view === "versus-game") {
          showMessage("Le salon a été fermé.");
          goHome();
        }
      },
      (error) => {
        console.error("Synchronisation du salon impossible :", error);
        showMessage("Connexion au salon interrompue.");
      },
    );
    return () => unsubscribe();
  }, [lobbyCode, multiplayer, user, view]);

  // --- ACTIONS ---

  const getRandomWords = (count) => {
    const list = [];
    const source =
      solutionDictionary.length > 0 ? solutionDictionary : dictionary;
    for (let i = 0; i < count; i++)
      list.push(source[Math.floor(Math.random() * source.length)]);
    return list;
  };

  const togglePokemonGeneration = (generationId) => {
    setSelectedPokemonGenerations((current) => {
      if (current.includes(generationId)) {
        return current.length === 1
          ? current
          : current.filter((id) => id !== generationId);
      }
      return [...current, generationId].sort((a, b) => a - b);
    });
  };

  const selectAllPokemonGenerations = () => {
    setSelectedPokemonGenerations(POKEMON_GENERATION_IDS);
  };

  const getWordSource = useCallback(
    (mode = gameMode, generations = selectedPokemonGenerations) => {
      if (mode === "pokemon") {
        return getPokemonWordPool(generations);
      }
      return solutionDictionary.length > 0 ? solutionDictionary : dictionary;
    },
    [dictionary, gameMode, selectedPokemonGenerations, solutionDictionary],
  );

  const getValidationSource = useCallback(
    (mode = gameMode, generations = selectedPokemonGenerations) => {
      if (mode === "pokemon") {
        return getPokemonWordPool(generations);
      }
      return dictionary;
    },
    [dictionary, gameMode, selectedPokemonGenerations],
  );

  const createLobby = async () => {
    if (!user || !multiplayer?.db) {
      showMessage("Connexion au multijoueur en cours.");
      return;
    }
    const code = generateLobbyCode();
    const words = getRandomWords(5);
    if (words.length !== 5 || words.some((word) => !word)) {
      showMessage("Le dictionnaire n'est pas encore prêt.");
      return;
    }
    try {
      const lobbyRef = multiplayer.doc(
        multiplayer.db,
        "artifacts",
        appId,
        "public",
        "data",
        "lobbies",
        code,
      );
      await multiplayer.setDoc(lobbyRef, {
        hostId: sessionId,
        status: "waiting",
        wordList: words,
        players: {
          [sessionId]: {
            name: playerName.trim() || "Joueur",
            progress: 0,
            finished: false,
          },
        },
        createdAt: Date.now(),
      });
      setLobbyCode(code);
      setVersusProgress(0);
      setView("lobby-waiting");
    } catch (error) {
      console.error("Création du salon impossible :", error);
      showMessage("Impossible de créer le salon.");
    }
  };

  const joinLobby = async () => {
    if (!user || !multiplayer?.db) {
      showMessage("Connexion au multijoueur en cours.");
      return;
    }
    if (inputCode.length !== 4) {
      showMessage("Entre un code à 4 caractères.");
      return;
    }
    const code = inputCode.toUpperCase();
    try {
      const lobbyRef = multiplayer.doc(
        multiplayer.db,
        "artifacts",
        appId,
        "public",
        "data",
        "lobbies",
        code,
      );
      const snap = await multiplayer.getDoc(lobbyRef);
      if (!snap.exists()) {
        showMessage("Code invalide");
        return;
      }
      const data = snap.data();
      if (data.status !== "waiting") {
        showMessage("La partie a déjà commencé !");
        return;
      }
      if (Object.keys(data.players).length >= 5) {
        showMessage("Le salon est complet !");
        return;
      }
      await multiplayer.updateDoc(lobbyRef, {
        [`players.${sessionId}`]: {
          name: playerName.trim() || "Joueur",
          progress: 0,
          finished: false,
        },
      });
      setLobbyCode(code);
      setVersusProgress(0);
      setView("lobby-waiting");
    } catch (error) {
      console.error("Accès au salon impossible :", error);
      showMessage("Impossible de rejoindre ce salon.");
    }
  };

  const startVersusMatch = async () => {
    if (!multiplayer?.db || !lobbyCode) return;
    try {
      const lobbyRef = multiplayer.doc(
        multiplayer.db,
        "artifacts",
        appId,
        "public",
        "data",
        "lobbies",
        lobbyCode,
      );
      await multiplayer.updateDoc(lobbyRef, { status: "playing" });
    } catch (error) {
      console.error("Lancement de la partie impossible :", error);
      showMessage("Impossible de lancer la partie.");
    }
  };

  const startVersusGame = (data) => {
    setVersusProgress(0);
    setGameState("playing");
    setGuesses([]);
    setUsedKeys({});

    // Init with Mask
    const firstWord = data.wordList[0];
    setTargetWord(firstWord);
    setCurrentGuess(getInitialGuessMask(firstWord, []));
    setInputIndex(0);

    setView("versus-game");
  };

  const loadNextVersusWord = useCallback(async () => {
    const nextIndex = versusProgress + 1;
    setVersusProgress(nextIndex);

    if (multiplayer?.db && lobbyCode && user) {
      const lobbyRef = multiplayer.doc(
        multiplayer.db,
        "artifacts",
        appId,
        "public",
        "data",
        "lobbies",
        lobbyCode,
      );
      const updates = { [`players.${sessionId}.progress`]: nextIndex };
      if (nextIndex >= 5) {
        updates[`players.${sessionId}.finished`] = true;
        if (!lobbyData.winnerId) updates["winnerId"] = sessionId;
      }
      try {
        await multiplayer.updateDoc(lobbyRef, updates);
      } catch (error) {
        console.error("Progression multijoueur non enregistrée :", error);
        showMessage("La progression n'a pas pu être enregistrée.");
        return;
      }
    }

    if (nextIndex < 5) {
      const nextWord = lobbyData.wordList[nextIndex];
      setTargetWord(nextWord);
      setGuesses([]);
      setCurrentGuess(getInitialGuessMask(nextWord, []));
      setInputIndex(0);
      setUsedKeys({});
      showMessage(`Mot ${nextIndex + 1}/5 !`);
    } else {
      setGameState("won");
    }
  }, [lobbyCode, lobbyData, multiplayer, sessionId, user, versusProgress]);

  // --- STANDARD GAME LOGIC ---

  const startSingleGame = (mode) => {
    setGameMode(mode);
    setScore(0);
    setView("game");
    loadNextWord(true, mode);
  };

  const startPokemonGame = () => {
    setView("pokemon-setup");
  };

  const launchPokemonGame = () => {
    if (pokemonWordPool.length === 0) {
      showMessage("Aucun nom jouable pour cette sélection.");
      return;
    }

    setGameMode("pokemon");
    setScore(0);
    setView("game");
    loadNextWord(true, "pokemon", selectedPokemonGenerations);
  };

  const loadNextWord = useCallback(
    (
      resetTotal = false,
      mode = gameMode,
      generations = selectedPokemonGenerations,
    ) => {
      const source = getWordSource(mode, generations);
      if (source.length === 0) return;

      const newWord = source[Math.floor(Math.random() * source.length)];
      setHintUsed(0);
      setRoundId((id) => id + 1);

      setTargetWord(newWord);
      setGuesses([]);
      setCurrentGuess(getInitialGuessMask(newWord, []));
      setInputIndex(0);

      setGameState("playing");
      setMessage("");
      setUsedKeys({});
      if (resetTotal) setScore(0);
    },
    [gameMode, getWordSource, selectedPokemonGenerations],
  );

  const goHome = () => {
    setView("menu");
    setGameState("playing");
    setLobbyCode("");
    setLobbyData(null);
  };

  const updateKeyboardStatus = useCallback(
    (guess) => {
      const newKeys = { ...usedKeys };
      const targetArr = targetWord.split("");

      guess.split("").forEach((letter, i) => {
        const currentStatus = newKeys[letter];
        let newStatus = "absent";
        if (targetArr[i] === letter) newStatus = "correct";
        else if (targetArr.includes(letter)) newStatus = "present";
        if (currentStatus === "correct") return;
        if (currentStatus === "present" && newStatus !== "correct") return;
        newKeys[letter] = newStatus;
      });
      setUsedKeys(newKeys);
    },
    [targetWord, usedKeys],
  );

  const submitGuess = useCallback(() => {
    if (currentGuess.includes(".")) {
      showMessage("Mot incomplet !");
      triggerShake();
      return;
    }

    const validationSource = getValidationSource();
    if (!validationSource.includes(currentGuess)) {
      showMessage("Pas dans le dictionnaire !");
      triggerShake();
      return;
    }

    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);

    setTimeout(() => {
      updateKeyboardStatus(currentGuess);
    }, 1000);

    if (currentGuess === targetWord) {
      if (view === "versus-game") {
        showMessage("Correct ! Suivant...");
        setTimeout(() => {
          loadNextVersusWord();
        }, 3000);
      } else {
        setGameState("won");
        if (gameMode === "sequence") {
          const newScore = score + 1;
          setScore(newScore);
          setTimeout(() => showMessage(`BRAVO ! +1 Point`), 1500);
        } else {
          setTimeout(() => showMessage("BRAVO ! 🏆"), 1500);
        }
      }
    } else if (newGuesses.length >= 6) {
      if (view === "versus-game") {
        showMessage("Raté ! On recommence ce mot.");
        setTimeout(() => {
          setGuesses([]);
          setCurrentGuess(getInitialGuessMask(targetWord, []));
          setInputIndex(0);
        }, 2000);
      } else {
        setGameState("lost");
        setTimeout(() => showMessage(`PERDU ! C'était : ${targetWord}`), 1500);
      }
    } else {
      setCurrentGuess(getInitialGuessMask(targetWord, newGuesses));
      setInputIndex(0);
    }
  }, [
    currentGuess,
    gameMode,
    getValidationSource,
    guesses,
    loadNextVersusWord,
    score,
    targetWord,
    updateKeyboardStatus,
    view,
  ]);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleKey = useCallback(
    (key) => {
      if (gameState !== "playing") return;

      if (key === "ENTER") {
        submitGuess();
      } else if (key === "BACKSPACE") {
        if (inputIndex > 0) {
          const newIndex = inputIndex - 1;
          setInputIndex(newIndex);
          if (newIndex > 0) {
            const mask = getInitialGuessMask(targetWord, guesses);
            const chars = currentGuess.split("");
            chars[newIndex] = mask[newIndex];
            setCurrentGuess(chars.join(""));
          }
        }
      } else if (/^[A-Z0-9]$/.test(key)) {
        if (inputIndex === 0) {
          if (key === targetWord[0]) {
            setInputIndex(1);
          } else if (targetWord.length > 1) {
            const chars = currentGuess.split("");
            chars[1] = key;
            setCurrentGuess(chars.join(""));
            setInputIndex(2);
          }
        } else if (inputIndex < targetWord.length) {
          const chars = currentGuess.split("");
          chars[inputIndex] = key;
          setCurrentGuess(chars.join(""));
          setInputIndex(inputIndex + 1);
        }
      }
    },
    [currentGuess, gameState, guesses, inputIndex, submitGuess, targetWord],
  );

  useEffect(() => {
    if (!view.includes("game")) return;
    const listener = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === "ENTER" || key === "BACKSPACE" || /^[A-Z0-9]$/.test(key)) {
        e.preventDefault();
        handleKey(key);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handleKey, view]);

  // --- RENDER HELPERS ---

  if (view === "menu") {
    return (
      <Landing
        onPokemon={startPokemonGame}
        onSolo={() => startSingleGame("single")}
        onInfinite={() => startSingleGame("sequence")}
        onVersus={openMultiplayer}
        loading={isLoading}
        multiplayerLoading={multiplayerLoading}
      />
    );
  }
  if (view === "pokemon-setup") {
    return (
      <PokemonSetup
        selected={selectedPokemonGenerations}
        toggle={togglePokemonGeneration}
        selectAll={selectAllPokemonGenerations}
        count={pokemonWordPool.length}
        launch={launchPokemonGame}
        home={goHome}
      />
    );
  }

  if (view === "lobby-menu") {
    return (
      <div className="lobby-page min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center font-sans relative select-none">
        <button
          onClick={goHome}
          className="absolute top-4 left-4 p-2 bg-slate-800 rounded-full hover:bg-slate-700"
        >
          <Home className="w-5 h-5" />
        </button>
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-center text-blue-200">
            Multijoueur
          </h2>

          <div className="flex flex-col gap-2">
            <label htmlFor="player-name" className="text-sm text-slate-400">
              Votre pseudo
            </label>
            <input
              className="bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-blue-500 outline-none"
              id="player-name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={10}
            />
          </div>

          <div className="border-t border-slate-700 my-2"></div>

          <button
            onClick={createLobby}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold flex justify-center items-center gap-2"
          >
            <Play className="w-4 h-4" /> Créer une partie
          </button>

          <div className="flex gap-2">
            <input
              className="bg-slate-900 border border-slate-600 rounded p-2 text-white text-center font-mono uppercase tracking-widest flex-1 focus:border-green-500 outline-none"
              aria-label="Code du salon"
              placeholder="CODE"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.substring(0, 4))}
              maxLength={4}
            />
            <button
              onClick={joinLobby}
              className="bg-green-600 hover:bg-green-500 px-6 rounded-lg font-bold"
            >
              Rejoindre
            </button>
          </div>
        </div>
        {message && (
          <p role="status" className="lobby-message">
            {message}
          </p>
        )}
      </div>
    );
  }

  if (view === "lobby-waiting") {
    const players = lobbyData ? Object.values(lobbyData.players) : [];
    const isHost = lobbyData && lobbyData.hostId === sessionId;

    return (
      <div className="lobby-page min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center font-sans relative select-none">
        <button
          onClick={goHome}
          className="absolute top-4 left-4 p-2 bg-slate-800 rounded-full hover:bg-slate-700"
        >
          <Home className="w-5 h-5" />
        </button>

        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md flex flex-col gap-6 items-center">
          <div className="text-center">
            <h2 className="text-xl text-slate-400">Salon d'attente</h2>
            <div className="flex items-center gap-2 justify-center mt-2 bg-slate-900 p-3 rounded-xl border border-blue-500/50">
              <span className="text-4xl font-mono font-bold tracking-widest text-blue-200">
                {lobbyCode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lobbyCode);
                  showMessage("Copié !");
                }}
                className="p-2 hover:bg-slate-800 rounded"
              >
                <Copy className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Partagez ce code avec vos amis
            </p>
          </div>

          <div className="w-full flex flex-col gap-2">
            <h3 className="text-sm font-bold text-slate-300 mb-1">
              Joueurs ({players.length}/5)
            </h3>
            {players.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-slate-900 p-2 rounded border border-slate-700"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                  {p.name.substring(0, 2).toUpperCase()}
                </div>
                <span>{p.name}</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              onClick={startVersusMatch}
              className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold flex justify-center items-center gap-2 shadow-lg animate-pulse"
            >
              Lancer la course ! <Play className="w-4 h-4" />
            </button>
          ) : (
            <div className="text-center text-yellow-400 text-sm animate-pulse flex items-center justify-center gap-2">
              <Loader2 className="animate-spin w-4 h-4" /> En attente de
              l'hôte...
            </div>
          )}
        </div>
        {message && (
          <div className="absolute top-10 bg-black/80 px-4 py-2 rounded text-white">
            {message}
          </div>
        )}
      </div>
    );
  }

  // --- GAME UI ---

  const isVersus = view === "versus-game";
  const playersList =
    isVersus && lobbyData
      ? Object.entries(lobbyData.players).map(([sid, p]) => ({ sid, ...p }))
      : [];
  const winner =
    isVersus && lobbyData?.winnerId
      ? lobbyData.players[lobbyData.winnerId]
      : null;

  return (
    <div
      className={`game-page ${gameMode === "pokemon" && !isVersus ? "pokemon-game" : ""} min-h-screen bg-slate-900 text-white flex flex-col items-center font-sans overflow-hidden select-none`}
    >
      <div
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #3b82f6 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      ></div>

      {!isVersus && gameState === "won" && (
        <Victory
          key={targetWord}
          word={targetWord}
          attempts={guesses.length}
          pokemon={gameMode === "pokemon"}
          hintUsed={hintUsed}
          next={() => loadNextWord(false)}
          home={goHome}
        />
      )}
      {/* Header */}
      <header className="w-full bg-blue-900/90 border-b border-blue-700 p-2 sm:p-4 flex justify-between items-center shadow-lg z-20">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={goHome}
            className="p-2 bg-blue-950 rounded-full hover:bg-blue-800 border border-blue-700 transition-colors"
          >
            <Home className="w-5 h-5 text-blue-200" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 hidden sm:flex items-center justify-center text-white font-bold rounded shadow-sm text-lg border border-red-500">
              T
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-widest text-blue-100 drop-shadow-md">
              USMO
            </h1>
            {/* DEBUG: Affichage du mot solution */}
            {/* {targetWord && (
                <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-mono rounded border border-yellow-500/50">
                  {targetWord}
                </span>
              )} */}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {gameMode === "sequence" && !isVersus && (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-purple-500/50 shadow-inner">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
              <span className="font-bold text-white">Score: {score}</span>
            </div>
          )}
          {gameMode === "pokemon" && !isVersus && (
            <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="font-bold text-amber-100">
                Pokémon · Gen {selectedPokemonGenerations.join(", ")}
              </span>
            </div>
          )}
          {isVersus && (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-green-500/50">
              <span className="font-bold text-green-400">
                Mot {Math.min(versusProgress + 1, 5)}/5
              </span>
            </div>
          )}

          {!isVersus && (
            <button
              onClick={() => loadNextWord(true)}
              className="p-2 hover:bg-blue-800 rounded-full transition-colors group border border-transparent hover:border-blue-600"
              title="Recommencer"
            >
              <RefreshCw
                className={`w-6 h-6 text-blue-300 group-hover:rotate-180 transition-transform duration-500`}
              />
            </button>
          )}
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 w-full max-w-6xl flex flex-col md:flex-row items-center md:items-start justify-center p-2 sm:p-4 z-10 relative gap-4">
        {/* Versus Sidebar */}
        {isVersus && (
          <div className="w-full md:w-64 bg-slate-900/80 p-4 rounded-xl border border-slate-700 flex flex-col gap-3 order-2 md:order-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Joueurs
            </h3>
            {playersList
              .sort((a, b) => b.progress - a.progress)
              .map((p) => (
                <PlayerCard
                  key={p.sid}
                  name={p.name}
                  progress={p.progress}
                  finished={p.finished}
                  isMe={p.sid === sessionId}
                  isWinner={lobbyData.winnerId === p.sid}
                />
              ))}
          </div>
        )}

        <div className="flex-1 flex flex-col items-center w-full max-w-2xl order-1 md:order-2">
          {message && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl border border-blue-500 animate-bounce flex items-center gap-2 z-50 text-center whitespace-nowrap">
              {gameState === "won" ? (
                <Trophy className="text-yellow-400 shrink-0" />
              ) : (
                <AlertCircle className="text-blue-400 shrink-0" />
              )}
              <span className="font-bold">{message}</span>
            </div>
          )}

          {!isVersus && gameState === "lost" && (
            <Defeat
              word={targetWord}
              pokemon={gameMode === "pokemon"}
              score={gameMode === "sequence" ? score : undefined}
              next={() => loadNextWord(true)}
              home={goHome}
            />
          )}

          {/* Winner Overlay (Versus) */}
          {isVersus && winner && lobbyData.winnerId === sessionId && (
            <Victory
              word={targetWord}
              attempts={guesses.length}
              pokemon={false}
              next={goHome}
              home={goHome}
            />
          )}
          {isVersus && winner && lobbyData.winnerId !== sessionId && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md animate-in fade-in zoom-in duration-500 rounded-xl">
              <Trophy className="w-24 h-24 text-yellow-500 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
              {/* FIX: Utilisez la comparaison d'ID correcte */}
              <h2 className="text-4xl font-bold text-white mb-2">
                {lobbyData.winnerId === sessionId ? "VICTOIRE !" : "DÉFAITE..."}
              </h2>
              <p className="text-xl text-blue-200 mb-8">
                Vainqueur :{" "}
                <span className="font-bold text-yellow-400">{winner.name}</span>
              </p>
              <button
                onClick={goHome}
                className="px-8 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 font-bold transition-colors shadow-lg"
              >
                Retour Menu
              </button>
            </div>
          )}

          <div className="game-intro">
            <span className="eyebrow">
              {gameMode === "pokemon" ? "LE DÉFI POKÉMON" : "À TOI DE JOUER"}
            </span>
            <h2>Un nom à découvrir.</h2>
            <p>
              {targetWord.length} caractères · Essai{" "}
              {Math.min(guesses.length + 1, 6)} sur 6
            </p>
          </div>
          {gameMode === "pokemon" && !isVersus && gameState === "playing" && (
            <PokemonHint
              key={roundId}
              word={targetWord}
              onReveal={(step) => setHintUsed(step)}
            />
          )}
          <WordGrid
            targetWord={targetWord}
            guesses={guesses}
            gameState={gameState}
            currentGuess={currentGuess}
            inputIndex={inputIndex}
            shake={shake}
          />

          <div className="grid-legend">
            <span>
              <i /> Bien placé
            </span>
            <span>
              <i /> Mal placé
            </span>
            <span>
              <i /> Absent
            </span>
          </div>
          <Keyboard
            onKey={handleKey}
            usedKeys={usedKeys}
            numeric={gameMode === "pokemon"}
          />
        </div>
      </main>

      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        @keyframes flipIn {
          0% { transform: rotateX(-90deg); opacity: 0; }
          100% { transform: rotateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
