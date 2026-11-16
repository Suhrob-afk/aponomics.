import { Bookmark, MapPin } from "lucide-react";
import type { AnswerState } from "@/lib/practice/session";

type Props = {
  questionIds: string[];
  answers: Record<string, AnswerState>;
  currentIndex?: number;
  onSelect: (index: number) => void;
  /** Colour by correctness (results / checked practice answers). */
  showResults?: boolean;
};

export function NavigatorGrid({ questionIds, answers, currentIndex, onSelect, showResults }: Props) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-x-2 gap-y-3" aria-label="Questions">
      {questionIds.map((id, i) => {
        const a = answers[id];
        const answered = a?.selected != null;
        const flagged = Boolean(a?.flagged);
        const current = i === currentIndex;
        const result = showResults && a?.feedback ? (a.feedback.isCorrect ? "correct" : "incorrect") : null;

        const label = [
          `Question ${i + 1}`,
          result ? (result === "correct" ? "correct" : answered ? "incorrect" : "unanswered") : answered ? "answered" : "unanswered",
          flagged ? "marked for review" : null,
          current ? "current question" : null,
        ]
          .filter(Boolean)
          .join(", ");

        const tone =
          result === "correct"
            ? "bg-[#1F6B4F] text-white border-2 border-[#1F6B4F]"
            : result === "incorrect"
              ? "bg-[#FBEAEA] text-[#7F1D1D] border-2 border-[#9B2C2C]"
              : answered
                ? "bg-[#0F5C4A] text-white border-2 border-[#0F5C4A]"
                : "bg-white text-[#1A1A1A] border-2 border-dashed border-[#6B6555]";

        return (
          <li key={id} className="relative">
            {current && (
              <MapPin
                className="absolute -top-3.5 left-1/2 h-4 w-4 -translate-x-1/2 fill-[#1A1A1A] text-[#FFFDF8]"
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-label={label}
              aria-current={current ? "step" : undefined}
              className={[
                "relative h-11 w-full rounded-md text-sm font-semibold tabular-nums transition",
                "hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF8]",
                tone,
                current ? "ring-2 ring-[#1A1A1A] ring-offset-2 ring-offset-[#FFFDF8]" : "",
              ].join(" ")}
            >
              {i + 1}
            </button>
            {flagged && (
              <Bookmark
                className="pointer-events-none absolute -right-1.5 -top-1.5 h-4 w-4 fill-[#9A5B13] text-[#9A5B13]"
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function NavigatorLegend({ showResults }: { showResults?: boolean }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[#4A4639]" aria-label="Legend">
      <li className="flex items-center gap-1.5">
        <MapPin className="h-4 w-4 fill-[#1A1A1A] text-[#FFFDF8]" aria-hidden /> Current
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-4 w-4 rounded-sm border-2 border-dashed border-[#6B6555] bg-white" aria-hidden /> Unanswered
      </li>
      {showResults ? (
        <>
          <li className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded-sm bg-[#1F6B4F]" aria-hidden /> Correct
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded-sm border-2 border-[#9B2C2C] bg-[#FBEAEA]" aria-hidden /> Incorrect
          </li>
        </>
      ) : (
        <li className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-sm bg-[#0F5C4A]" aria-hidden /> Answered
        </li>
      )}
      <li className="flex items-center gap-1.5">
        <Bookmark className="h-4 w-4 fill-[#9A5B13] text-[#9A5B13]" aria-hidden /> For review
      </li>
    </ul>
  );
}
