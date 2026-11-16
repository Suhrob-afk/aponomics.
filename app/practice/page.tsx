import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ListChecks, RotateCcw, Timer } from "lucide-react";
import { COURSES, COURSE_IDS } from "@/lib/practice/courses";

export const metadata: Metadata = {
  title: "AP® Economics Practice | aponomics",
  description:
    "Free, original multiple-choice practice for AP® Microeconomics and AP® Macroeconomics: practice by unit, take a timed 60-question mock, and review your mistakes.",
  openGraph: {
    title: "AP® Economics Practice | aponomics",
    description: "Free, original AP® Micro and Macro multiple-choice practice with full explanations.",
  },
};

const MODES = [
  {
    icon: ListChecks,
    title: "Practice by unit",
    body: "Pick units and a question count. Check each answer as you go and read why every choice is right or wrong.",
  },
  {
    icon: Timer,
    title: "Timed mock",
    body: "60 questions in 70 minutes, the length of the real multiple-choice section. No feedback until you submit, then a full review.",
  },
  {
    icon: RotateCcw,
    title: "Review mistakes",
    body: "Re-practice the questions you missed or marked for review until you get them right.",
  },
];

export default function PracticeHome() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14 md:py-20">
      <header className="max-w-3xl">
        <p className="text-[12px] uppercase tracking-[0.22em] text-[#0F5C4A]">Free exam practice</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight md:text-6xl">AP® Economics Practice</h1>
        <p className="mt-5 text-lg leading-relaxed text-[#3A372E]">
          Original multiple-choice questions for AP® Microeconomics and AP® Macroeconomics, written in the style of the
          exam, with an explanation for every answer choice. Practice without an account, or sign in to keep your
          history and stats.
        </p>
      </header>

      <section aria-labelledby="courses-heading" className="mt-12">
        <h2 id="courses-heading" className="sr-only">
          Choose a course
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {COURSE_IDS.map((id) => {
            const c = COURSES[id];
            return (
              <Link
                key={id}
                href={`/practice/${id}`}
                className="group flex flex-col rounded-2xl border border-[#D6D0C4] bg-[#FFFDF8] p-7 transition hover:border-[#0F5C4A] hover:shadow-[0_8px_30px_rgba(15,92,74,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EA] md:p-8"
              >
                <h3 className="font-serif text-3xl tracking-tight text-[#0F5C4A]">{c.title}</h3>
                <ul className="mt-5 space-y-1.5 text-[15px] text-[#3A372E]">
                  {c.units.map((u) => (
                    <li key={u.number} className="flex gap-3">
                      <span className="w-4 shrink-0 tabular-nums text-[#6B6555]">{u.number}</span>
                      {u.title}
                    </li>
                  ))}
                </ul>
                <span className="mt-7 inline-flex items-center gap-2 text-[15px] font-semibold text-[#0F5C4A]">
                  Start practicing
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="modes-heading" className="mt-16">
        <h2 id="modes-heading" className="font-serif text-3xl tracking-tight">
          Three ways to practice
        </h2>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          {MODES.map((m) => (
            <div key={m.title} className="border-t border-[#D6D0C4] pt-5">
              <m.icon className="h-6 w-6 text-[#0F5C4A]" aria-hidden />
              <h3 className="mt-3 text-lg font-semibold">{m.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#4A4639]">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 flex flex-col gap-4 rounded-2xl bg-[#EAE5D8] p-7 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <h2 className="font-serif text-2xl">Track your progress</h2>
          <p className="mt-1 text-[15px] text-[#3A372E]">
            Accuracy by unit, your weakest topics, mock scores over time, and your practice streak.
          </p>
        </div>
        <Link
          href="/practice/dashboard"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#333]"
        >
          Open your dashboard
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}
