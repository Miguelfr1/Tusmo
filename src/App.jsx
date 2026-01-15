import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Trophy, AlertCircle, Loader2, Play, Layers, Home, Flame, Users, Copy, Check } from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, 
  arrayUnion, collection, increment 
} from 'firebase/firestore';

// --- FIREBASE SETUP (Ta configuration) ---
const firebaseConfig = {
  apiKey: "AIzaSyBUW6ongZ1rd3n4zb6klANKzcNgGNplwus",
  authDomain: "tusmo-41270.firebaseapp.com",
  projectId: "tusmo-41270",
  storageBucket: "tusmo-41270.firebasestorage.app",
  messagingSenderId: "782610344402",
  appId: "1:782610344402:web:924aa70d31854c3019c00b"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ID de l'application pour le chemin de stockage
const appId = 'tusmo-game-v1';

// --- DATA & DICTIONARY ---

// 1. URL pour la VALIDATION (Dictionnaire complet ~200k mots)
const ALL_WORDS_URL = "https://raw.githubusercontent.com/words/an-array-of-french-words/master/index.json";

// 2. URL pour les SOLUTIONS (Fréquence ~10k mots)
const COMMON_WORDS_URL = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt";

const FALLBACK_WORDS = [
  "ARBRE", "AVION", "BALLE", "BATON", "BOITE", "BOULE", "BRIQUE", "CADRE", "CHIEN", "CRANE",
  "CYGNE", "DANSE", "DENTS", "DROIT", "ECRAN", "ENCRE", "FERME", "FLEUR", "FOIRE", "FUSEE",
  "GAZON", "GEANT", "GIVRE", "GLACE", "GRAIN", "GRAND", "GRUE", "GUIDE", "HOTEL", "HYMNE",
  "IDEAL", "IMAGE", "JAUNE", "JEUNE", "JOUET", "LAPIN", "LIVRE", "LOUP", "LUMIERE",
  "MAIRE", "MELON", "MONDE", "MOTO", "NACRE", "NAIRE", "NOIRE", "OCEAN", "OMBRES", "ONCLE",
  "ORAGE", "ORDRE", "PAGNE", "PANIER", "PEINT", "PHARE", "PIANO", "PIED", "PILOTE", "PLAGE",
  "PLUME", "POING", "POINT", "POMME", "PONTS", "PORTE", "POSTE", "POULE", "PRUNE", "RADIO",
  "RAYON", "REPAS", "REVEIL", "ROBE", "ROBOT", "ROUGE", "ROUTE", "SABLE", "SALADE", "SALON",
  "SAUCE", "SAVON", "SERIE", "SIEGE", "SINGE", "SIROP", "SKI", "SOEUR", "SOIR", "SOLEIL",
  "SOURIS", "SPORT", "STADE", "STATUE", "SUCRE", "TABLE", "TABLIER", "TACHE", "TALON", "TAPIS",
  "TARTE", "TASSE", "TELE", "TENTE", "TERRE", "TIGRE", "TITRE", "TOILE", "TOIT", "TOMATE",
  "TRAIN", "TRONE", "TROU", "TUBE", "TULIPE", "USINE", "VALISE", "VASE", "VELO", "VENT",
  "VERRE", "VESTE", "VIANDE", "VIDEO", "VILLE", "VIOLON", "VITRE", "VOILE", "VOIX", "VOLCAN",
  "WAGON", "ZEBRE", "ZERO"
];

const normalize = (str) => {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
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
  return 'player_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

// --- LOGIC HELPERS ---

const getInitialGuessMask = (target, guesses) => {
  if (!target) return "";
  const mask = Array(target.length).fill('.');
  mask[0] = target[0]; 

  guesses.forEach(guess => {
    guess.split('').forEach((char, i) => {
      if (char === target[i]) {
        mask[i] = char;
      }
    });
  });

  return mask.join('');
};

// --- COMPONENTS ---

const Cell = ({ letter, status, isCurrent, isRevealing, animationDelay }) => {
  let baseStyle = "w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 border border-blue-400 flex items-center justify-center text-lg sm:text-2xl font-bold uppercase select-none relative overflow-hidden transition-colors duration-200";
  let contentStyle = "w-full h-full flex items-center justify-center relative z-10";

  const displayChar = letter === '.' ? '' : letter;

  if (status === 'correct') {
    baseStyle += " bg-red-600 border-red-600 text-white";
  } else if (status === 'present') {
    baseStyle += " bg-transparent border-blue-400 text-black";
    contentStyle += " bg-yellow-400 rounded-full w-[75%] h-[75%] shadow-sm"; 
  } else if (status === 'absent') {
    baseStyle += " bg-blue-900/50 text-blue-300 opacity-80";
  } else {
    baseStyle += " bg-blue-900/30 text-white";
    if (isCurrent) baseStyle += " border-b-4 border-b-yellow-400 bg-blue-800/50";
  }

  const animStyle = isRevealing ? {
    animation: `flipIn 0.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) backwards`,
    animationDelay: animationDelay
  } : {};

  return (
    <div className={baseStyle} style={animStyle}>
       <div className={contentStyle}>
         {displayChar}
       </div>
    </div>
  );
};

const Row = ({ word, targetWord, isCompleted, isCurrent, currentGuess, cursorIndex }) => {
  const letters = isCurrent ? currentGuess : word;
  
  const getCellStatus = (index, letter) => {
    if (!isCompleted && !isCurrent) return 'empty';
    if (!letter || letter === '.') return 'empty';
    if (isCurrent) return 'typing';
    
    const targetArr = targetWord.split('');
    const guessArr = letters.split('');
    
    if (targetArr[index] === letter) return 'correct';
    
    let targetCount = 0;
    targetArr.forEach((l, i) => {
      if (l === letter && guessArr[i] !== l) targetCount++;
    });
    
    let currentMatchCount = 0;
    for (let i = 0; i <= index; i++) {
      if (guessArr[i] === letter && targetArr[i] !== letter) {
        currentMatchCount++;
      }
    }
    
    if (currentMatchCount <= targetCount) return 'present';
    return 'absent';
  };

  return (
    <div className="flex gap-1 sm:gap-2 mb-2 justify-center">
      {Array.from({ length: targetWord.length }).map((_, i) => {
        const char = letters[i]; 
        const displayLetter = char || (i === 0 ? targetWord[0] : '');
        
        const isCellCurrent = isCurrent && i === cursorIndex;

        return (
          <Cell 
            key={i} 
            letter={displayLetter} 
            status={getCellStatus(i, displayLetter)}
            isCurrent={isCellCurrent}
            isRevealing={isCompleted}
            animationDelay={`${i * 150}ms`}
          />
        );
      })}
    </div>
  );
};

const Keyboard = ({ onKey, usedKeys }) => {
  const rows = [
    "AZERTYUIOP",
    "QSDFGHJKLM",
    "WXCVBN"
  ];

  const getKeyStyle = (key) => {
    const status = usedKeys[key];
    let style = "h-16 sm:h-20 w-8 sm:w-14 rounded-md font-bold text-xl sm:text-2xl flex items-center justify-center transition-colors shadow-sm select-none cursor-pointer active:scale-95 duration-200 ";
    
    if (status === 'correct') return style + "bg-red-600 text-white border-b-4 border-red-800";
    if (status === 'present') return style + "bg-yellow-400 text-black border-b-4 border-yellow-600";
    if (status === 'absent') return style + "bg-blue-950 text-blue-500 opacity-60 border border-blue-900";
    return style + "bg-blue-700 text-white hover:bg-blue-600 border-b-4 border-blue-900";
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-4xl px-1 select-none">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1 sm:gap-2 justify-center w-full">
          {row.split('').map(char => (
            <button
              key={char}
              className={getKeyStyle(char)}
              onClick={() => onKey(char)}
            >
              {char}
            </button>
          ))}
          {i === 2 && (
             <button
             className="h-16 sm:h-20 px-4 sm:px-8 ml-1 bg-blue-700 text-white rounded-md font-bold text-lg sm:text-2xl flex items-center hover:bg-blue-600 border-b-4 border-blue-900 active:scale-95 duration-200"
             onClick={() => onKey('BACKSPACE')}
           >
             ⌫
           </button>
          )}
           {i === 2 && (
             <button
             className="h-16 sm:h-20 px-4 sm:px-8 ml-1 bg-green-600 text-white rounded-md font-bold text-lg sm:text-2xl flex items-center hover:bg-green-500 border-b-4 border-green-800 active:scale-95 duration-200"
             onClick={() => onKey('ENTER')}
           >
             ENTRER
           </button>
          )}
        </div>
      ))}
    </div>
  );
};

