import { useCallback, useEffect, useRef, useState } from "react";
import { connectDiscord, requestApi } from "./discord.js";

export function guessMask(round) {
  const letters = Array(round.length).fill(".");
  for (const row of round.rows)
    row.marks.forEach((mark, i) => {
      if (mark === "correct") letters[i] = row.word[i];
    });
  return letters.join("");
}

export default function useDailyGame({ keyboardEnabled = true } = {}) {
  const [connection, setConnection] = useState(null);
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState("");
  const [cursor, setCursor] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryable, setRetryable] = useState(false);
  const [expiredSession, setExpiredSession] = useState(false);
  const pending = useRef(null);
  const inFlight = useRef(false);

  const receive = useCallback((result) => {
    setData(result);
    setDraft(guessMask(result.round));
    setCursor(0);
    setError("");
    setRetryable(false);
  }, []);

  const connect = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const auth = await connectDiscord({ reconnect: !!connection });
      setConnection(auth);
      setExpiredSession(false);
      receive(await requestApi("state", auth.session));
      pending.current = null;
    } catch (e) {
      setError(e.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [connection, receive]);

  const refresh = useCallback(async () => {
    if (!connection || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      receive(await requestApi("state", connection.session));
      pending.current = null;
    } catch (e) {
      setError(e.message);
      if (e.status === 401) setExpiredSession(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [connection, receive]);

  const send = useCallback(
    async (type) => {
      if (!data || !connection || inFlight.current || expiredSession) return;
      if (data.round.status !== "playing" && !pending.current) return;
      if (!pending.current && type === "guess" && draft.includes(".")) {
        setError("Complète le nom du Pokémon avant de valider.");
        return;
      }
      pending.current ||= {
        type,
        guess: type === "guess" ? draft : undefined,
        day: data.round.day,
        revision: data.round.revision,
        requestId: crypto.randomUUID(),
      };
      inFlight.current = true;
      setBusy(true);
      setError("");
      try {
        receive(await requestApi("play", connection.session, pending.current));
        pending.current = null;
      } catch (e) {
        setError(e.message);
        if (e.status === 401) setExpiredSession(true);
        if (e.status === 409) {
          pending.current = null;
          try {
            receive(await requestApi("state", connection.session));
            setError("La partie a été synchronisée.");
          } catch (syncError) {
            setError(syncError.message);
          }
        } else if (e.status && e.status < 500 && e.status !== 429) {
          pending.current = null;
          setRetryable(false);
        } else setRetryable(true);
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [connection, data, draft, expiredSession, receive],
  );

  const onKey = useCallback(
    (key) => {
      if (
        !data ||
        data.round.status !== "playing" ||
        busy ||
        retryable ||
        expiredSession
      )
        return;
      if (key === "ENTER") {
        send("guess");
        return;
      }
      if (key === "BACKSPACE") {
        const index = Math.max(0, cursor - 1);
        setCursor(index);
        setDraft((previous) =>
          [...previous]
            .map((letter, i) =>
              i === index ? guessMask(data.round)[i] : letter,
            )
            .join(""),
        );
        return;
      }
      if (!/^[A-Z0-9]$/.test(key)) return;
      const index = cursor;
      if (index >= data.round.length) return;
      setDraft((previous) =>
        [...previous].map((letter, i) => (i === index ? key : letter)).join(""),
      );
      setCursor(index + 1);
    },
    [busy, cursor, data, expiredSession, retryable, send],
  );

  useEffect(() => {
    const listener = (event) => {
      if (!keyboardEnabled) return;
      if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.target.closest(
          "input, textarea, select, dialog, [contenteditable=true]",
        ) ||
        (event.key === "Enter" && event.target.closest("button"))
      )
        return;
      const key = event.key.toUpperCase();
      if (key === "ENTER" || key === "BACKSPACE" || /^[A-Z0-9]$/.test(key)) {
        event.preventDefault();
        onKey(key);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onKey, keyboardEnabled]);

  return {
    connection,
    data,
    draft,
    cursor,
    busy,
    error,
    retryable,
    expiredSession,
    connect,
    refresh,
    send,
    onKey,
  };
}
