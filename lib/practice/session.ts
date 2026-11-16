// Practice session data layer. One shape (SessionState) for both kinds of
// session:
//   - "local":  signed-out students. Lives only in localStorage; graded with
//               practice_answer_key().
//   - "remote": signed-in students. Lives in Supabase; localStorage is an
//               autosave cache so a refresh never loses work, and `dirty`
//               lists answers not yet synced.

import { supabase } from "@/lib/supabase";
import type { CourseId } from "./courses";
import { readJSON, removeKey, storageKeys, writeJSON, newId } from "./storage";
import { PUBLIC_QUESTION_COLUMNS, type PublicQuestion, type SessionMode } from "./types";

export type Feedback = {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  optionExplanations: string[];
};

export type AnswerState = {
  selected: number | null;
  flagged: boolean;
  eliminated: number[];
  timeSpent: number;
  feedback: Feedback | null;
};

export type SessionState = {
  version: 1;
  id: string;
  storage: "local" | "remote";
  course: CourseId;
  mode: SessionMode;
  unitFilter: number[];
  questionIds: string[];
  startedAt: string;
  submittedAt: string | null;
  timeLimitSeconds: number | null;
  timeRemainingSeconds: number | null;
  currentIndex: number;
  answers: Record<string, AnswerState>;
  score: number | null;
  dirty: string[];
  timeDirty: boolean;
};

/** Summary kept for signed-out students (course progress, dashboard, review). */
export type HistoryEntry = {
  id: string;
  course: CourseId;
  mode: SessionMode;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  total: number;
};

const MAX_LOCAL_HISTORY = 100;

export function emptyAnswer(): AnswerState {
  return { selected: null, flagged: false, eliminated: [], timeSpent: 0, feedback: null };
}

export async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Local cache
// ---------------------------------------------------------------------------

export function readCachedSession(id: string): SessionState | null {
  const s = readJSON<SessionState>(storageKeys.session(id));
  return s && s.version === 1 && s.id === id ? s : null;
}

export function cacheSession(state: SessionState) {
  writeJSON(storageKeys.session(state.id), state);
  if (state.storage === "local") upsertHistory(state);
}

export function readHistory(): HistoryEntry[] {
  return readJSON<HistoryEntry[]>(storageKeys.history) ?? [];
}

function upsertHistory(state: SessionState) {
  const entry: HistoryEntry = {
    id: state.id,
    course: state.course,
    mode: state.mode,
    startedAt: state.startedAt,
    submittedAt: state.submittedAt,
    score: state.score,
    total: state.questionIds.length,
  };
  const history = readHistory().filter((h) => h.id !== state.id);
  history.unshift(entry);
  const kept = history.slice(0, MAX_LOCAL_HISTORY);
  for (const dropped of history.slice(MAX_LOCAL_HISTORY)) removeKey(storageKeys.session(dropped.id));
  writeJSON(storageKeys.history, kept);
}

/** All locally stored sessions for signed-out students, newest first. */
export function readLocalSessions(): SessionState[] {
  return readHistory()
    .map((h) => readCachedSession(h.id))
    .filter((s): s is SessionState => s !== null && s.storage === "local");
}

/**
 * Signed-out review queue: questions whose most recent graded (or flagged)
 * answer was wrong or flagged. Mirrors the SQL in practice_create_session.
 */
export function localReviewQueue(course: CourseId): string[] {
  const latest = new Map<string, { at: string; wrong: boolean; flagged: boolean }>();
  const sessions = readLocalSessions()
    .filter((s) => s.course === course)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const s of sessions) {
    if (s.mode === "mock" && !s.submittedAt) continue;
    for (const qid of s.questionIds) {
      const a = s.answers[qid];
      if (!a || (!a.feedback && !a.flagged)) continue;
      latest.set(qid, {
        at: s.startedAt,
        wrong: a.feedback ? !a.feedback.isCorrect : false,
        flagged: a.flagged,
      });
    }
  }
  return [...latest.entries()].filter(([, v]) => v.wrong || v.flagged).map(([id]) => id);
}