// --- MULTIPLAYER COMPONENTS ---

const PlayerCard = ({ name, progress, isMe, isWinner, finished }) => {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${isMe ? 'bg-blue-900/50 border-blue-500' : 'bg-slate-800/50 border-slate-700'} w-full transition-all`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isWinner ? 'bg-yellow-500 text-black' : (isMe ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-200')}`}>
        {isWinner ? <Trophy className="w-4 h-4" /> : name.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className={`font-bold ${isMe ? 'text-blue-300' : 'text-slate-300'}`}>{name} {isMe && '(Moi)'}</span>
          <span className={`${finished ? 'text-green-400' : 'text-slate-400'}`}>{finished ? 'Terminé' : `${progress}/5`}</span>
        </div>
        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${finished ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${(progress / 5) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function TusmoClone() {
  const [dictionary, setDictionary] = useState([]);
  const [solutionDictionary, setSolutionDictionary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sessionId] = useState(() => generateSessionId());
  
  // Navigation
  const [view, setView] = useState('menu'); 
  const [gameMode, setGameMode] = useState('single'); 

  // Game Logic
  const [score, setScore] = useState(0);
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState(""); 
  const [gameState, setGameState] = useState('playing'); 
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const [usedKeys, setUsedKeys] = useState({});
  const [inputIndex, setInputIndex] = useState(1);

  // Versus Logic
  const [lobbyCode, setLobbyCode] = useState("");
  const [lobbyData, setLobbyData] = useState(null);
  const [versusProgress, setVersusProgress] = useState(0); 
  const [inputCode, setInputCode] = useState("");
  const [playerName, setPlayerName] = useState("");

  // --- INIT ---

  useEffect(() => {
    const initApp = async () => {
      setPlayerName(`Joueur ${Math.floor(Math.random()*1000)}`);
      
      // Auth Firebase
      if (auth) {
        if (!auth.currentUser) {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Erreur d'authentification Firebase:", error);
                if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
                    showMessage("ERREUR CONFIG: Activez l'Auth Anonyme dans la console Firebase !");
                }
            }
        }
        onAuthStateChanged(auth, (u) => { if (u) setUser(u); });
      }

      try {
        const dictResponse = await fetch(ALL_WORDS_URL);
        const dictData = await dictResponse.json();
        const fullDict = dictData
          .filter(word => word.length >= 5 && word.length <= 8)
          .map(normalize);
        const uniqueFullDict = [...new Set(fullDict)];
        setDictionary(uniqueFullDict);

        const freqResponse = await fetch(COMMON_WORDS_URL);
        const freqText = await freqResponse.text();
        const freqDict = freqText.split('\n')
          .map(line => line.split(' ')[0])
          .filter(word => word && word.length >= 5 && word.length <= 8)
          .filter(word => !word.includes('-') && !word.includes(' ') && !word.includes("'"))
          .map(normalize);
        
        const uniqueSolutions = [...new Set(freqDict)].slice(0, 4000);
        const verifiedSolutions = uniqueSolutions.filter(w => uniqueFullDict.includes(w));
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

  // Lobby Sync
  useEffect(() => {
    if (!db || !lobbyCode || !user) return;
    const lobbyRef = doc(db, 'artifacts', appId, 'public', 'data', 'lobbies', lobbyCode);
    const unsubscribe = onSnapshot(lobbyRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLobbyData(data);
        if (data.status === 'playing' && view === 'lobby-waiting') startVersusGame(data);
      } else {
        if (view.includes('lobby') || view === 'versus-game') {
          showMessage("Le salon a été fermé.");
          goHome();
        }
      }
    });
    return () => unsubscribe();
  }, [lobbyCode, user, view]);

  // --- ACTIONS ---

  const getRandomWords = (count) => {
    const list = [];
    const source = solutionDictionary.length > 0 ? solutionDictionary : dictionary;
    for(let i=0; i<count; i++) list.push(source[Math.floor(Math.random() * source.length)]);
    return list;
  };

  const createLobby = async () => {
    if (!user || !db) {
        if (!user) showMessage("Erreur: Non connecté (Vérifiez la console Firebase)");
        return;
    }
    const code = generateLobbyCode();
    const words = getRandomWords(5);
    const lobbyRef = doc(db, 'artifacts', appId, 'public', 'data', 'lobbies', code);
    await setDoc(lobbyRef, {
      hostId: sessionId,
      status: 'waiting',
      wordList: words,
      players: { [sessionId]: { name: playerName, progress: 0, finished: false } },
      createdAt: Date.now()
    });
    setLobbyCode(code);
    setVersusProgress(0);
    setView('lobby-waiting');
  };

  const joinLobby = async () => {
    if (!user || !db || inputCode.length !== 4) {
        if (!user) showMessage("Erreur: Non connecté");
        return;
    }
    const code = inputCode.toUpperCase();
    const lobbyRef = doc(db, 'artifacts', appId, 'public', 'data', 'lobbies', code);
    const snap = await getDoc(lobbyRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.status !== 'waiting') { showMessage("La partie a déjà commencé !"); return; }
      if (Object.keys(data.players).length >= 5) { showMessage("Le salon est complet !"); return; }
      await updateDoc(lobbyRef, { [`players.${sessionId}`]: { name: playerName, progress: 0, finished: false } });
      setLobbyCode(code);
      setVersusProgress(0);
      setView('lobby-waiting');
    } else {
      showMessage("Code invalide");
    }
  };

  const startVersusMatch = async () => {
    if (!db || !lobbyCode) return;
    const lobbyRef = doc(db, 'artifacts', appId, 'public', 'data', 'lobbies', lobbyCode);
    await updateDoc(lobbyRef, { status: 'playing' });
  };

  const startVersusGame = (data) => {
    setVersusProgress(0);
    setGameState('playing');
    setGuesses([]);
    setUsedKeys({});
    
    // Init with Mask
    const firstWord = data.wordList[0];
    setTargetWord(firstWord);
    setCurrentGuess(getInitialGuessMask(firstWord, []));
    setInputIndex(1);
    
    setView('versus-game');
  };

  const loadNextVersusWord = async () => {
    const nextIndex = versusProgress + 1;
    setVersusProgress(nextIndex);
    
    if (db && lobbyCode && user) {
      const lobbyRef = doc(db, 'artifacts', appId, 'public', 'data', 'lobbies', lobbyCode);
      const updates = { [`players.${sessionId}.progress`]: nextIndex };
      if (nextIndex >= 5) {
        updates[`players.${sessionId}.finished`] = true;
        if (!lobbyData.winnerId) updates['winnerId'] = sessionId;
      }
      await updateDoc(lobbyRef, updates);
    }

    if (nextIndex < 5) {
       const nextWord = lobbyData.wordList[nextIndex];
       setTargetWord(nextWord);
       setGuesses([]);
       setCurrentGuess(getInitialGuessMask(nextWord, []));
       setInputIndex(1);
       setUsedKeys({});
       showMessage(`Mot ${nextIndex + 1}/5 !`);
    } else {
       setGameState('won');
    }
  };

  // --- STANDARD GAME LOGIC ---

  const startSingleGame = (mode) => {
    setGameMode(mode);
    setScore(0);
    setView('game');
    loadNextWord(true);
  };

  const loadNextWord = useCallback((resetTotal = false) => {
    if (dictionary.length === 0) return;
    
    const source = solutionDictionary.length > 0 ? solutionDictionary : dictionary;
    const newWord = source[Math.floor(Math.random() * source.length)];
    
    setTargetWord(newWord);
    setGuesses([]);
    setCurrentGuess(getInitialGuessMask(newWord, []));
    setInputIndex(1);
    
    setGameState('playing');
    setMessage("");
    setUsedKeys({});
    if (resetTotal) setScore(0);
  }, [dictionary, solutionDictionary]);

  const goHome = () => {
    setView('menu');
    setGameState('playing');
    setLobbyCode("");
    setLobbyData(null);
  };

  const handleKey = useCallback((key) => {
    if (gameState !== 'playing') return;

    if (key === 'ENTER') {
      submitGuess();
    } else if (key === 'BACKSPACE') {
      if (inputIndex > 1) {
        const newIndex = inputIndex - 1;
        setInputIndex(newIndex);
        const mask = getInitialGuessMask(targetWord, guesses);
        const chars = currentGuess.split('');
        chars[newIndex] = mask[newIndex];
        setCurrentGuess(chars.join(''));
      }
    } else if (/^[A-Z]$/.test(key)) {
      if (inputIndex < targetWord.length) {
        const chars = currentGuess.split('');
        chars[inputIndex] = key;
        setCurrentGuess(chars.join(''));
        setInputIndex(inputIndex + 1);
      }
    }
  }, [currentGuess, gameState, targetWord, inputIndex, guesses]);

  useEffect(() => {
    if (!view.includes('game')) return;
    const listener = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        handleKey(key);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handleKey, view]);

  const submitGuess = () => {
    if (currentGuess.includes('.')) {
      showMessage("Mot incomplet !");
      triggerShake();
      return;
    }

    if (!dictionary.includes(currentGuess)) {
       showMessage("Pas dans le dictionnaire !");
       triggerShake();
       return;
    }

    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);
    
    // REDUCTION DELAI: 1500ms -> 1000ms
    setTimeout(() => {
      updateKeyboardStatus(currentGuess);
    }, 1000);

    if (currentGuess === targetWord) {
      if (view === 'versus-game') {
        showMessage("Correct ! Suivant...");
        // DELAI SUIVANT: Augmenté à 3s pour laisser l'animation se finir
        setTimeout(() => {
            loadNextVersusWord();
        }, 3000); 
      } else {
        setGameState('won');
        if (gameMode === 'sequence') {
          const newScore = score + 1;
          setScore(newScore);
          setTimeout(() => showMessage(`BRAVO ! +1 Point`), 1500);
          setTimeout(() => loadNextWord(false), 3000);
        } else {
          setTimeout(() => showMessage("BRAVO ! 🏆"), 1500);
        }
      }
    } else if (newGuesses.length >= 6) {
       if (view === 'versus-game') {
          showMessage("Raté ! On recommence ce mot.");
          setTimeout(() => {
             setGuesses([]);
             setCurrentGuess(getInitialGuessMask(targetWord, []));
             setInputIndex(1);
          }, 2000);
       } else {
          setGameState('lost');
          setTimeout(() => showMessage(`PERDU ! C'était : ${targetWord}`), 1500);
       }
    } else {
      setCurrentGuess(getInitialGuessMask(targetWord, newGuesses));
      setInputIndex(1);
    }
  };

  const updateKeyboardStatus = (guess) => {
    const newKeys = { ...usedKeys };
    const targetArr = targetWord.split('');
    
    guess.split('').forEach((letter, i) => {
      const currentStatus = newKeys[letter];
      let newStatus = 'absent';
      if (targetArr[i] === letter) newStatus = 'correct';
      else if (targetArr.includes(letter)) newStatus = 'present';
      if (currentStatus === 'correct') return;
      if (currentStatus === 'present' && newStatus !== 'correct') return;
      newKeys[letter] = newStatus;
    });
    setUsedKeys(newKeys);
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // --- RENDER HELPERS ---

  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center font-sans relative overflow-hidden select-none">
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        </div>

        <div className="z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center gap-2 mb-4">
             <div className="w-16 h-16 bg-red-600 flex items-center justify-center text-white font-bold rounded shadow-lg text-4xl border-2 border-red-400">T</div>
             <h1 className="text-5xl font-bold tracking-widest text-blue-100 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">USMO</h1>
          </div>

          {isLoading ? (
             <div className="flex flex-col items-center gap-2 text-blue-300">
               <Loader2 className="animate-spin w-8 h-8"/>
               <span>Chargement...</span>
             </div>
          ) : (
            <div className="flex flex-col gap-4 w-72">
              <button onClick={() => startSingleGame('single')} className="flex items-center gap-4 bg-blue-800 hover:bg-blue-700 p-4 rounded-xl shadow-lg transition-all hover:scale-105 group border border-blue-600">
                <div className="bg-blue-900 p-2 rounded-lg group-hover:bg-blue-600 transition-colors"><Play className="w-6 h-6 text-white" /></div>
                <div className="flex flex-col items-start"><span className="font-bold text-lg">Solo Rapide</span></div>
              </button>

              <button onClick={() => startSingleGame('sequence')} className="flex items-center gap-4 bg-purple-900 hover:bg-purple-800 p-4 rounded-xl shadow-lg transition-all hover:scale-105 group border border-purple-600">
                <div className="bg-purple-950 p-2 rounded-lg group-hover:bg-purple-700 transition-colors"><Flame className="w-6 h-6 text-orange-400" /></div>
                <div className="flex flex-col items-start"><span className="font-bold text-lg">Suite Infinie</span></div>
              </button>

              <button onClick={() => setView('lobby-menu')} className="flex items-center gap-4 bg-green-800 hover:bg-green-700 p-4 rounded-xl shadow-lg transition-all hover:scale-105 group border border-green-600">
                <div className="bg-green-900 p-2 rounded-lg group-hover:bg-green-600 transition-colors"><Users className="w-6 h-6 text-white" /></div>
                <div className="flex flex-col items-start"><span className="font-bold text-lg">Versus en Ligne (Beta)</span><span className="text-xs text-green-300">Course à 5 joueurs</span></div>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'lobby-menu') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center font-sans relative select-none">
        <button onClick={goHome} className="absolute top-4 left-4 p-2 bg-slate-800 rounded-full hover:bg-slate-700"><Home className="w-5 h-5"/></button>
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-center text-blue-200">Multijoueur</h2>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-400">Votre Pseudo</label>
            <input 
              className="bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-blue-500 outline-none"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={10}
            />
          </div>

          <div className="border-t border-slate-700 my-2"></div>

          <button onClick={createLobby} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold flex justify-center items-center gap-2">
            <Play className="w-4 h-4"/> Créer une partie
          </button>
          
          <div className="flex gap-2">
            <input 
              className="bg-slate-900 border border-slate-600 rounded p-2 text-white text-center font-mono uppercase tracking-widest flex-1 focus:border-green-500 outline-none"
              placeholder="CODE"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.substring(0,4))}
              maxLength={4}
            />
            <button onClick={joinLobby} className="bg-green-600 hover:bg-green-500 px-6 rounded-lg font-bold">
              Rejoindre
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'lobby-waiting') {
    const players = lobbyData ? Object.values(lobbyData.players) : [];
    const isHost = lobbyData && lobbyData.hostId === sessionId;

    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center font-sans relative select-none">
        <button onClick={goHome} className="absolute top-4 left-4 p-2 bg-slate-800 rounded-full hover:bg-slate-700"><Home className="w-5 h-5"/></button>
        
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md flex flex-col gap-6 items-center">
          <div className="text-center">
             <h2 className="text-xl text-slate-400">Salon d'attente</h2>
             <div className="flex items-center gap-2 justify-center mt-2 bg-slate-900 p-3 rounded-xl border border-blue-500/50">
               <span className="text-4xl font-mono font-bold tracking-widest text-blue-200">{lobbyCode}</span>
               <button onClick={() => { navigator.clipboard.writeText(lobbyCode); showMessage("Copié !") }} className="p-2 hover:bg-slate-800 rounded"><Copy className="w-4 h-4 text-slate-400"/></button>
             </div>
             <p className="text-xs text-slate-500 mt-2">Partagez ce code avec vos amis</p>
          </div>

          <div className="w-full flex flex-col gap-2">
            <h3 className="text-sm font-bold text-slate-300 mb-1">Joueurs ({players.length}/5)</h3>
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-900 p-2 rounded border border-slate-700">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">{p.name.substring(0,2).toUpperCase()}</div>
                <span>{p.name}</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <button onClick={startVersusMatch} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold flex justify-center items-center gap-2 shadow-lg animate-pulse">
               Lancer la course ! <Play className="w-4 h-4"/>
            </button>
          ) : (
            <div className="text-center text-yellow-400 text-sm animate-pulse flex items-center justify-center gap-2">
              <Loader2 className="animate-spin w-4 h-4"/> En attente de l'hôte...
            </div>
          )}
        </div>
        {message && <div className="absolute top-10 bg-black/80 px-4 py-2 rounded text-white">{message}</div>}
      </div>
    );
  }

  // --- GAME UI ---

  const isVersus = view === 'versus-game';
  const playersList = (isVersus && lobbyData) ? Object.entries(lobbyData.players).map(([sid, p]) => ({sid, ...p})) : [];
  // FIX: Utilisez le bon ID pour trouver le gagnant
  const winner = (isVersus && lobbyData?.winnerId) ? lobbyData.players[lobbyData.winnerId] : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center font-sans overflow-hidden select-none">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>

      {/* Header */}
      <header className="w-full bg-blue-900/90 border-b border-blue-700 p-2 sm:p-4 flex justify-between items-center shadow-lg z-20">
        <div className="flex items-center gap-2 sm:gap-4">
           <button onClick={goHome} className="p-2 bg-blue-950 rounded-full hover:bg-blue-800 border border-blue-700 transition-colors">
             <Home className="w-5 h-5 text-blue-200" />
           </button>
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 hidden sm:flex items-center justify-center text-white font-bold rounded shadow-sm text-lg border border-red-500">T</div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-widest text-blue-100 drop-shadow-md">USMO</h1>
              {/* DEBUG: Affichage du mot solution */}
              {/* {targetWord && (
                <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-mono rounded border border-yellow-500/50">
                  {targetWord}
                </span>
              )} */}
           </div>
        </div>

        <div className="flex items-center gap-4">
          {gameMode === 'sequence' && !isVersus && (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-purple-500/50 shadow-inner">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
              <span className="font-bold text-white">Score: {score}</span>
            </div>
          )}
          {isVersus && (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-green-500/50">
               <span className="font-bold text-green-400">Mot {Math.min(versusProgress + 1, 5)}/5</span>
            </div>
          )}
          
          {!isVersus && (
            <button 
              onClick={() => loadNextWord(true)} 
              className="p-2 hover:bg-blue-800 rounded-full transition-colors group border border-transparent hover:border-blue-600"
              title="Recommencer"
            >
              <RefreshCw className={`w-6 h-6 text-blue-300 group-hover:rotate-180 transition-transform duration-500`} />
            </button>
          )}
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 w-full max-w-6xl flex flex-col md:flex-row items-center md:items-start justify-center p-2 sm:p-4 z-10 relative gap-4">
        
        {/* Versus Sidebar */}
        {isVersus && (
          <div className="w-full md:w-64 bg-slate-900/80 p-4 rounded-xl border border-slate-700 flex flex-col gap-3 order-2 md:order-1">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Joueurs</h3>
             {playersList
                .sort((a,b) => b.progress - a.progress)
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
                {gameState === 'won' ? <Trophy className="text-yellow-400 shrink-0" /> : <AlertCircle className="text-blue-400 shrink-0" />}
                <span className="font-bold">{message}</span>
              </div>
            )}

            {/* Winner Overlay (Versus) */}
            {isVersus && winner && (
               <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md animate-in fade-in zoom-in duration-500 rounded-xl">
                  <Trophy className="w-24 h-24 text-yellow-500 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                  {/* FIX: Utilisez la comparaison d'ID correcte */}
                  <h2 className="text-4xl font-bold text-white mb-2">{lobbyData.winnerId === sessionId ? "VICTOIRE !" : "DÉFAITE..."}</h2>
                  <p className="text-xl text-blue-200 mb-8">Vainqueur : <span className="font-bold text-yellow-400">{winner.name}</span></p>
                  <button onClick={goHome} className="px-8 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 font-bold transition-colors shadow-lg">
                    Retour Menu
                  </button>
               </div>
            )}

            {/* Standard Grid */}
            <div className={`flex flex-col gap-1 sm:gap-2 p-4 bg-blue-950/60 rounded-xl shadow-2xl border border-blue-800 backdrop-blur-md transition-transform ${shake ? 'translate-x-[-10px] sm:translate-x-[-20px]' : ''}`} 
                  style={shake ? { animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both' } : {}}>
              
              {guesses.map((word, i) => (
                <Row key={i} word={word} targetWord={targetWord} isCompleted={true} />
              ))}

              {gameState === 'playing' && (
                <Row 
                  word="" 
                  targetWord={targetWord} 
                  isCompleted={false} 
                  isCurrent={true} 
                  currentGuess={currentGuess} 
                  cursorIndex={inputIndex} // Affichage visuel du curseur si besoin
                />
              )}

              {Array.from({ length: Math.max(0, 6 - guesses.length - (gameState === 'playing' ? 1 : 0)) }).map((_, i) => (
                <Row key={`empty-${i}`} word="" targetWord={targetWord} isCompleted={false} />
              ))}

            </div>

            <Keyboard onKey={handleKey} usedKeys={usedKeys} />
        </div>
      </main>

      <style jsx global>{`
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