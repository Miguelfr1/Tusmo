import { Trophy, Check, MoveHorizontal, Minus } from "lucide-react";

const statusLabels = {
  correct: "bien placé",
  present: "mal placé",
  absent: "absent",
  empty: "case vide",
  typing: "en cours de saisie",
};

function Cell({ letter, status, isCurrent, isRevealing, animationDelay }) {
  let baseStyle =
    "game-cell w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 border border-blue-400 flex items-center justify-center text-lg sm:text-2xl font-bold uppercase select-none relative overflow-hidden transition-colors duration-200";
  let contentStyle =
    "w-full h-full flex items-center justify-center relative z-10";
  const displayChar = letter === "." ? "" : letter;

  if (status === "correct")
    baseStyle += " bg-red-600 border-red-600 text-white";
  else if (status === "present") {
    baseStyle += " bg-transparent border-blue-400 text-black";
    contentStyle += " bg-yellow-400 rounded-full w-[75%] h-[75%] shadow-sm";
  } else if (status === "absent")
    baseStyle += " bg-blue-900/50 text-blue-300 opacity-80";
  else {
    baseStyle += " bg-blue-900/30 text-white";
    if (isCurrent)
      baseStyle += " border-b-4 border-b-yellow-400 bg-blue-800/50";
  }

  const style = isRevealing
    ? {
        animation:
          "flipIn 0.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) backwards",
        animationDelay,
      }
    : undefined;
  return (
    <div
      className={baseStyle}
      style={style}
      role="img"
      aria-label={`${displayChar || "Case"} : ${statusLabels[status]}`}
    >
      <div className={contentStyle} aria-hidden="true">
        {displayChar}
      </div>
      {["correct", "present", "absent"].includes(status) && (
        <span className="cell-state-icon" aria-hidden="true">
          {status === "correct" ? (
            <Check />
          ) : status === "present" ? (
            <MoveHorizontal />
          ) : (
            <Minus />
          )}
        </span>
      )}
    </div>
  );
}

function Row({
  word,
  targetWord,
  isCompleted,
  isCurrent,
  currentGuess,
  cursorIndex,
}) {
  const letters = isCurrent ? currentGuess : word;
  const getStatus = (index, letter) => {
    if ((!isCompleted && !isCurrent) || !letter || letter === ".")
      return "empty";
    if (isCurrent) return "typing";
    const target = targetWord.split("");
    const guess = letters.split("");
    if (target[index] === letter) return "correct";
    const targetCount = target.reduce(
      (count, value, position) =>
        count + Number(value === letter && guess[position] !== value),
      0,
    );
    let matches = 0;
    for (let position = 0; position <= index; position += 1) {
      if (guess[position] === letter && target[position] !== letter)
        matches += 1;
    }
    return matches <= targetCount ? "present" : "absent";
  };

  return (
    <div className="guess-row">
      {Array.from({ length: targetWord.length }, (_, index) => {
        const letter = letters[index] || (index === 0 ? targetWord[0] : "");
        return (
          <Cell
            key={index}
            letter={letter}
            status={getStatus(index, letter)}
            isCurrent={isCurrent && index === cursorIndex}
            isRevealing={isCompleted}
            animationDelay={`${index * 150}ms`}
          />
        );
      })}
    </div>
  );
}

