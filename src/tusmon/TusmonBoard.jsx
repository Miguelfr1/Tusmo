import {
  Check,
  Delete,
  MoveHorizontal,
  Minus,
  CornerDownLeft,
} from "lucide-react";

const labels = {
  correct: "bien placé",
  present: "mal placé",
  absent: "absent",
};
const rows = ["0123456789", "AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];

export default function TusmonBoard({ round, draft, cursor, onKey, disabled }) {
  const keys = {};
  for (const row of round.rows)
    row.marks.forEach((mark, i) => {
      const letter = row.word[i];
      if (
        keys[letter] !== "correct" &&
        !(keys[letter] === "present" && mark === "absent")
      )
        keys[letter] = mark;
    });
  return (
    <>
      <div
        className="tm-grid"
        role="group"
        aria-label="Grille du Pokémon du jour"
        style={{ "--letters": round.length }}
      >
        {Array.from({ length: 6 }, (_, index) => {
          const played = round.rows[index];
          const current =
            index === round.rows.length && round.status === "playing";
          const word =
            played?.word ||
            (current ? draft : round.firstLetter.padEnd(round.length, "."));
          return (
            <div className="tm-row" key={index}>
              {[...word].map((letter, i) => {
                const mark = played?.marks[i];
                return (
                  <span
                    key={i}
                    className={`tm-cell ${mark || ""} ${current && i === cursor ? "cursor" : ""}`}
                    role="img"
                    aria-label={`${letter === "." ? "Case vide" : letter}${mark ? ` : ${labels[mark]}` : ""}`}
                    style={{ "--tile-delay": `${i * 45}ms` }}
                  >
                    {letter === "." ? "" : letter}
                    {mark && (
                      <small aria-hidden="true">
                        {mark === "correct" ? (
                          <Check />
                        ) : mark === "present" ? (
                          <MoveHorizontal />
                        ) : (
                          <Minus />
                        )}
                      </small>
                    )}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="tm-legend">
        <span>
          <Check size={12} /> Bien placé
        </span>
        <span>
          <MoveHorizontal size={12} /> Mal placé
        </span>
        <span>
          <Minus size={12} /> Absent
        </span>
      </div>
      {round.status === "playing" && (
        <div className="tm-keyboard" role="group" aria-label="Clavier de jeu">
          {rows.map((row, i) => (
            <div className="tm-key-row" key={row}>
              {[...row].map((letter) => (
                <button
                  key={letter}
                  disabled={disabled}
                  className={keys[letter] || ""}
                  onClick={() => onKey(letter)}
                  aria-label={
                    keys[letter]
                      ? `${letter} : ${labels[keys[letter]]}`
                      : letter
                  }
                >
                  {letter}
                </button>
              ))}
              {i === rows.length - 1 && (
                <>
                  <button
                    disabled={disabled}
                    aria-label="Effacer"
                    onClick={() => onKey("BACKSPACE")}
                  >
                    <Delete size={19} />
                  </button>
                  <button
                    disabled={disabled}
                    className="tm-enter"
                    onClick={() => onKey("ENTER")}
                  >
                    <CornerDownLeft size={15} />
                    <span>Entrer</span>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
