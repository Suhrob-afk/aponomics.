"use client";

import { Bookmark, Check, CircleCheck, CircleX, LoaderCircle, X } from "lucide-react";
import { OPTION_LETTERS, getUnit } from "@/lib/practice/courses";
import type { AnswerState } from "@/lib/practice/session";
import type { PublicQuestion } from "@/lib/practice/types";
import { QuestionFigure } from "./Figure";

type Props = {
  question: PublicQuestion;
  number: number;
  answer: AnswerState;
  /** Show unit/topic above the options (practice + results, never in a mock). */
  showTopic: boolean;
  /** Choices can't change (checked practice answer, submitted session, busy). */
  locked: boolean;
  /** Results view: no interactive controls at all. */
  readOnly?: boolean;
  onSelect?: (index: number) => void;
  onEliminate?: (index: number) => void;
  onToggleFlag?: () => void;
  /** Practice mode "Check answer". */
  onCheck?: () => void;
  checking?: boolean;
};

export function QuestionPanel({
  question,
  number,
  answer,
  showTopic,
  locked,
  readOnly,
  onSelect,
  onEliminate,
  onToggleFlag,
  onCheck,
  checking,
}: Props) {
  const feedback = answer.feedback;
  const unit = getUnit(question.course, question.unit);
  const hasFigure = Boolean(question.graph || question.image_url);
  const choicesLabelId = `choices-${question.id}`;

  return (
    <div className="lg:grid lg:h-full lg:grid-cols-2">
      {/* Stem + figure */}
      <section
        aria-label={`Question ${number}`}
        className="border-b border-[#D6D0C4] px-5 py-6 md:px-8 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:py-9"
      >
        <div className="mx-auto max-w-2xl">
          <p className="whitespace-pre-line text-[17px] leading-[1.7] text-[#1A1A1A]">{question.stem}</p>
          {hasFigure && (
            <div className="mt-6">
              <QuestionFigure question={question} />
            </div>
          )}
        </div>
      </section>

      {/* Choices */}
      <section aria-labelledby={choicesLabelId} className="px-5 py-6 md:px-8 lg:overflow-y-auto lg:px-10 lg:py-9">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-[#D6D0C4] pb-3">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-[#1A1A1A] px-2 text-sm font-semibold tabular-nums text-white"
                aria-hidden
              >
                {number}
              </span>
              <h2 id={choicesLabelId} className="sr-only">
                Answer choices for question {number}
              </h2>
              {showTopic && (
                <p className="text-[13px] leading-snug text-[#4A4639]">
                  Unit {question.unit}
                  {unit ? ` · ${unit.title}` : ""}
                  <span className="hidden sm:inline"> · {question.topic}</span>
                </p>
              )}
            </div>
            {!readOnly && onToggleFlag && (
              <button
                type="button"
                onClick={onToggleFlag}
                aria-pressed={answer.flagged}
                className={[
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A] focus-visible:ring-offset-2",
                  answer.flagged
                    ? "border-[#9A5B13] bg-[#FBF1E2] text-[#7A4510]"
                    : "border-[#D6D0C4] bg-white text-[#1A1A1A] hover:border-[#9A5B13]",
                ].join(" ")}
              >
                <Bookmark className={`h-4 w-4 ${answer.flagged ? "fill-[#9A5B13] text-[#9A5B13]" : ""}`} aria-hidden />
                Mark for review
              </button>
            )}
            {readOnly && answer.flagged && (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-[#7A4510]">
                <Bookmark className="h-4 w-4 fill-[#9A5B13] text-[#9A5B13]" aria-hidden /> Marked for review
              </span>
            )}
          </div>

          <div role="radiogroup" aria-labelledby={choicesLabelId} className="mt-5 space-y-3">
            {question.options.map((text, i) => (
              <Choice
                key={i}
                index={i}
                text={text}
                answer={answer}
                locked={locked || Boolean(readOnly)}
                readOnly={readOnly}
                onSelect={onSelect}
                onEliminate={onEliminate}
              />
            ))}
          </div>

          {onCheck && !feedback && !readOnly && (
            <div className="mt-6">
              <button
                type="button"
                onClick={onCheck}
                disabled={answer.selected === null || checking}
                className="inline-flex items-center gap-2 rounded-full bg-[#0F5C4A] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0B4A3B] disabled:cursor-not-allowed disabled:bg-[#9DB5AB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A] focus-visible:ring-offset-2"
              >
                {checking && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
                Check answer
              </button>
              {answer.selected === null && (
                <p className="mt-2 text-[13px] text-[#5F5A4E]">Choose an answer to check it.</p>
              )}
            </div>
          )}

          {feedback && <FeedbackPanel answer={answer} />}
        </div>
      </section>
    </div>
  );
}

function Choice({
  index,
  text,
  answer,
  locked,
  readOnly,
  onSelect,
  onEliminate,
}: {
  index: number;
  text: string;
  answer: AnswerState;
  locked: boolean;
  readOnly?: boolean;
  onSelect?: (index: number) => void;
  onEliminate?: (index: number) => void;
}) {
  const letter = OPTION_LETTERS[index];
  const selected = answer.selected === index;
  const eliminated = answer.eliminated.includes(index);
  const fb = answer.feedback;
  const isKey = fb ? fb.correctIndex === index : false;
  const wrongPick = fb ? selected && !fb.isCorrect : false;

  const box = fb
    ? isKey
      ? "border-[#1F6B4F] bg-[#E6F2EC]"
      : wrongPick
        ? "border-[#9B2C2C] bg-[#FBEAEA]"
        : "border-[#E2DDD2] bg-white"
    : selected
      ? "border-[#0F5C4A] bg-[#EEF5F1]"
      : "border-[#D6D0C4] bg-white hover:border-[#0F5C4A]/60";

  const badge = fb
    ? isKey
      ? "border-[#1F6B4F] bg-[#1F6B4F] text-white"
      : wrongPick
        ? "border-[#9B2C2C] bg-[#9B2C2C] text-white"
        : "border-[#8A8475] text-[#5F5A4E]"
    : selected
      ? "border-[#0F5C4A] bg-[#0F5C4A] text-white"
      : "border-[#1A1A1A] text-[#1A1A1A]";

  const srStatus = fb
    ? isKey
      ? selected
        ? " (your answer, correct)"
        : " (correct answer)"
      : wrongPick
        ? " (your answer, incorrect)"
        : ""
    : eliminated
      ? " (eliminated)"
      : "";

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-disabled={locked || undefined}
        onClick={() => !locked && onSelect?.(index)}
        className={[
          "relative flex min-h-[3.25rem] flex-1 items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EA]",
          locked ? "cursor-default" : "cursor-pointer",
          box,
        ].join(" ")}
      >
        <span
          className={`mt-px inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-semibold ${badge}`}
          aria-hidden
        >
          {letter}
        </span>
        <span
          className={[
            "flex-1 pt-0.5 text-[16px] leading-relaxed",
            eliminated && !fb ? "text-[#6B6555] line-through decoration-[#1A1A1A] decoration-2" : "text-[#1A1A1A]",
          ].join(" ")}
        >
          <span className="sr-only">{letter}. </span>
          {text}
          <span className="sr-only">{srStatus}</span>
        </span>
        {fb && isKey && <Check className="mt-1 h-5 w-5 shrink-0 text-[#1F6B4F]" aria-hidden />}
        {fb && wrongPick && <X className="mt-1 h-5 w-5 shrink-0 text-[#9B2C2C]" aria-hidden />}
      </button>
      {!readOnly && !fb && onEliminate && (
        <button
          type="button"
          onClick={() => onEliminate(index)}
          disabled={locked}
          aria-pressed={eliminated}
          aria-label={eliminated ? `Restore choice ${letter}` : `Eliminate choice ${letter}`}
          title={eliminated ? "Undo" : "Eliminate"}
          className={[
            "flex w-11 shrink-0 items-center justify-center rounded-xl border text-[13px] font-semibold transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A] focus-visible:ring-offset-2",
            eliminated
              ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
              : "border-[#D6D0C4] bg-white text-[#4A4639] hover:border-[#1A1A1A]",
          ].join(" ")}
        >
          {eliminated ? (
            <span className="text-[11px] uppercase tracking-wide">Undo</span>
          ) : (
            <span className="line-through decoration-2" aria-hidden>
              {letter}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function FeedbackPanel({ answer }: { answer: AnswerState }) {
  const fb = answer.feedback!;
  const unanswered = answer.selected === null;
  return (
    <div
      className={[
        "mt-6 rounded-xl border-2 p-5",
        fb.isCorrect ? "border-[#1F6B4F] bg-[#F3F9F6]" : "border-[#D9B3B3] bg-[#FDF6F6]",
      ].join(" ")}
    >
      <p className={`flex items-center gap-2 font-semibold ${fb.isCorrect ? "text-[#1F6B4F]" : "text-[#7F1D1D]"}`}>
        {fb.isCorrect ? <CircleCheck className="h-5 w-5" aria-hidden /> : <CircleX className="h-5 w-5" aria-hidden />}
        {fb.isCorrect
          ? "Correct"
          : unanswered
            ? `Not answered. The answer is ${OPTION_LETTERS[fb.correctIndex]}.`
            : `Not quite. The answer is ${OPTION_LETTERS[fb.correctIndex]}.`}
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-[#1A1A1A]">{fb.explanation}</p>
      <ul className="mt-4 space-y-2.5 border-t border-[#E2DDD2] pt-4">
        {fb.optionExplanations.map((t, i) => (
          <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-[#2E2B24]">
            <span
              className={[
                "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold",
                i === fb.correctIndex
                  ? "border-[#1F6B4F] bg-[#1F6B4F] text-white"
                  : i === answer.selected
                    ? "border-[#9B2C2C] text-[#9B2C2C]"
                    : "border-[#8A8475] text-[#4A4639]",
              ].join(" ")}
              aria-hidden
            >
              {OPTION_LETTERS[i]}
            </span>
            <span>
              <span className="sr-only">Choice {OPTION_LETTERS[i]}: </span>
              {t}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
