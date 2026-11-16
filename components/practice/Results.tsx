"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { COURSES, type CourseId } from "@/lib/practice/courses";
import { createSession, emptyAnswer, fetchQuestions, loadSession, type SessionState } from "@/lib/practice/session";
import type { PublicQuestion } from "@/lib/practice/types";
import { formatClock } from "./ExamSession";
import { NavigatorGrid, NavigatorLegend } from "./NavigatorGrid";
import { QuestionPanel } from "./QuestionPanel";

type Filter = "all" | "incorrect" | "flagged";

export function Results({ course, sessionId }: { course: CourseId; sessionId: string }) {
  const router = useRouter();
  const [state, setState] = useState<SessionState | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await loadSession(sessionId);
      if (cancelled) return;
      if (!res.ok) {
        setStatus(res.reason === "error" ? "error" : "missing");
        return;
      }
      if (!res.state.submittedAt) {
        router.replace(`/practice/${res.state.course}/session/${sessionId}`);
        return;
      }
      try {
        const qs = await fetchQuestions(res.state.questionIds);
        if (cancelled) return;
        setState(res.state);
        setQuestions(qs);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  const graded = useMemo(
    () => (state ? questions.filter((q) => state.answers[q.id]?.feedback) : []),
    [state, questions],
  );

  const visible = useMemo(() => {
    if (!state) return [];
    return questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => {
        const a = state.answers[q.id];
        if (filter === "incorrect") return a?.feedback ? !a.feedback.isCorrect : false;
        if (filter === "flagged") return Boolean(a?.flagged);
        return true;
      });
  }, [state, questions, filter]);

  const byUnit = useMemo(() => {
    const m = new Map<number, { total: number; correct: number }>();
    if (!state) return m;
    for (const q of graded) {
      const u = m.get(q.unit) ?? { total: 0, correct: 0 };
      u.total++;
      if (state.answers[q.id]?.feedback?.isCorrect) u.correct++;
      m.set(q.unit, u);
    }
    return m;
  }, [state, graded]);

  if (status !== "ready" || !state) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        {status === "loading" ? (
          <p role="status" className="flex items-center gap-3 text-[#4A4639]">
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> Loading results…
          </p>
        ) : (
          <>
            <h1 className="font-serif text-3xl">{status === "missing" ? "Results not found" : "Something went wrong"}</h1>
            <p className="mt-3 text-[15px] text-[#4A4639]">
              {status === "missing"
                ? "These results don't exist, belong to another account, or were saved in a different browser."
                : "We couldn't load these results. Check your connection and refresh."}
            </p>
            <Link href={`/practice/${course}`} className="mt-6 rounded-full border border-[#1A1A1A] px-5 py-2.5 text-sm font-semibold">
              Back to practice
            </Link>
          </>
        )}
      </main>
    );
  }

  const info = COURSES[state.course];
  const isMock = state.mode === "mock";
  const correct = graded.filter((q) => state.answers[q.id]?.feedback?.isCorrect).length;
  const denominator = isMock ? questions.length : graded.length;
  const percent = denominator ? Math.round((correct / denominator) * 100) : 0;
  const timeUsed =
    isMock && state.timeLimitSeconds !== null && state.timeRemainingSeconds !== null
      ? state.timeLimitSeconds - state.timeRemainingSeconds
      : questions.reduce((s, q) => s + (state.answers[q.id]?.timeSpent ?? 0), 0);
  const missed = graded.filter((q) => !state.answers[q.id]?.feedback?.isCorrect).length;
  const flaggedCount = questions.filter((q) => state.answers[q.id]?.flagged).length;

  const current = visible.find((v) => v.i === selected) ?? visible[0];
  const position = current ? visible.indexOf(current) : -1;

  async function practiceMistakes() {
    setStarting(true);
    setStartError(null);
    const res = await createSession({ course: state!.course, mode: "review", units: [], count: 20 });
    if (res.ok) router.push(`/practice/${state!.course}/session/${res.id}`);
    else {
      setStartError(res.error);
      setStarting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="text-[14px] text-[#5F5A4E]">
        <Link href="/practice" className="hover:text-[#1A1A1A]">Practice</Link>
        <ChevronRight className="mx-1 inline h-3.5 w-3.5" aria-hidden />
        <Link href={`/practice/${state.course}`} className="hover:text-[#1A1A1A]">{info.shortTitle}</Link>
        <ChevronRight className="mx-1 inline h-3.5 w-3.5" aria-hidden />
        <span aria-current="page">Results</span>
      </nav>

      <header className="mt-4">
        <p className="text-[12px] uppercase tracking-[0.2em] text-[#0F5C4A]">
          {isMock ? "Timed mock" : state.mode === "review" ? "Review mistakes" : "Practice"} ·{" "}
          {new Date(state.submittedAt!).toLocaleDateString(undefined, { dateStyle: "medium" })}
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">{info.title} results</h1>
      </header>

      <section aria-label="Summary" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Score" value={`${correct} / ${denominator}`} sub={`${percent}% correct`} accent />
        <Stat
          label={isMock ? "Time used" : "Time on questions"}
          value={formatClock(timeUsed)}
          sub={isMock && state.timeLimitSeconds ? `of ${formatClock(state.timeLimitSeconds)}` : undefined}
        />
        <Stat
          label="Missed"
          value={String(missed)}
          sub={isMock ? `${questions.filter((q) => state.answers[q.id]?.selected == null).length} left blank` : undefined}
        />
        <Stat label="Marked for review" value={String(flaggedCount)} />
      </section>

      {byUnit.size > 0 && (
        <section aria-labelledby="units-heading" className="mt-10">
          <h2 id="units-heading" className="font-serif text-2xl">By unit</h2>
          <ul className="mt-4 space-y-3">
            {[...byUnit.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([unit, u]) => {
                const p = Math.round((u.correct / u.total) * 100);
                return (
                  <li key={unit} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[16rem_minmax(0,1fr)_5rem]">
                    <span className="truncate text-[15px]">
                      Unit {unit}: {info.units[unit - 1]?.title}
                    </span>
                    <span className="text-right text-[14px] tabular-nums text-[#4A4639] sm:order-last">
                      {u.correct}/{u.total}
                    </span>
                    <span className="col-span-2 h-2 overflow-hidden rounded-full bg-[#E2DDD2] sm:col-span-1" role="img" aria-label={`${p}% correct`}>
                      <span className="block h-full rounded-full bg-[#0F5C4A]" style={{ width: `${p}%` }} />
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {missed + flaggedCount > 0 && (
          <button
            type="button"
            onClick={() => void practiceMistakes()}
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-full bg-[#0F5C4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0B4A3B] disabled:opacity-60"
          >
            {starting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            Practice my mistakes
          </button>
        )}
        <Link href={`/practice/${state.course}`} className="rounded-full border border-[#1A1A1A] px-5 py-2.5 text-sm font-semibold hover:bg-[#1A1A1A] hover:text-white">
          New session
        </Link>
        <Link href="/practice/dashboard" className="rounded-full border border-[#1A1A1A] px-5 py-2.5 text-sm font-semibold hover:bg-[#1A1A1A] hover:text-white">
          Dashboard
        </Link>
      </div>
      {startError && <p role="alert" className="mt-3 text-[14px] text-[#7F1D1D]">{startError}</p>}

      <section aria-labelledby="review-heading" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="review-heading" className="font-serif text-3xl tracking-tight">Review every question</h2>
          <div role="group" aria-label="Filter questions" className="inline-flex rounded-full border border-[#D6D0C4] bg-[#FFFDF8] p-1">
            {(
              [
                ["all", `All (${questions.length})`],
                ["incorrect", `Missed (${missed})`],
                ["flagged", `Marked (${flaggedCount})`],
              ] as [Filter, string][]
            ).map(([f, label]) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-[14px] font-semibold ${filter === f ? "bg-[#1A1A1A] text-white" : "text-[#3A372E] hover:bg-[#EDE8DC]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#D6D0C4] bg-[#FFFDF8] p-5">
          <NavigatorLegend showResults />
          <div className="mt-5 pt-2">
            <NavigatorGrid
              questionIds={questions.map((q) => q.id)}
              answers={state.answers}
              currentIndex={current?.i}
              showResults
              onSelect={(i) => {
                setFilter("all");
                setSelected(i);
              }}
            />
          </div>
        </div>

        {current ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#D6D0C4] bg-[#F7F4EC]">
            <QuestionPanel
              key={current.q.id}
              question={current.q}
              number={current.i + 1}
              answer={state.answers[current.q.id] ?? emptyAnswer()}
              showTopic
              locked
              readOnly
            />
            <div className="flex items-center justify-between border-t border-[#D6D0C4] px-5 py-3">
              <button
                type="button"
                disabled={position <= 0}
                onClick={() => setSelected(visible[position - 1].i)}
                className="inline-flex items-center gap-1 rounded-full border border-[#1A1A1A] px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
              </button>
              <span className="text-[14px] tabular-nums text-[#4A4639]">
                {position + 1} of {visible.length}
              </span>
              <button
                type="button"
                disabled={position >= visible.length - 1}
                onClick={() => setSelected(visible[position + 1].i)}
                className="inline-flex items-center gap-1 rounded-full bg-[#0F5C4A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-[15px] text-[#4A4639]">No questions match this filter.</p>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-[#0F5C4A] bg-[#EEF5F1]" : "border-[#D6D0C4] bg-[#FFFDF8]"}`}>
      <p className="text-[12px] uppercase tracking-[0.16em] text-[#5F5A4E]">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${accent ? "text-[#0F5C4A]" : ""}`}>{value}</p>
      {sub && <p className="mt-1 text-[13px] text-[#4A4639]">{sub}</p>}
    </div>
  );
}
