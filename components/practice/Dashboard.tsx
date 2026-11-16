"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Flame, LoaderCircle, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { COURSES, COURSE_IDS, getUnit, type CourseId } from "@/lib/practice/courses";
import { currentUserId, readLocalSessions } from "@/lib/practice/session";
import {
  computeLocalStats,
  currentStreak,
  fetchBank,
  fetchRemoteStats,
  pct,
  type MockStat,
  type Stats,
} from "@/lib/practice/stats";
import type { SessionMode } from "@/lib/practice/types";

type Scope = "all" | CourseId;

type RecentSession = {
  id: string;
  course: CourseId;
  mode: SessionMode;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  total: number;
};

const MODE_LABEL: Record<SessionMode, string> = {
  practice: "Unit practice",
  mock: "Timed mock",
  review: "Review mistakes",
};

export function Dashboard() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [signedIn, setSignedIn] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentSession[]>([]);
  const [scope, setScope] = useState<Scope>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = await currentUserId();
        if (cancelled) return;
        setSignedIn(Boolean(uid));
        if (uid) {
          const [s, { data }] = await Promise.all([
            fetchRemoteStats(),
            supabase
              .from("practice_sessions")
              .select("id, course, mode, started_at, submitted_at, score, question_ids")
              .order("started_at", { ascending: false })
              .limit(12),
          ]);
          if (cancelled) return;
          if (!s) throw new Error("stats unavailable");
          setStats(s);
          setRecent(
            (data ?? []).map((r) => ({
              id: r.id as string,
              course: r.course as CourseId,
              mode: r.mode as SessionMode,
              startedAt: r.started_at as string,
              submittedAt: r.submitted_at as string | null,
              score: r.score as number | null,
              total: (r.question_ids as string[]).length,
            })),
          );
        } else {
          const bank = await fetchBank();
          if (cancelled) return;
          setStats(computeLocalStats(bank));
          setRecent(
            readLocalSessions()
              .slice(0, 12)
              .map((s) => ({
                id: s.id,
                course: s.course,
                mode: s.mode,
                startedAt: s.startedAt,
                submittedAt: s.submittedAt,
                score: s.score,
                total: s.questionIds.length,
              })),
          );
        }
        setStatus("ready");
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useMemo(() => {
    if (!stats) return null;
    const inScope = <T extends { course: CourseId }>(rows: T[]) =>
      scope === "all" ? rows : rows.filter((r) => r.course === scope);
    const units = inScope(stats.by_unit);
    const answered = units.reduce((s, u) => s + u.answered, 0);
    const correct = units.reduce((s, u) => s + u.correct, 0);
    const weakest = inScope(stats.by_topic)
      .filter((t) => t.answered >= 3)
      .map((t) => ({ ...t, accuracy: t.correct / t.answered }))
      .sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered)
      .slice(0, 5);
    return {
      units,
      answered,
      correct,
      weakest,
      mocks: inScope(stats.mocks),
      recent: inScope(recent),
    };
  }, [stats, recent, scope]);

  if (status === "loading") {
    return (
      <p role="status" className="mt-16 flex items-center gap-3 text-[#4A4639]">
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> Loading your progress…
      </p>
    );
  }
  if (status === "error" || !stats || !view) {
    return (
      <p role="alert" className="mt-10 rounded-xl border border-[#D9B3B3] bg-[#FDF6F6] px-4 py-3 text-[15px] text-[#7F1D1D]">
        We couldn&apos;t load your progress. Check your connection and refresh.
      </p>
    );
  }

  const streak = currentStreak(stats.active_days);
  const accuracy = pct(view.correct, view.answered);
  const bestMock = view.mocks.reduce<MockStat | null>(
    (best, m) => (!best || m.score / m.total > best.score / best.total ? m : best),
    null,
  );
  const empty = stats.answered === 0 && recent.length === 0;

  return (
    <div className="mt-8">
      {!signedIn && (
        <p className="rounded-xl border border-[#D6D0C4] bg-[#FFFDF8] px-4 py-3 text-[15px] text-[#3A372E]">
          You&apos;re not signed in, so this shows practice saved in this browser.{" "}
          <Link href="/signin" className="font-semibold text-[#0F5C4A] underline underline-offset-4">
            Sign in
          </Link>{" "}
          to keep your history across devices.
        </p>
      )}

      {empty ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#B9B2A2] px-6 py-14 text-center">
          <h2 className="font-serif text-3xl">Nothing here yet</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[#4A4639]">
            Answer a few questions and your accuracy by unit, weakest topics, streak and mock scores will show up here.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {COURSE_IDS.map((c) => (
              <Link
                key={c}
                href={`/practice/${c}`}
                className="rounded-full bg-[#0F5C4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0B4A3B]"
              >
                {COURSES[c].shortTitle}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div role="group" aria-label="Course" className="mt-8 inline-flex rounded-full border border-[#D6D0C4] bg-[#FFFDF8] p-1">
            {(["all", ...COURSE_IDS] as Scope[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={scope === s}
                onClick={() => setScope(s)}
                className={`rounded-full px-4 py-1.5 text-[14px] font-semibold ${scope === s ? "bg-[#1A1A1A] text-white" : "text-[#3A372E] hover:bg-[#EDE8DC]"}`}
              >
                {s === "all" ? "Both courses" : COURSES[s].shortTitle}
              </button>
            ))}
          </div>

          <section aria-label="Summary" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Questions answered" value={view.answered.toLocaleString()} />
            <Tile label="Accuracy" value={accuracy === null ? "–" : `${accuracy}%`} sub={`${view.correct} correct`} />
            <Tile
              label="Day streak"
              value={String(streak)}
              sub={streak > 0 ? "Keep it going" : "Practice today to start one"}
              icon={<Flame className="h-5 w-5 text-[#9A5B13]" aria-hidden />}
            />
            <Tile
              label="Mocks taken"
              value={String(view.mocks.length)}
              sub={bestMock ? `Best ${bestMock.score}/${bestMock.total}` : undefined}
            />
          </section>

          <div className="mt-12 grid gap-12 lg:grid-cols-2">
            <section aria-labelledby="unit-acc">
              <h2 id="unit-acc" className="font-serif text-2xl">Accuracy by unit</h2>
              {(scope === "all" ? COURSE_IDS : [scope]).map((c) => (
                <UnitBars key={c} course={c} units={view.units.filter((u) => u.course === c)} showCourse={scope === "all"} />
              ))}
            </section>

            <section aria-labelledby="mock-scores">
              <h2 id="mock-scores" className="font-serif text-2xl">Mock scores over time</h2>
              {view.mocks.length === 0 ? (
                <p className="mt-4 text-[15px] text-[#4A4639]">
                  Take a timed mock to start tracking your scores.
                </p>
              ) : (
                <MockChart mocks={view.mocks} />
              )}

              <h2 className="mt-12 font-serif text-2xl">Weakest topics</h2>
              {view.weakest.length === 0 ? (
                <p className="mt-4 text-[15px] text-[#4A4639]">
                  Answer at least 3 questions in a topic to see how it compares.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-[#E2DDD2] rounded-2xl border border-[#D6D0C4] bg-[#FFFDF8]">
                  {view.weakest.map((t) => (
                    <li key={`${t.course}-${t.unit}-${t.topic}`} className="flex items-center gap-4 px-4 py-3">
                      <Target className="h-5 w-5 shrink-0 text-[#9B2C2C]" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">{t.topic}</p>
                        <p className="text-[13px] text-[#5F5A4E]">
                          {COURSES[t.course].shortTitle} · Unit {t.unit} · {t.correct}/{t.answered} correct
                        </p>
                      </div>
                      <span className="text-[15px] font-semibold tabular-nums">{Math.round(t.accuracy * 100)}%</span>
                      <Link
                        href={`/practice/${t.course}`}
                        className="shrink-0 text-[14px] font-semibold text-[#0F5C4A] hover:underline"
                        aria-label={`Practice ${COURSES[t.course].shortTitle} unit ${t.unit}`}
                      >
                        Practice
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section aria-labelledby="recent" className="mt-12">
            <h2 id="recent" className="font-serif text-2xl">Recent sessions</h2>
            {view.recent.length === 0 ? (
              <p className="mt-4 text-[15px] text-[#4A4639]">No sessions yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[#E2DDD2] rounded-2xl border border-[#D6D0C4] bg-[#FFFDF8]">
                {view.recent.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-[15px] font-semibold">
                        {MODE_LABEL[s.mode]} · {COURSES[s.course].shortTitle}
                      </p>
                      <p className="text-[13px] text-[#5F5A4E]">
                        {new Date(s.startedAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · {s.total} questions
                        {s.submittedAt && s.score !== null && ` · ${s.score} correct`}
                      </p>
                    </div>
                    <Link
                      href={`/practice/${s.course}/${s.submittedAt ? "results" : "session"}/${s.id}`}
                      className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#0F5C4A] hover:underline"
                    >
                      {s.submittedAt ? "Review" : "Resume"} <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#D6D0C4] bg-[#FFFDF8] p-5">
      <p className="flex items-center justify-between text-[12px] uppercase tracking-[0.16em] text-[#5F5A4E]">
        {label}
        {icon}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[13px] text-[#4A4639]">{sub}</p>}
    </div>
  );
}

function UnitBars({
  course,
  units,
  showCourse,
}: {
  course: CourseId;
  units: { unit: number; answered: number; correct: number }[];
  showCourse: boolean;
}) {
  const byUnit = new Map(units.map((u) => [u.unit, u]));
  return (
    <div className="mt-5">
      {showCourse && <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#5F5A4E]">{COURSES[course].shortTitle}</h3>}
      {/* Each row states its value in text, so the bars are a visual aid, not the only encoding. */}
      <ul className="space-y-3">
        {COURSES[course].units.map((u) => {
          const s = byUnit.get(u.number);
          const p = s ? pct(s.correct, s.answered) : null;
          return (
            <li key={u.number} title={s ? `${p}% correct (${s.correct}/${s.answered})` : "Not practiced yet"}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="truncate">
                  {u.number}. {getUnit(course, u.number)?.title}
                </span>
                <span className="shrink-0 tabular-nums text-[#3A372E]">
                  {s ? (
                    <>
                      <strong className="font-semibold text-[#1A1A1A]">{p}%</strong> · {s.answered} answered
                    </>
                  ) : (
                    <span className="text-[#6B6555]">Not practiced</span>
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded bg-[#E9E4D8]" aria-hidden>
                {p !== null && p > 0 && <div className="h-full rounded bg-[#0F5C4A]" style={{ width: `${Math.max(p, 2)}%` }} />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MockChart({ mocks }: { mocks: MockStat[] }) {
  const [active, setActive] = useState<number | null>(null);
  const W = 520;
  const H = 240;
  const M = { top: 16, right: 16, bottom: 32, left: 40 };
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;
  const pts = mocks.map((m, i) => ({
    m,
    pct: Math.round((m.score / m.total) * 100),
    x: M.left + (mocks.length === 1 ? pw / 2 : (i / (mocks.length - 1)) * pw),
  }));
  const y = (p: number) => M.top + ph - (p / 100) * ph;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const a = active !== null ? pts[active] : null;

  return (
    <div className="mt-5 rounded-2xl border border-[#D6D0C4] bg-[#FFFDF8] p-4">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Mock exam scores over time, as percent correct">
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#E9E4D8" strokeWidth={1} />
              <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="central" fontSize={11} fill="#5F5A4E">
                {t}%
              </text>
            </g>
          ))}
          {pts.length > 1 && (
            <path
              d={pts.map((p, i) => `${i ? "L" : "M"}${p.x},${y(p.pct)}`).join(" ")}
              fill="none"
              stroke="#0F5C4A"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )}
          {a && <line x1={a.x} x2={a.x} y1={M.top} y2={M.top + ph} stroke="#B9B2A2" strokeWidth={1} />}
          {pts.map((p, i) => (
            <g key={p.m.id}>
              <circle cx={p.x} cy={y(p.pct)} r={5} fill="#0F5C4A" stroke="#FFFDF8" strokeWidth={2} />
              {(i === 0 || i === pts.length - 1) && (
                <text x={p.x} y={M.top + ph + 18} textAnchor="middle" fontSize={11} fill="#5F5A4E">
                  {fmt(p.m.submitted_at)}
                </text>
              )}
              <rect
                x={p.x - 14}
                y={M.top}
                width={28}
                height={ph}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${fmt(p.m.submitted_at)}: ${p.m.score} of ${p.m.total}, ${p.pct}%`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="cursor-pointer outline-none focus-visible:stroke-[#1A1A1A]"
              />
            </g>
          ))}
        </svg>
        {a && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-[#D6D0C4] bg-white px-3 py-2 text-center shadow-md"
            style={{ left: `${(a.x / W) * 100}%`, top: `${(y(a.pct) / H) * 100}%` }}
          >
            <p className="text-[15px] font-semibold tabular-nums">
              {a.m.score}/{a.m.total} · {a.pct}%
            </p>
            <p className="text-[12px] text-[#5F5A4E]">
              {COURSES[a.m.course].shortTitle} · {fmt(a.m.submitted_at)}
            </p>
          </div>
        )}
      </div>
      <details className="mt-2 text-[14px]">
        <summary className="cursor-pointer text-[#0F5C4A]">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-[12px] uppercase tracking-[0.12em] text-[#5F5A4E]">
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Course</th>
              <th className="py-1 text-right font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {pts.map((p) => (
              <tr key={p.m.id} className="border-t border-[#E9E4D8]">
                <td className="py-1.5">{fmt(p.m.submitted_at)}</td>
                <td className="py-1.5">{COURSES[p.m.course].shortTitle}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {p.m.score}/{p.m.total} ({p.pct}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
