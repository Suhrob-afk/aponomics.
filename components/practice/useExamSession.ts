"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cacheSession,
  checkAnswer,
  emptyAnswer,
  fetchQuestions,
  loadSession,
  submitSession,
  syncProgress,
  type AnswerState,
  type SessionState,
} from "@/lib/practice/session";
import type { PublicQuestion } from "@/lib/practice/types";

export type LoadStatus = "loading" | "ready" | "not-found" | "sign-in" | "error";
export type SyncStatus = "idle" | "saving" | "error";

const ANSWER_SYNC_DELAY_MS = 1200;
const TIME_SYNC_DELAY_MS = 15000;
const RETRY_DELAY_MS = 5000;

export function useExamSession(sessionId: string) {
  const [state, setState] = useState<SessionState | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [sync, setSync] = useState<SyncStatus>("idle");
  const [syncAttempt, setSyncAttempt] = useState(0);
  const [busy, setBusy] = useState<null | "checking" | "submitting">(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const stateRef = useRef<SessionState | null>(null);
  const flushingRef = useRef(false);
  const enteredAtRef = useRef<number>(0);

  // ---- Load ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await loadSession(sessionId);
      if (cancelled) return;
      if (!res.ok) {
        setStatus(res.reason);
        return;
      }
      try {
        const qs = await fetchQuestions(res.state.questionIds);
        if (cancelled) return;
        if (qs.length === 0) {
          setStatus("not-found");
          return;
        }
        const s = res.state;
        enteredAtRef.current = Date.now();
        setQuestions(qs);
        setState({ ...s, currentIndex: Math.min(Math.max(0, s.currentIndex), qs.length - 1) });
        setStatus("ready");
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ---- Persist every change locally (autosave) -----------------------------
  useEffect(() => {
    stateRef.current = state;
    if (state) cacheSession(state);
  }, [state]);

  // ---- Remote sync -------------------------------------------------------------
  const flush = useCallback(async () => {
    const snapshot = stateRef.current;
    if (!snapshot || snapshot.storage !== "remote" || snapshot.submittedAt || flushingRef.current) return true;
    if (snapshot.dirty.length === 0 && !snapshot.timeDirty) return true;
    flushingRef.current = true;
    setSync("saving");
    const synced = await syncProgress(snapshot);
    flushingRef.current = false;
    if (synced === null) {
      setSync("error");
      setSyncAttempt((n) => n + 1);
      return false;
    }
    setSync("idle");
    setState((cur) => {
      if (!cur) return cur;
      const dirty = cur.dirty.filter((id) => !synced.includes(id) || cur.answers[id] !== snapshot.answers[id]);
      return { ...cur, dirty, timeDirty: false };
    });
    return true;
  }, []);

  const isRemoteOpen = state?.storage === "remote" && !state.submittedAt;
  const dirtyKey = isRemoteOpen ? state.dirty.join(",") : "";
  const timeDirty = isRemoteOpen ? state.timeDirty : false;

  useEffect(() => {
    if (!dirtyKey && !timeDirty) return;
    const delay = sync === "error" ? RETRY_DELAY_MS : dirtyKey ? ANSWER_SYNC_DELAY_MS : TIME_SYNC_DELAY_MS;
    const t = setTimeout(() => void flush(), delay);
    return () => clearTimeout(t);
  }, [dirtyKey, timeDirty, sync, syncAttempt, flush]);

  // ---- Time on each question -------------------------------------------------
  const questionsRef = useRef<PublicQuestion[]>([]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  /** Seconds since the current question was opened; restarts the stopwatch. */
  const takeElapsed = useCallback((): number => {
    const now = Date.now();
    const elapsed = enteredAtRef.current ? (now - enteredAtRef.current) / 1000 : 0;
    enteredAtRef.current = now;
    return elapsed;
  }, []);

  // Save on tab hide / page unload (best effort; localStorage already has it).
  useEffect(() => {
    if (status !== "ready") return;
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [status, flush]);

  // ---- Mock countdown (pauses while the page is closed) ------------------------
  const timed =
    status === "ready" && state?.mode === "mock" && !state.submittedAt && state.timeRemainingSeconds !== null;

  useEffect(() => {
    if (!timed) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      setState((s) =>
        s && !s.submittedAt && s.timeRemainingSeconds !== null
          ? { ...s, timeRemainingSeconds: Math.max(0, s.timeRemainingSeconds - delta), timeDirty: true }
          : s,
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [timed]);

  // ---- Actions --------------------------------------------------------------
  const current = state ? questions[state.currentIndex] : undefined;
  const currentAnswer: AnswerState = (current && state?.answers[current.id]) || emptyAnswer();
  const locked = Boolean(state?.submittedAt) || Boolean(currentAnswer.feedback) || busy !== null;

  const select = useCallback(
    (option: number) => {
      setState((s) => {
        if (!s || s.submittedAt) return s;
        const q = questionsRef.current[s.currentIndex];
        if (!q) return s;
        const a = s.answers[q.id] ?? emptyAnswer();
        if (a.feedback || a.selected === option) return s;
        return withAnswer(s, q.id, {
          ...a,
          selected: option,
          eliminated: a.eliminated.filter((e) => e !== option),
        });
      });
    },
    [],
  );

  const toggleEliminate = useCallback((option: number) => {
    setState((s) => {
      if (!s || s.submittedAt) return s;
      const q = questionsRef.current[s.currentIndex];
      if (!q) return s;
      const a = s.answers[q.id] ?? emptyAnswer();
      if (a.feedback) return s;
      const isOut = a.eliminated.includes(option);
      return withAnswer(s, q.id, {
        ...a,
        eliminated: isOut ? a.eliminated.filter((e) => e !== option) : [...a.eliminated, option].sort(),
        selected: !isOut && a.selected === option ? null : a.selected,
      });
    });
  }, []);

  const toggleFlag = useCallback(() => {
    setState((s) => {
      if (!s || s.submittedAt) return s;
      const q = questionsRef.current[s.currentIndex];
      if (!q) return s;
      const a = s.answers[q.id] ?? emptyAnswer();
      return withAnswer(s, q.id, { ...a, flagged: !a.flagged });
    });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      setActionError(null);
      const elapsed = takeElapsed();
      setState((s) => {
        if (!s) return s;
        const max = questionsRef.current.length - 1;
        const target = Math.min(Math.max(0, index), max);
        if (target === s.currentIndex) return s;
        return { ...addTime(s, questionsRef.current[s.currentIndex]?.id, elapsed), currentIndex: target };
      });
    },
    [takeElapsed],
  );

  const check = useCallback(async () => {
    const s = stateRef.current;
    const q = s ? questionsRef.current[s.currentIndex] : undefined;
    if (!s || !q || s.mode === "mock" || s.submittedAt) return;
    const a = s.answers[q.id];
    if (!a || a.selected === null || a.feedback) return;
    setBusy("checking");
    setActionError(null);
    try {
      const timed = addTime(s, q.id, takeElapsed());
      const feedback = await checkAnswer(timed, q.id);
      setState((cur) => {
        if (!cur) return cur;
        const latest = cur.answers[q.id] ?? a;
        return withAnswer(cur, q.id, {
          ...latest,
          selected: a.selected,
          timeSpent: timed.answers[q.id]?.timeSpent ?? latest.timeSpent,
          feedback,
        });
      });
    } catch (e) {
      console.error(e);
      setActionError("Couldn't check that answer. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }, [takeElapsed]);

  const submit = useCallback(async (): Promise<boolean> => {
    const s = stateRef.current;
    if (!s) return false;
    if (s.submittedAt) return true;
    setBusy("submitting");
    setActionError(null);
    try {
      const graded = await submitSession(addTime(s, questionsRef.current[s.currentIndex]?.id, takeElapsed()));
      setState(graded);
      return true;
    } catch (e) {
      console.error(e);
      setActionError(
        e instanceof Error && e.message.startsWith("Couldn't")
          ? e.message
          : "Couldn't submit. Your answers are saved on this device; try again in a moment.",
      );
      return false;
    } finally {
      setBusy(null);
    }
  }, [takeElapsed]);

  return {
    status,
    state,
    questions,
    current,
    currentAnswer,
    locked,
    busy,
    sync,
    actionError,
    clearError: () => setActionError(null),
    select,
    toggleEliminate,
    toggleFlag,
    goTo,
    check,
    submit,
    flush,
  };
}

/** Adds time to a question's stopwatch (not after a practice answer is checked). */
function addTime(s: SessionState, qid: string | undefined, seconds: number): SessionState {
  if (!qid || s.submittedAt || seconds <= 0) return s;
  const a = s.answers[qid] ?? emptyAnswer();
  if (a.feedback) return s;
  return withAnswer(s, qid, { ...a, timeSpent: Math.min(86400, a.timeSpent + seconds) });
}

function withAnswer(s: SessionState, qid: string, answer: AnswerState): SessionState {
  return {
    ...s,
    answers: { ...s.answers, [qid]: answer },
    dirty: s.storage === "remote" && !s.dirty.includes(qid) ? [...s.dirty, qid] : s.dirty,
  };
}
