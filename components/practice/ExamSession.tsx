"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Keyboard,
  LoaderCircle,
  LogOut,
  TriangleAlert,
} from "lucide-react";
import { COURSES, OPTION_LETTERS, type CourseId } from "@/lib/practice/courses";
import { readJSON, storageKeys, writeJSON } from "@/lib/practice/storage";
import { Dialog } from "./Dialog";
import { NavigatorGrid, NavigatorLegend } from "./NavigatorGrid";
import { QuestionPanel } from "./QuestionPanel";
import { useExamSession } from "./useExamSession";

type View = "question" | "review";

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function ExamSession({ course, sessionId }: { course: CourseId; sessionId: string }) {
  const router = useRouter();
  const exam = useExamSession(sessionId);
  const { state, questions, current, currentAnswer, status } = exam;

  const [view, setView] = useState<View>("question");
  const [navOpen, setNavOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [timerHidden, setTimerHidden] = useState<boolean>(() => readJSON<boolean>(storageKeys.timerHidden) ?? false);

  const isMock = state?.mode === "mock";
  const total = questions.length;
  const index = state?.currentIndex ?? 0;
  const isLast = index >= total - 1;
  const remaining = state?.timeRemainingSeconds ?? null;
  const resultsHref = `/practice/${state?.course ?? course}/results/${sessionId}`;
  const anyDialogOpen = navOpen || exitOpen || submitOpen || finishOpen || helpOpen;

  // A finished session lives on the results page; a wrong course in the URL is corrected.
  useEffect(() => {
    if (status !== "ready" || !state) return;
    if (state.submittedAt) router.replace(`/practice/${state.course}/results/${state.id}`);
    else if (state.course !== course) router.replace(`/practice/${state.course}/session/${state.id}`);
  }, [status, state, course, router]);

  // Time's up: submit automatically.
  const timeUp = isMock && !state?.submittedAt && remaining !== null && remaining <= 0;
  const { submit } = exam;
  useEffect(() => {
    if (!timeUp || exam.busy) return;
    void submit().then((ok) => {
      if (ok) router.push(resultsHref);
    });
  }, [timeUp, exam.busy, submit, router, resultsHref]);

  const unanswered = useMemo(
    () => (state ? questions.map((q, i) => (state.answers[q.id]?.selected == null ? i : -1)).filter((i) => i >= 0) : []),
    [state, questions],
  );
  const flagged = useMemo(
    () => (state ? questions.map((q, i) => (state.answers[q.id]?.flagged ? i : -1)).filter((i) => i >= 0) : []),
    [state, questions],
  );
  const unchecked = useMemo(
    () => (state ? questions.filter((q) => !state.answers[q.id]?.feedback).length : 0),
    [state, questions],
  );

  const { goTo, select, toggleFlag, check } = exam;
  const goNext = () => {
    if (view === "review") return;
    if (!isLast) goTo(index + 1);
    else if (isMock) setView("review");
    else setFinishOpen(true);
  };
  const goBack = () => {
    if (view === "review") setView("question");
    else goTo(index - 1);
  };

  // Keyboard shortcuts: A-D choose, arrows move, F flags.
  useEffect(() => {
    if (status !== "ready") return;
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (anyDialogOpen) return;
      const key = e.key.toLowerCase();
      if (view === "question" && ["a", "b", "c", "d"].includes(key)) {
        e.preventDefault();
        select(key.charCodeAt(0) - 97);
      } else if (view === "question" && key === "f") {
        e.preventDefault();
        toggleFlag();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (view === "question") {
          if (index < total - 1) goTo(index + 1);
          else if (isMock) setView("review");
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (view === "review") setView("question");
        else goTo(index - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, anyDialogOpen, view, index, total, isMock, select, toggleFlag, goTo]);

  // Screen-reader announcement for practice feedback.
  const feedback = currentAnswer.feedback;
  const announcement = feedback
    ? feedback.isCorrect
      ? "Correct."
      : `Incorrect. The correct answer is ${OPTION_LETTERS[feedback.correctIndex]}.`
    : "";

  const toggleTimer = () => {
    setTimerHidden((h) => {
      writeJSON(storageKeys.timerHidden, !h);
      return !h;
    });
  };

  const doSubmit = async () => {
    const ok = await exam.submit();
    if (ok) router.push(resultsHref);
  };

  const exit = async () => {
    await exam.flush();
    router.push(`/practice/${state?.course ?? course}`);
  };

  // ---- Non-ready states ----------------------------------------------------
  if (status !== "ready" || !state || !current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F4F1EA] px-6 font-sans text-[#1A1A1A]">
        {status === "loading" || (status === "ready" && !current) ? (
          <p className="flex items-center gap-3 text-[15px] text-[#4A4639]" role="status">
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> Loading your session…
          </p>
        ) : (
          <div className="max-w-md text-center">
            <h1 className="font-serif text-3xl">
              {status === "sign-in" ? "Sign in to continue" : status === "not-found" ? "Session not found" : "Something went wrong"}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#4A4639]">
              {status === "sign-in"
                ? "This session is saved to your account. Sign in again to pick up where you left off."
                : status === "not-found"
                  ? "This session doesn't exist or belongs to another account."
                  : "We couldn't load this session. Check your connection and try again."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {status === "sign-in" && (
                <Link href="/signin" className="rounded-full bg-[#0F5C4A] px-5 py-2.5 text-sm font-semibold text-white">
                  Sign in
                </Link>
              )}
              <Link
                href={`/practice/${course}`}
                className="rounded-full border border-[#1A1A1A] px-5 py-2.5 text-sm font-semibold"
              >
                Back to practice
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  const courseInfo = COURSES[state.course];
  const sectionLabel = isMock
    ? "Section I: Multiple Choice"
    : state.mode === "review"
      ? "Review mistakes"
      : state.unitFilter.length === 1
        ? `Unit ${state.unitFilter[0]} practice`
        : state.unitFilter.length > 1
          ? `Units ${state.unitFilter.join(", ")} practice`
          : "Mixed practice";

  const saveLabel =
    state.storage === "local"
      ? "Saved on this device"
      : exam.sync === "saving"
        ? "Saving…"
        : exam.sync === "error"
          ? "Offline: saved on this device"
          : state.dirty.length > 0
            ? "Saving…"
            : "All changes saved";

  const lowTime = remaining !== null && remaining <= 300;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F4F1EA] font-sans text-[#1A1A1A]">
      <a
        href="#exam-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to question
      </a>

      {/* ---- Top bar ---- */}
      <header className="relative border-b border-[#D6D0C4] bg-[#F7F4EC]">
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:px-6">
          <div className="min-w-0">
            <p className="truncate font-serif text-[17px] leading-tight md:text-lg">{sectionLabel}</p>
            <p className="truncate text-[12px] text-[#5F5A4E]">{courseInfo.title}</p>
          </div>

          <div className="flex flex-col items-center">
            {isMock && remaining !== null ? (
              <>
                {timerHidden && !lowTime ? (
                  <Clock className="h-5 w-5 text-[#4A4639]" aria-label="Timer hidden" />
                ) : (
                  <span
                    className={`text-lg font-semibold tabular-nums leading-none md:text-xl ${lowTime ? "text-[#9B2C2C]" : ""}`}
                    role="timer"
                    aria-label={`Time remaining ${formatClock(remaining)}`}
                  >
                    {formatClock(remaining)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleTimer}
                  disabled={lowTime}
                  aria-pressed={timerHidden}
                  className="mt-1 rounded-full border border-[#B9B2A2] px-2.5 py-0.5 text-[11px] font-medium text-[#3A372E] hover:bg-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A]"
                >
                  {timerHidden && !lowTime ? "Show" : "Hide"}
                </button>
              </>
            ) : (
              <span className="text-[13px] text-[#4A4639] tabular-nums">
                {questions.filter((q) => state.answers[q.id]?.feedback).length} of {total} checked
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-1 md:gap-2">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium hover:bg-[#EDE8DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A]"
            >
              <Keyboard className="h-4 w-4" aria-hidden />
              <span className="hidden md:inline">Shortcuts</span>
              <span className="sr-only md:hidden">Keyboard shortcuts</span>
            </button>
            <button
              type="button"
              onClick={() => setExitOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1A1A1A] px-3 py-1.5 text-[13px] font-semibold hover:bg-[#1A1A1A] hover:text-[#F4F1EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A] focus-visible:ring-offset-2"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Exit
            </button>
          </div>
        </div>
        {/* Brand rule, a nod to an exam booklet's printed border */}
        <div className="h-[3px] bg-[repeating-linear-gradient(90deg,#0F5C4A_0_24px,#B48A3C_24px_32px,transparent_32px_40px)] opacity-70" aria-hidden />
      </header>

      {/* ---- Main ---- */}
      <main id="exam-main" className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden" tabIndex={-1}>
        {view === "question" ? (
          <QuestionPanel
            key={current.id}
            question={current}
            number={index + 1}
            answer={currentAnswer}
            showTopic={!isMock}
            locked={exam.locked}
            onSelect={select}
            onEliminate={exam.toggleEliminate}
            onToggleFlag={toggleFlag}
            onCheck={isMock ? undefined : () => void check()}
            checking={exam.busy === "checking"}
          />
        ) : (
          <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 lg:h-full lg:overflow-y-auto lg:py-12">
            <h1 className="font-serif text-3xl md:text-4xl">Check your work</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#4A4639]">
              You can go back to any question until you submit. The clock keeps running on this page.
            </p>
            <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-[#D6D0C4] bg-white p-3">
                <dt className="text-[12px] uppercase tracking-[0.14em] text-[#5F5A4E]">Answered</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{total - unanswered.length}</dd>
              </div>
              <div className="rounded-xl border border-[#D6D0C4] bg-white p-3">
                <dt className="text-[12px] uppercase tracking-[0.14em] text-[#5F5A4E]">Unanswered</dt>
                <dd className={`mt-1 text-2xl font-semibold tabular-nums ${unanswered.length ? "text-[#9B2C2C]" : ""}`}>
                  {unanswered.length}
                </dd>
              </div>
              <div className="rounded-xl border border-[#D6D0C4] bg-white p-3">
                <dt className="text-[12px] uppercase tracking-[0.14em] text-[#5F5A4E]">For review</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{flagged.length}</dd>
              </div>
            </dl>
            {(unanswered.length > 0 || flagged.length > 0) && (
              <div className="mt-6 space-y-3 text-[15px]">
                {unanswered.length > 0 && (
                  <IndexList label="Unanswered" indexes={unanswered} onPick={(i) => { setView("question"); goTo(i); }} />
                )}
                {flagged.length > 0 && (
                  <IndexList label="Marked for review" indexes={flagged} onPick={(i) => { setView("question"); goTo(i); }} />
                )}
              </div>
            )}
            <div className="mt-8 rounded-2xl border border-[#D6D0C4] bg-[#FFFDF8] p-5">
              <NavigatorLegend />
              <div className="mt-5">
                <NavigatorGrid
                  questionIds={questions.map((q) => q.id)}
                  answers={state.answers}
                  onSelect={(i) => {
                    setView("question");
                    goTo(i);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {exam.actionError && (
        <div role="alert" className="flex items-center justify-center gap-2 bg-[#FBEAEA] px-4 py-2 text-[14px] text-[#7F1D1D]">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          {exam.actionError}
        </div>
      )}

      {/* ---- Bottom bar ---- */}
      <footer className="border-t border-[#D6D0C4] bg-[#F7F4EC]">
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 md:px-6">
          <p className="hidden truncate text-[12px] text-[#5F5A4E] sm:block" aria-live="polite">
            {saveLabel}
          </p>
          <span className="sm:hidden" />

          {view === "question" ? (
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-haspopup="dialog"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] px-3.5 py-2 text-[14px] font-semibold text-white hover:bg-[#333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A] focus-visible:ring-offset-2"
            >
              Question {index + 1} of {total}
              <ChevronUp className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <span className="text-[14px] font-semibold">Review</span>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={view === "question" && index === 0}
              className="inline-flex items-center gap-1 rounded-full border border-[#1A1A1A] px-3 py-2 text-[14px] font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A] focus-visible:ring-offset-2 md:px-4"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
            {view === "review" ? (
              <button
                type="button"
                onClick={() => setSubmitOpen(true)}
                className="rounded-full bg-[#0F5C4A] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#0B4A3B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A] focus-visible:ring-offset-2 md:px-5"
              >
                Submit
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 rounded-full bg-[#0F5C4A] px-3 py-2 text-[14px] font-semibold text-white hover:bg-[#0B4A3B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A] focus-visible:ring-offset-2 md:px-4"
              >
                {isLast ? (isMock ? "Review" : "Finish") : "Next"}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </footer>

      <p className="sr-only" aria-live="assertive">
        {isMock && remaining !== null && remaining <= 60
          ? "One minute remaining."
          : isMock && lowTime
            ? "Five minutes remaining."
            : ""}
      </p>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {/* ---- Dialogs ---- */}
      <Dialog
        open={navOpen}
        onClose={() => setNavOpen(false)}
        title={isMock ? "Section I: Multiple Choice" : "Questions"}
        placement="bottom"
        size="lg"
      >
        <NavigatorLegend showResults={!isMock} />
        <div className="mt-5 max-h-[50vh] overflow-y-auto px-1 pt-3">
          <NavigatorGrid
            questionIds={questions.map((q) => q.id)}
            answers={state.answers}
            currentIndex={index}
            showResults={!isMock}
            onSelect={(i) => {
              setNavOpen(false);
              setView("question");
              goTo(i);
            }}
          />
        </div>
        <div className="mt-6 flex justify-center">
          {isMock ? (
            <button
              type="button"
              onClick={() => {
                setNavOpen(false);
                setView("review");
              }}
              className="rounded-full border border-[#1A1A1A] px-5 py-2 text-sm font-semibold hover:bg-[#1A1A1A] hover:text-white"
            >
              Go to review page
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNavOpen(false);
                setFinishOpen(true);
              }}
              className="rounded-full border border-[#1A1A1A] px-5 py-2 text-sm font-semibold hover:bg-[#1A1A1A] hover:text-white"
            >
              Finish session
            </button>
          )}
        </div>
      </Dialog>

      <Dialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Exit this session?"
        description={
          state.storage === "remote"
            ? `Your answers are saved to your account${isMock ? " and the clock pauses until you come back" : ""}. Resume any time from the ${courseInfo.shortTitle} page.`
            : `Your answers are saved in this browser${isMock ? " and the clock pauses until you come back" : ""}. Resume any time from the ${courseInfo.shortTitle} page.`
        }
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setExitOpen(false)}
            className="rounded-full border border-[#1A1A1A] px-5 py-2.5 text-sm font-semibold"
          >
            Keep working
          </button>
          <button
            type="button"
            onClick={() => void exit()}
            className="rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Exit
          </button>
        </div>
      </Dialog>

      <Dialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Submit your answers?"
        description={
          unanswered.length > 0
            ? `You have ${unanswered.length} unanswered question${unanswered.length === 1 ? "" : "s"}. Unanswered questions count as incorrect. You can't change answers after submitting.`
            : "You can't change your answers after submitting."
        }
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setSubmitOpen(false)}
            className="rounded-full border border-[#1A1A1A] px-5 py-2.5 text-sm font-semibold"
          >
            Keep working
          </button>
          <button
            type="button"
            onClick={() => void doSubmit()}
            disabled={exam.busy === "submitting"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F5C4A] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {exam.busy === "submitting" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            Submit and see results
          </button>
        </div>
        {exam.actionError && (
          <p role="alert" className="mt-4 text-[14px] text-[#7F1D1D]">
            {exam.actionError}
          </p>
        )}
      </Dialog>

      <Dialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Finish this session?"
        description={
          unchecked > 0
            ? `${unchecked} question${unchecked === 1 ? " hasn't" : "s haven't"} been checked. Any answer you've chosen will be graded; blank questions won't count.`
            : "Nice work. See your results and review every explanation."
        }
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setFinishOpen(false)}
            className="rounded-full border border-[#1A1A1A] px-5 py-2.5 text-sm font-semibold"
          >
            Keep practicing
          </button>
          <button
            type="button"
            onClick={() => void doSubmit()}
            disabled={exam.busy === "submitting"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F5C4A] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {exam.busy === "submitting" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            See results
          </button>
        </div>
        {exam.actionError && (
          <p role="alert" className="mt-4 text-[14px] text-[#7F1D1D]">
            {exam.actionError}
          </p>
        )}
      </Dialog>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard shortcuts">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[15px]">
          {[
            ["A – D", "Choose an answer"],
            ["→", "Next question"],
            ["←", "Previous question"],
            ["F", "Mark for review"],
            ["Tab", "Move between controls"],
            ["Esc", "Close a dialog"],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded-md border border-[#B9B2A2] bg-white px-2 py-0.5 font-sans text-[13px] font-semibold shadow-[0_1px_0_#B9B2A2]">
                  {k}
                </kbd>
              </dt>
              <dd className="text-[#3A372E]">{v}</dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </div>
  );
}

function IndexList({ label, indexes, onPick }: { label: string; indexes: number[]; onPick: (i: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-semibold">{label}:</span>
      {indexes.map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          className="rounded-md border border-[#B9B2A2] bg-white px-2.5 py-1 text-[14px] tabular-nums hover:border-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A]"
          aria-label={`Go to question ${i + 1}`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}