// ---------------------------------------------------------------------------
// Create / load
// ---------------------------------------------------------------------------

type CreateResult = { ok: true; id: string } | { ok: false; error: string };

function newState(
  partial: Pick<SessionState, "id" | "storage" | "course" | "mode" | "unitFilter" | "questionIds" | "timeLimitSeconds">,
): SessionState {
  return {
    version: 1,
    startedAt: new Date().toISOString(),
    submittedAt: null,
    timeRemainingSeconds: partial.timeLimitSeconds,
    currentIndex: 0,
    answers: {},
    score: null,
    dirty: [],
    timeDirty: false,
    ...partial,
  };
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function createSession(opts: {
  course: CourseId;
  mode: SessionMode;
  units: number[];
  count: number;
}): Promise<CreateResult> {
  const userId = await currentUserId();

  if (opts.mode === "review" && !userId) {
    const ids = shuffle(localReviewQueue(opts.course)).slice(0, opts.count);
    if (ids.length === 0) {
      return { ok: false, error: "Nothing to review yet. Questions you miss or flag will appear here." };
    }
    const state = newState({
      id: newId(),
      storage: "local",
      course: opts.course,
      mode: "review",
      unitFilter: [],
      questionIds: ids,
      timeLimitSeconds: null,
    });
    cacheSession(state);
    return { ok: true, id: state.id };
  }

  const { data, error } = await supabase.rpc("practice_create_session", {
    p_course: opts.course,
    p_mode: opts.mode,
    p_units: opts.units,
    p_count: opts.count,
  });
  if (error) {
    console.error("practice_create_session", error);
    return { ok: false, error: "Couldn't start a session. Check your connection and try again." };
  }

  const result = data as { session_id: string | null; question_ids: string[]; time_limit_seconds: number | null };
  if (!result.question_ids?.length) {
    return {
      ok: false,
      error:
        opts.mode === "review"
          ? "Nothing to review yet. Questions you miss or flag will appear here."
          : "No questions are available for this selection yet. Try other units.",
    };
  }

  const state = newState({
    id: result.session_id ?? newId(),
    storage: result.session_id ? "remote" : "local",
    course: opts.course,
    mode: opts.mode,
    unitFilter: opts.units,
    questionIds: result.question_ids,
    timeLimitSeconds: result.time_limit_seconds,
  });
  cacheSession(state);
  return { ok: true, id: state.id };
}

type RemoteSessionRow = {
  id: string;
  course: CourseId;
  mode: SessionMode;
  unit_filter: number[];
  question_ids: string[];
  started_at: string;
  submitted_at: string | null;
  time_limit_seconds: number | null;
  time_remaining_seconds: number | null;
  score: number | null;
};

type RemoteAnswerRow = {
  question_id: string;
  selected_index: number | null;
  flagged: boolean;
  eliminated: number[];
  time_spent_seconds: number;
  is_correct: boolean | null;
};

type KeyRow = {
  question_id: string;
  correct_index: number;
  explanation: string;
  option_explanations: string[];
};

function toFeedback(key: KeyRow, selected: number | null): Feedback {
  return {
    isCorrect: selected !== null && selected === key.correct_index,
    correctIndex: key.correct_index,
    explanation: key.explanation,
    optionExplanations: key.option_explanations,
  };
}

export type LoadResult =
  | { ok: true; state: SessionState }
  | { ok: false; reason: "not-found" | "sign-in" | "error" };

export async function loadSession(id: string): Promise<LoadResult> {
  const cached = readCachedSession(id);
  if (cached?.storage === "local") return { ok: true, state: cached };

  const userId = await currentUserId();
  if (!userId) return { ok: false, reason: cached ? "sign-in" : "not-found" };

  const { data: row, error } = await supabase
    .from("practice_sessions")
    .select(
      "id, course, mode, unit_filter, question_ids, started_at, submitted_at, time_limit_seconds, time_remaining_seconds, score",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("load session", error);
    return cached ? { ok: true, state: cached } : { ok: false, reason: "error" };
  }
  if (!row) return { ok: false, reason: "not-found" };
  const s = row as RemoteSessionRow;

  const [{ data: answerRows }, keys] = await Promise.all([
    supabase
      .from("practice_answers")
      .select("question_id, selected_index, flagged, eliminated, time_spent_seconds, is_correct")
      .eq("session_id", id),
    s.mode !== "mock" || s.submitted_at ? fetchSessionKeys(id) : Promise.resolve([] as KeyRow[]),
  ]);

  const keyById = new Map(keys.map((k) => [k.question_id, k]));
  const answers: Record<string, AnswerState> = {};
  for (const a of (answerRows ?? []) as RemoteAnswerRow[]) {
    const key = keyById.get(a.question_id);
    answers[a.question_id] = {
      selected: a.selected_index,
      flagged: a.flagged,
      eliminated: a.eliminated ?? [],
      timeSpent: a.time_spent_seconds,
      feedback: key && a.is_correct !== null ? toFeedback(key, a.selected_index) : null,
    };
  }

  const state: SessionState = {
    version: 1,
    id: s.id,
    storage: "remote",
    course: s.course,
    mode: s.mode,
    unitFilter: s.unit_filter ?? [],
    questionIds: s.question_ids,
    startedAt: s.started_at,
    submittedAt: s.submitted_at,
    timeLimitSeconds: s.time_limit_seconds,
    timeRemainingSeconds: s.time_remaining_seconds,
    currentIndex: 0,
    answers,
    score: s.score,
    dirty: [],
    timeDirty: false,
  };

  // Overlay unsynced local edits (the cache is written before every sync).
  if (cached && cached.storage === "remote" && !state.submittedAt) {
    state.currentIndex = Math.min(cached.currentIndex, state.questionIds.length - 1);
    for (const qid of cached.dirty) {
      const local = cached.answers[qid];
      if (!local) continue;
      const server = state.answers[qid];
      state.answers[qid] = server?.feedback
        ? { ...server, flagged: local.flagged, eliminated: local.eliminated }
        : { ...local, feedback: null };
    }
    state.dirty = cached.dirty.filter((qid) => state.questionIds.includes(qid));
    if (cached.timeRemainingSeconds !== null && state.timeRemainingSeconds !== null) {
      state.timeRemainingSeconds = Math.min(cached.timeRemainingSeconds, state.timeRemainingSeconds);
      state.timeDirty = cached.timeRemainingSeconds < (s.time_remaining_seconds ?? Infinity);
    }
  }

  cacheSession(state);
  return { ok: true, state };
}

async function fetchSessionKeys(sessionId: string): Promise<KeyRow[]> {
  const { data, error } = await supabase.rpc("practice_session_review", { p_session_id: sessionId });
  if (error) {
    console.error("practice_session_review", error);
    return [];
  }
  return (data ?? []) as KeyRow[];
}

async function fetchAnswerKey(questionIds: string[]): Promise<Map<string, KeyRow>> {
  const out = new Map<string, KeyRow>();
  for (let i = 0; i < questionIds.length; i += 60) {
    const { data, error } = await supabase.rpc("practice_answer_key", {
      p_question_ids: questionIds.slice(i, i + 60),
    });
    if (error) throw error;
    for (const row of (data ?? []) as KeyRow[]) out.set(row.question_id, row);
  }
  return out;
}

export async function fetchQuestions(ids: string[]): Promise<PublicQuestion[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("practice_questions").select(PUBLIC_QUESTION_COLUMNS).in("id", ids);
  if (error) throw error;
  const byId = new Map(((data ?? []) as PublicQuestion[]).map((q) => [q.id, q]));
  return ids.map((id) => byId.get(id)).filter((q): q is PublicQuestion => Boolean(q));
}

// ---------------------------------------------------------------------------
// Grading and sync
// ---------------------------------------------------------------------------

/** Instant feedback for practice/review mode. Never called for mocks. */
export async function checkAnswer(state: SessionState, questionId: string): Promise<Feedback> {
  const answer = state.answers[questionId];
  if (!answer || answer.selected === null) throw new Error("No option selected");
  if (state.mode === "mock") throw new Error("Mock answers are graded on submit");

  if (state.storage === "local") {
    const key = (await fetchAnswerKey([questionId])).get(questionId);
    if (!key) throw new Error("Question unavailable");
    return toFeedback(key, answer.selected);
  }

  const { data, error } = await supabase.rpc("practice_answer_question", {
    p_session_id: state.id,
    p_question_id: questionId,
    p_selected_index: answer.selected,
    p_flagged: answer.flagged,
    p_eliminated: answer.eliminated,
    p_time_spent_seconds: Math.round(answer.timeSpent),
  });
  if (error) throw error;
  const r = data as {
    selected_index: number;
    is_correct: boolean;
    correct_index: number;
    explanation: string;
    option_explanations: string[];
  };
  return {
    isCorrect: r.is_correct,
    correctIndex: r.correct_index,
    explanation: r.explanation,
    optionExplanations: r.option_explanations,
  };
}

/** Pushes unsynced answers and remaining time. Returns the ids that were synced. */
export async function syncProgress(state: SessionState): Promise<string[] | null> {
  if (state.storage !== "remote" || state.submittedAt) return [];
  if (state.dirty.length === 0 && !state.timeDirty) return [];
  const payload = state.dirty
    .map((qid) => {
      const a = state.answers[qid];
      return a
        ? {
            question_id: qid,
            selected_index: a.selected,
            flagged: a.flagged,
            eliminated: a.eliminated,
            time_spent_seconds: Math.round(a.timeSpent),
          }
        : null;
    })
    .filter(Boolean);
  const { error } = await supabase.rpc("practice_save_progress", {
    p_session_id: state.id,
    p_answers: payload,
    p_time_remaining_seconds:
      state.timeRemainingSeconds === null ? null : Math.max(0, Math.ceil(state.timeRemainingSeconds)),
  });
  if (error) {
    console.error("practice_save_progress", error);
    return null;
  }
  return state.dirty;
}

/** Finishes the session and returns the graded state. */
export async function submitSession(state: SessionState): Promise<SessionState> {
  const submittedAt = new Date().toISOString();

  if (state.storage === "local") {
    const ids =
      state.mode === "mock"
        ? state.questionIds
        : state.questionIds.filter((id) => state.answers[id]?.selected != null && !state.answers[id]?.feedback);
    const keys = ids.length ? await fetchAnswerKey(ids) : new Map<string, KeyRow>();
    const answers = { ...state.answers };
    for (const id of ids) {
      const key = keys.get(id);
      if (!key) continue;
      const a = answers[id] ?? emptyAnswer();
      answers[id] = { ...a, feedback: toFeedback(key, a.selected) };
    }
    const score = Object.values(answers).filter((a) => a.feedback?.isCorrect).length;
    const next = { ...state, answers, submittedAt, score, dirty: [], timeDirty: false };
    cacheSession(next);
    return next;
  }

  const synced = await syncProgress(state);
  if (synced === null) throw new Error("Couldn't save your answers. Check your connection and try again.");
  const { data, error } = await supabase.rpc("practice_submit_session", { p_session_id: state.id });
  if (error) throw error;
  const result = data as { score: number };
  const reloaded = await loadSession(state.id);
  if (reloaded.ok) return reloaded.state;
  const next = { ...state, submittedAt, score: result.score, dirty: [], timeDirty: false };
  cacheSession(next);
  return next;
}
