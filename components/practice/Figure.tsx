import { GraphView } from "./GraphView";
import type { PublicQuestion } from "@/lib/practice/types";

export function QuestionFigure({ question }: { question: Pick<PublicQuestion, "graph" | "image_url" | "image_alt"> }) {
  const alt = question.image_alt ?? "";
  if (question.graph) {
    return (
      <div className="rounded-xl border border-[#E2DDD2] bg-white p-3 md:p-4">
        <GraphView spec={question.graph} alt={alt} />
      </div>
    );
  }
  if (question.image_url) {
    return (
      <div className="rounded-xl border border-[#E2DDD2] bg-white p-3 md:p-4">
        {/* Admin-supplied URL from any host, so next/image's domain allowlist doesn't fit. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={question.image_url} alt={alt} className="mx-auto h-auto max-h-[420px] w-auto max-w-full" />
      </div>
    );
  }
  return null;
}
