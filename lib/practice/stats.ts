// Progress stats. Signed-in students get them from practice_my_stats();
// signed-out students get the same shape computed from localStorage.

import { supabase } from "@/lib/supabase";
import type { CourseId } from "./courses";
import { localReviewQueue, readLocalSessions } from "./session";

export type UnitStat = { course: CourseId; unit: number; answered: number; correct: number };
export type TopicStat = UnitStat & { topic: string };
export type MockStat = { id: string; course: CourseId; submitted_at: string; score: number; total: number };

export type Stats = {
  answered: number;
  correct: number;
  unique_questions: number;
  by_unit: UnitStat[];
  by_topic: TopicStat[];
  /** ISO dates (yyyy-mm-dd) in the student's time zone, newest first. */
  active_days: string[];
  review_due: Partial<Record<CourseId, number>>;
  mocks: MockStat[];
};

export type BankEntry = { id: string; course: CourseId; unit: number; topic: string };

/** Published question metadata (no answers), for counts and local stats. */
export async function fetchBank(course?: CourseId): Promise<BankEntry[]> {
  const out: BankEntry[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from("practice_questions").select("id, course, unit, topic").eq("status", "published");
    if (course) q = q.eq("course", course);
    const { data, error } = await q.order("id").range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as BankEntry[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function fetchRemoteStats(): Promise<Stats | null> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { data, error } = await supabase.rpc("practice_my_stats", { p_tz: tz });
  if (error) {
    console.error("practice_my_stats", error);
    return null;
  }
  return data as Stats;
}

function localDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeLocalStats(bank: BankEntry[]): Stats {
  const meta = new Map(bank.map((b) => [b.id, b]));
  const sessions = readLocalSessions();
  const unit = new Map<string, UnitStat>();
  const topic = new Map<string, TopicStat>();
  const days = new Set<string>();
  const unique = new Set<string>();
  let answered = 0;
  let correct = 0;

  for (const s of sessions) {
    for (const qid of s.questionIds) {
      const a = s.answers[qid];
      const m = meta.get(qid);
      if (!a?.feedback || !m) continue;
      if (s.mode === "mock" && a.selected === null) continue;
      answered++;
      unique.add(qid);
      if (a.feedback.isCorrect) correct++;
      days.add(localDate(s.submittedAt ?? s.startedAt));
      const uk = `${m.course}:${m.unit}`;
      const u = unit.get(uk) ?? { course: m.course, unit: m.unit, answered: 0, correct: 0 };
      u.answered++;
      if (a.feedback.isCorrect) u.correct++;
      unit.set(uk, u);
      const tk = `${uk}:${m.topic}`;
      const t = topic.get(tk) ?? { course: m.course, unit: m.unit, topic: m.topic, answered: 0, correct: 0 };
      t.answered++;
      if (a.feedback.isCorrect) t.correct++;
      topic.set(tk, t);
    }
  }

  const mocks: MockStat[] = sessions
    .filter((s) => s.mode === "mock" && s.submittedAt && s.score !== null)
    .map((s) => ({
      id: s.id,
      course: s.course,
      submitted_at: s.submittedAt!,
      score: s.score!,
      total: s.questionIds.length,
    }))
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));

  return {
    answered,
    correct,
    unique_questions: unique.size,
    by_unit: [...unit.values()].sort((a, b) => a.course.localeCompare(b.course) || a.unit - b.unit),
    by_topic: [...topic.values()],
    active_days: [...days].sort().reverse(),
    review_due: { micro: localReviewQueue("micro").length, macro: localReviewQueue("macro").length },
    mocks,
  };
}

/** Consecutive days with practice, ending today or yesterday. */
export function currentStreak(activeDays: string[], today = new Date()): number {
  const set = new Set(activeDays);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!set.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(fmt(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function pct(correct: number, answered: number): number | null {
  return answered > 0 ? Math.round((correct / answered) * 100) : null;
}