export function WordGrid({
  targetWord,
  guesses,
  gameState,
  currentGuess,
  inputIndex,
  shake,
}) {
  return (
    <div
      className={`word-grid flex flex-col gap-1 sm:gap-2 p-4 bg-blue-950/60 rounded-xl shadow-2xl border border-blue-800 backdrop-blur-md transition-transform ${shake ? "translate-x-[-10px] sm:translate-x-[-20px]" : ""}`}
      style={{
        "--word-length": targetWord.length,
        ...(shake
          ? { animation: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both" }
          : {}),
      }}
    >
      {guesses.map((word, index) => (
        <Row key={index} word={word} targetWord={targetWord} isCompleted />
      ))}
      {gameState === "playing" && (
        <Row
          word=""
          targetWord={targetWord}
          isCurrent
          currentGuess={currentGuess}
          cursorIndex={inputIndex}
        />
      )}
      {Array.from(
        {
          length: Math.max(
            0,
            6 - guesses.length - (gameState === "playing" ? 1 : 0),
          ),
        },
        (_, index) => (
          <Row key={`empty-${index}`} word="" targetWord={targetWord} />
        ),
      )}
    </div>
  );
}

export function Keyboard({ onKey, usedKeys, numeric }) {
  const rows = [
    ...(numeric ? ["0123456789"] : []),
    "AZERTYUIOP",
    "QSDFGHJKLM",
    "WXCVBN",
  ];
  const keyStyle = (key) => {
    const base =
      "h-16 sm:h-20 w-8 sm:w-14 rounded-md font-bold text-xl sm:text-2xl flex items-center justify-center transition-colors shadow-sm select-none cursor-pointer active:scale-95 duration-200 ";
    if (usedKeys[key] === "correct")
      return base + "bg-red-600 text-white border-b-4 border-red-800";
    if (usedKeys[key] === "present")
      return base + "bg-yellow-400 text-black border-b-4 border-yellow-600";
    if (usedKeys[key] === "absent")
      return (
        base + "bg-blue-950 text-blue-500 opacity-60 border border-blue-900"
      );
    return (
      base +
      "bg-blue-700 text-white hover:bg-blue-600 border-b-4 border-blue-900"
    );
  };
  return (
    <div
      className={`game-keyboard ${numeric ? "has-numbers" : ""} mt-4 flex flex-col items-center gap-2 w-full max-w-4xl px-1 select-none`}
      role="group"
      aria-label="Clavier de jeu"
    >
      {rows.map((row, index) => (
        <div key={row} className="flex gap-1 sm:gap-2 justify-center w-full">
          {row.split("").map((key) => (
            <button
              key={key}
              className={keyStyle(key)}
              aria-label={`${key}${usedKeys[key] ? ` : ${statusLabels[usedKeys[key]]}` : ""}`}
              onClick={() => onKey(key)}
            >
              {key}
            </button>
          ))}
          {index === rows.length - 1 && (
            <>
              <button
                className="h-16 sm:h-20 px-4 sm:px-8 ml-1 bg-blue-700 text-white rounded-md font-bold text-lg sm:text-2xl flex items-center hover:bg-blue-600 border-b-4 border-blue-900 active:scale-95 duration-200"
                onClick={() => onKey("BACKSPACE")}
                aria-label="Effacer"
              >
                ⌫
              </button>
              <button
                className="h-16 sm:h-20 px-4 sm:px-8 ml-1 bg-green-600 text-white rounded-md font-bold text-lg sm:text-2xl flex items-center hover:bg-green-500 border-b-4 border-green-800 active:scale-95 duration-200"
                onClick={() => onKey("ENTER")}
              >
                ENTRER
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function PlayerCard({ name, progress, isMe, isWinner, finished }) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border ${isMe ? "bg-blue-900/50 border-blue-500" : "bg-slate-800/50 border-slate-700"} w-full transition-all`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isWinner ? "bg-yellow-500 text-black" : isMe ? "bg-blue-500 text-white" : "bg-slate-600 text-slate-200"}`}
      >
        {isWinner ? (
          <Trophy className="w-4 h-4" />
        ) : (
          name.substring(0, 2).toUpperCase()
        )}
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span
            className={`font-bold ${isMe ? "text-blue-300" : "text-slate-300"}`}
          >
            {name} {isMe && "(Moi)"}
          </span>
          <span className={finished ? "text-green-400" : "text-slate-400"}>
            {finished ? "Terminé" : `${progress}/5`}
          </span>
        </div>
        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${finished ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${(progress / 5) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
