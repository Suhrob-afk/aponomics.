"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, LoaderCircle, RotateCcw, Timer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  COURSES,
  MOCK_QUESTION_COUNT,
  SECONDS_PER_MOCK_QUESTION,
  type CourseId,
} from "@/lib/practice/courses";
import { createSession, currentUserId, readLocalSessions } from "@/lib/practice/session";
import { computeLocalStats, fetchBank, fetchRemoteStats, pct, type BankEntry, type Stats } from "@/lib/practice/stats";
import type { SessionMode } from "@/lib/practice/types";
import { Dialog } from "./Dialog";

const COUNTS = [5, 10, 20, 30];

type InProgress = {
  id: string;
  mode: SessionMode;
  unitFilter: number[];
  total: number;
  startedAt: string;
  timeRemaining: number | null;
};

export function CourseHome({ course }: { course: CourseId }) {
  const router = useRouter();
  const info = COURSES[course];

  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [bank, setBank] = useState<BankEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [inProgress, setInProgress] = useState<InProgress[]>([]);
  const [units, setUnits] = useState<number[]>([]);
  const [count, setCount] = useState(10);
  const [starting, setStarting] = useState<SessionMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mockOpen, setMockOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [uid, b] = await Promise.all([currentUserId(), fetchBank(course)]);
        if (cancelled) return;
        setSignedIn(Boolean(uid));
        setBank(b);
        if (uid) {
          const [s, { data }] = await Promise.all([
            fetchRemoteStats(),
            supabase
              .from("practice_sessions")
              .select("id, mode, unit_filter, question_ids, started_at, time_remaining_seconds")
              .eq("course", course)
              .is("submitted_at", null)
              .order("started_at", { ascending: false })
              .limit(5),
          ]);
          if (cancelled) return;
          setStats(s);
          setInProgress(
            (data ?? []).map((r) => ({
              id: r.id as string,
              mode: r.mode as SessionMode,
              unitFilter: (r.unit_filter as number[]) ?? [],
              total: (r.question_ids as string[]).length,
              startedAt: r.started_at as string,
              timeRemaining: r.time_remaining_seconds as number | null,
            })),
          );
        } else {
          setStats(computeLocalStats(b));
          setInProgress(
            readLocalSessions()
              .filter((s) => s.course === course && !s.submittedAt)
              .slice(0, 5)
              .map((s) => ({
                id: s.id,
                mode: s.mode,
                unitFilter: s.unitFilter,
                total: s.questionIds.length,
                startedAt: s.startedAt,
                timeRemaining: s.timeRemainingSeconds,
              })),
          );
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Couldn't load the question bank. Check your connection and refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [course]);

  const bankByUnit = useMemo(() => {
    const m = new Map<number, number>();
    for (const b of bank) m.set(b.unit, (m.get(b.unit) ?? 0) + 1);
    return m;
  }, [bank]);

  const unitStats = useMemo(() => {
    const m = new Map<number, { answered: number; correct: number }>();
    for (const u of stats?.by_unit ?? []) if (u.course === course) m.set(u.unit, u);
    return m;
  }, [stats, course]);

  const reviewDue = stats?.review_due?.[course] ?? 0;
  const mockSize = Math.min(MOCK_QUESTION_COUNT, bank.length);
  const mockMinutes = Math.round((mockSize >= MOCK_QUESTION_COUNT ? 70 * 60 : mockSize * SECONDS_PER_MOCK_QUESTION) / 60);
  const selectedAvailable = units.reduce((sum, u) => sum + (bankByUnit.get(u) ?? 0), 0);

  async function start(mode: SessionMode) {
    setStarting(mode);
    setError(null);
    const res = await createSession({
      course,
      mode,
      units: mode === "practice" ? units : [],
      count: mode === "mock" ? MOCK_QUESTION_COUNT : mode === "review" ? 20 : count,
    });
    if (!res.ok) {
      setError(res.error);
      setStarting(null);
      setMockOpen(false);
      return;
    }
    router.push(`/practice/${course}/session/${res.id}`);
  }

  const toggleUnit = (n: number) =>
    setUnits((cur) => (cur.includes(n) ? cur.filter((u) => u !== n) : [...cur, n].sort()));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="text-[14px] text-[#5F5A4E]">
        <Link href="/practice" className="hover:text-[#1A1A1A]">
          Practice
        </Link>
        <ChevronRight className="mx-1 inline h-3.5 w-3.5" aria-hidden />
        <span aria-current="page">{info.shortTitle}</span>
      </nav>

      <header className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-4xl tracking-tight md:text-5xl">{info.title}</h1>
          <p className="mt-2 text-[15px] text-[#4A4639]" aria-live="polite">
            {loading ? "Loading the question bank…" : `${bank.length} published question${bank.length === 1 ? "" : "s"}`}
            {!loading && !signedIn && (
              <>
                {" · "}
                <Link href="/signin" className="underline decoration-[#B9B2A2] underline-offset-4 hover:text-[#1A1A1A]">
                  Sign in
                </Link>{" "}
                to save progress across devices
              </>
            )}
          </p>
        </div>
        <Link
          href="/practice/dashboard"
          className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#0F5C4A] hover:underline"
        >
          Your progress <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </header>

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-[#D9B3B3] bg-[#FDF6F6] px-4 py-3 text-[15px] text-[#7F1D1D]">
          {error}
        </p>
      )}

      {!loading && !error && bank.length === 0 && (
        <p role="status" className="mt-6 rounded-xl border border-[#D6D0C4] bg-[#FFFDF8] px-4 py-3 text-[15px] text-[#3A372E]">
          Questions for this course are being written and reviewed. Check back soon, or try the other course.
        </p>
      )}

      {inProgress.length > 0 && (
        <section aria-labelledby="resume-heading" className="mt-8 rounded-2xl border border-[#0F5C4A]/30 bg-[#EEF5F1] p-5">
          <h2 id="resume-heading" className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#0F5C4A]">
            Pick up where you left off
          </h2>
          <ul className="mt-3 divide-y divide-[#0F5C4A]/15">
            {inProgress.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-[15px]">
                  {s.mode === "mock"
                    ? "Timed mock"
                    : s.mode === "review"
                      ? "Review mistakes"
                      : s.unitFilter.length
                        ? `Unit${s.unitFilter.length > 1 ? "s" : ""} ${s.unitFilter.join(", ")}`
                        : "Mixed practice"}
                  <span className="text-[#4A4639]">
                    {" · "}
                    {s.total} questions · started {new Date(s.startedAt).toLocaleDateString()}
                    {s.mode === "mock" && s.timeRemaining !== null && ` · ${Math.ceil(s.timeRemaining / 60)} min left`}
                  </span>
                </span>
                <Link
                  href={`/practice/${course}/session/${s.id}`}
                  className="shrink-0 rounded-full bg-[#0F5C4A] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#0B4A3B]"
                >
                  Resume
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        {/* ---- Practice by unit ---- */}
        <section aria-labelledby="units-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="units-heading" className="font-serif text-3xl tracking-tight">
                Practice by unit
              </h2>
              <p className="mt-1 text-[15px] text-[#4A4639]">Untimed, with an explanation after every answer.</p>
            </div>
            <button
              type="button"
              onClick={() => setUnits(units.length === info.units.length ? [] : info.units.map((u) => u.number))}
              className="shrink-0 text-[14px] font-semibold text-[#0F5C4A] hover:underline"
            >
              {units.length === info.units.length ? "Clear all" : "Select all"}
            </button>
          </div>

          <fieldset className="mt-5">
            <legend className="sr-only">Units to include</legend>
            <ul className="space-y-2.5">
              {info.units.map((u) => {
                const st = unitStats.get(u.number);
                const accuracy = st ? pct(st.correct, st.answered) : null;
                const available = bankByUnit.get(u.number) ?? 0;
                const checked = units.includes(u.number);
                return (
                  <li key={u.number}>
                    <label
                      className={[
                        "flex cursor-pointer items-center gap-4 rounded-xl border-2 bg-[#FFFDF8] px-4 py-3.5 transition",
                        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0F5C4A] has-[:focus-visible]:ring-offset-2",
                        checked ? "border-[#0F5C4A]" : "border-[#E2DDD2] hover:border-[#B9B2A2]",
                        available === 0 && !loading ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUnit(u.number)}
                        className="h-5 w-5 shrink-0 accent-[#0F5C4A]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold">
                          Unit {u.number}: {u.title}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-[#5F5A4E]">
                          {loading ? "…" : `${available} question${available === 1 ? "" : "s"}`}
                          {st && st.answered > 0 && ` · ${st.answered} answered · ${accuracy}% correct`}
                        </span>
                        {st && st.answered > 0 && (
                          <span
                            className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#E2DDD2]"
                            role="img"
                            aria-label={`${accuracy}% correct in unit ${u.number}`}
                          >
                            <span className="block h-full rounded-full bg-[#0F5C4A]" style={{ width: `${accuracy}%` }} />
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-[14px] font-semibold">Number of questions</legend>
            <div className="mt-2 inline-flex rounded-full border border-[#D6D0C4] bg-[#FFFDF8] p-1">
              {COUNTS.map((n) => (
                <label
                  key={n}
                  className={[
                    "cursor-pointer rounded-full px-4 py-1.5 text-[14px] font-semibold tabular-nums transition",
                    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0F5C4A]",
                    count === n ? "bg-[#1A1A1A] text-white" : "text-[#3A372E] hover:bg-[#EDE8DC]",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="count"
                    value={n}
                    checked={count === n}
                    onChange={() => setCount(n)}
                    className="sr-only"
                  />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => void start("practice")}
              disabled={units.length === 0 || selectedAvailable === 0 || starting !== null}
              className="inline-flex items-center gap-2 rounded-full bg-[#0F5C4A] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#0B4A3B] disabled:cursor-not-allowed disabled:bg-[#9DB5AB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A] focus-visible:ring-offset-2"
            >
              {starting === "practice" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
              Start practice
            </button>
            <p className="text-[14px] text-[#5F5A4E]">
              {units.length === 0
                ? "Choose at least one unit."
                : selectedAvailable < count
                  ? `Only ${selectedAvailable} question${selectedAvailable === 1 ? "" : "s"} available in the selected unit${units.length === 1 ? "" : "s"}.`
                  : `${count} questions from ${units.length === 1 ? `unit ${units[0]}` : `${units.length} units`}.`}
            </p>
          </div>
        </section>

        {/* ---- Mock + review ---- */}
        <aside className="space-y-6">
          <section aria-labelledby="mock-heading" className="rounded-2xl border border-[#D6D0C4] bg-[#FFFDF8] p-6">
            <Timer className="h-6 w-6 text-[#0F5C4A]" aria-hidden />
            <h2 id="mock-heading" className="mt-3 font-serif text-2xl">
              Timed mock exam
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#4A4639]">
              {MOCK_QUESTION_COUNT} questions across all six units in 70 minutes, like the real multiple-choice section.
              Results and explanations appear after you submit.
            </p>
            {!loading && bank.length > 0 && bank.length < MOCK_QUESTION_COUNT && (
              <p className="mt-3 rounded-lg bg-[#FBF1E2] px-3 py-2 text-[13px] text-[#6B3F0E]">
                The bank has {bank.length} published questions so far, so this mock will have {mockSize} questions and{" "}
                {mockMinutes} minutes.
              </p>
            )}
            <button
              type="button"
              onClick={() => setMockOpen(true)}
              disabled={loading || bank.length === 0 || starting !== null}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-3 text-[15px] font-semibold text-white hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start mock
            </button>
          </section>

          <section aria-labelledby="review-heading" className="rounded-2xl border border-[#D6D0C4] bg-[#FFFDF8] p-6">
            <RotateCcw className="h-6 w-6 text-[#0F5C4A]" aria-hidden />
            <h2 id="review-heading" className="mt-3 font-serif text-2xl">
              Review mistakes
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#4A4639]">
              {loading
                ? "Checking your history…"
                : reviewDue > 0
                  ? `${reviewDue} question${reviewDue === 1 ? "" : "s"} you missed or marked for review. Get one right to clear it.`
                  : "Questions you miss or mark for review will collect here."}
            </p>
            <button
              type="button"
              onClick={() => void start("review")}
              disabled={loading || reviewDue === 0 || starting !== null}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#1A1A1A] px-5 py-3 text-[15px] font-semibold hover:bg-[#1A1A1A] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[#1A1A1A]"
            >
              {starting === "review" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
              Review {reviewDue > 20 ? "20 questions" : reviewDue > 0 ? `${reviewDue} question${reviewDue === 1 ? "" : "s"}` : ""}
            </button>
          </section>
        </aside>
      </div>

      <Dialog
        open={mockOpen}
        onClose={() => setMockOpen(false)}
        title="Before you start"
        description={`${mockSize} questions, ${mockMinutes} minutes.`}
      >
        <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[#3A372E]">
          <li>The timer counts down while this page is open. If you close it, the clock pauses until you come back.</li>
          <li>You won&apos;t see correct answers until you submit.</li>
          <li>Mark questions for review, cross out choices, and use the question list to jump around.</li>
          <li>When time runs out, your answers are submitted automatically.</li>
          {!signedIn && <li>You&apos;re not signed in, so your answers are saved in this browser only.</li>}
        </ul>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setMockOpen(false)}
            className="rounded-full border border-[#1A1A1A] px-5 py-2.5 text-sm font-semibold"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => void start("mock")}
            disabled={starting !== null}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F5C4A] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {starting === "mock" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            Begin mock
          </button>
        </div>
      </Dialog>
    </main>
  );
}
