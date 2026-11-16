import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionPanel } from "@/components/practice/QuestionPanel";
import { OPTION_LETTERS } from "@/lib/practice/courses";
import type { ImportQuestion, PublicQuestion } from "@/lib/practice/types";
import { extractQuestions, validateQuestion } from "@/lib/practice/validate";

// Development-only preview of content/questions batches, rendered with the
// real question components. Never available in production builds.

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const DIR = path.join(process.cwd(), "content", "questions");

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ file?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { file } = await searchParams;
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "schema.json").sort();
  const active = file && files.includes(file) ? file : files[0];
  const questions = active ? (extractQuestions(JSON.parse(readFileSync(path.join(DIR, active), "utf8"))) ?? []) : [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 font-sans">
      <h1 className="font-serif text-3xl">Question batch preview (dev only)</h1>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        {files.map((f) => (
          <Link
            key={f}
            href={`?file=${f}`}
            className={`rounded-full border px-3 py-1 ${f === active ? "border-[#1A1A1A] bg-[#1A1A1A] text-white" : "border-[#D6D0C4]"}`}
          >
            {f.replace(".json", "")}
          </Link>
        ))}
      </nav>
      <div className="mt-8 space-y-10">
        {questions.map((raw, i) => {
          const { errors } = validateQuestion(raw);
          if (errors.length) {
            return (
              <pre key={i} className="whitespace-pre-wrap rounded-xl bg-[#FBEAEA] p-4 text-sm text-[#7F1D1D]">
                #{i + 1}: {errors.join("\n")}
              </pre>
            );
          }
          const q = raw as ImportQuestion;
          const correct = OPTION_LETTERS.indexOf(q.correct);
          const pq: PublicQuestion = {
            id: `preview-${i}`,
            course: q.course,
            unit: q.unit,
            topic: q.topic,
            question_type: "mcq",
            stem: q.stem,
            options: q.options,
            difficulty: q.difficulty,
            image_url: q.image_url ?? null,
            image_alt: q.image_alt ?? null,
            graph: q.graph ?? null,
          };
          return (
            <section key={i} className="overflow-hidden rounded-2xl border border-[#D6D0C4] bg-[#F7F4EC]">
              <p className="border-b border-[#D6D0C4] px-5 py-2 text-[13px] text-[#4A4639]">
                #{i + 1} · difficulty {q.difficulty} · key {q.correct}
              </p>
              <QuestionPanel
                question={pq}
                number={i + 1}
                showTopic
                locked
                readOnly
                answer={{
                  selected: correct,
                  flagged: false,
                  eliminated: [],
                  timeSpent: 0,
                  feedback: {
                    isCorrect: true,
                    correctIndex: correct,
                    explanation: q.explanation,
                    optionExplanations: q.option_explanations,
                  },
                }}
              />
            </section>
          );
        })}
      </div>
    </main>
  );
}
