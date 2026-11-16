"use client";

import { useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { COURSES, COURSE_IDS, OPTION_LETTERS, getUnit, type CourseId } from "@/lib/practice/courses";
import { emptyAnswer } from "@/lib/practice/session";
import { findNearDuplicate, indexStems, normalizeStem } from "@/lib/practice/similarity";
import type { AdminQuestion, ImportQuestion, PublicQuestion, QuestionStatus } from "@/lib/practice/types";
import { toQuestionRow, validateQuestion } from "@/lib/practice/validate";
import { Dialog } from "../Dialog";
import { QuestionPanel } from "../QuestionPanel";

type Form = {
  course: CourseId;
  unit: number;
  topic: string;
  difficulty: 1 | 2 | 3;
  stem: string;
  options: string[];
  correct: number;
  explanation: string;
  optionExplanations: string[];
  imageUrl: string;
  imageAlt: string;
  graph: string;
  sourceNote: string;
  status: QuestionStatus;
};

function initialForm(q: AdminQuestion | null): Form {
  return {
    course: q?.course ?? "micro",
    unit: q?.unit ?? 1,
    topic: q?.topic ?? COURSES[q?.course ?? "micro"].units[0].topics[0],
    difficulty: (q?.difficulty as 1 | 2 | 3) ?? 2,
    stem: q?.stem ?? "",
    options: q?.options ?? ["", "", "", ""],
    correct: q?.correct_index ?? 0,
    explanation: q?.explanation ?? "",
    optionExplanations: q?.option_explanations ?? ["", "", "", ""],
    imageUrl: q?.image_url ?? "",
    imageAlt: q?.image_alt ?? "",
    graph: q?.graph ? JSON.stringify(q.graph, null, 2) : "",
    sourceNote: q?.source_note ?? "",
    status: q?.status ?? "draft",
  };
}

const field =
  "w-full rounded-lg border border-[#D6D0C4] bg-white px-3 py-2 text-[14px] focus:border-[#0F5C4A] focus:outline-none focus:ring-2 focus:ring-[#0F5C4A]/30";

export function QuestionEditor({
  question,
  bank,
  onClose,
  onSaved,
}: {
  question: AdminQuestion | null;
  bank: AdminQuestion[];
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Form>(() => initialForm(question));
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [errors, setErrors] = useState<string[]>([]);
  const [similarWarning, setSimilarWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSimilarWarning(null);
  };

  const others = useMemo(() => bank.filter((b) => b.id !== question?.id), [bank, question]);
  const otherIndex = useMemo(() => indexStems(others, (o) => o.stem), [others]);
  const unit = getUnit(form.course, form.unit);

  function build(): { q: ImportQuestion | null; problems: string[] } {
    let graph: unknown;
    const problems: string[] = [];
    if (form.graph.trim()) {
      try {
        graph = JSON.parse(form.graph);
      } catch (e) {
        problems.push(`graph is not valid JSON (${(e as Error).message})`);
      }
    }
    const candidate: Record<string, unknown> = {
      course: form.course,
      unit: form.unit,
      topic: form.topic,
      difficulty: form.difficulty,
      stem: form.stem,
      options: form.options,
      correct: OPTION_LETTERS[form.correct],
      explanation: form.explanation,
      option_explanations: form.optionExplanations,
    };
    if (graph !== undefined) candidate.graph = graph;
    if (form.imageUrl.trim()) candidate.image_url = form.imageUrl.trim();
    if (form.imageAlt.trim()) candidate.image_alt = form.imageAlt.trim();
    if (form.sourceNote.trim()) candidate.source_note = form.sourceNote.trim();
    const { errors: v } = validateQuestion(candidate);
    problems.push(...v);
    return { q: problems.length ? null : (candidate as ImportQuestion), problems };
  }

  const preview: PublicQuestion | null = useMemo(() => {
    let graph = null;
    try {
      graph = form.graph.trim() ? JSON.parse(form.graph) : null;
    } catch {
      graph = null;
    }
    return {
      id: question?.id ?? "new",
      course: form.course,
      unit: form.unit,
      topic: form.topic,
      question_type: "mcq",
      stem: form.stem || "(stem)",
      options: form.options.map((o, i) => o || `(option ${OPTION_LETTERS[i]})`),
      difficulty: form.difficulty,
      image_url: form.imageUrl || null,
      image_alt: form.imageAlt || null,
      graph,
    };
  }, [form, question]);

  async function save() {
    const { q, problems } = build();
    if (!q) {
      setErrors(problems);
      return;
    }
    const norm = normalizeStem(q.stem);
    const twin = others.find((o) => normalizeStem(o.stem) === norm);
    if (twin) {
      setErrors([`Another question already has this stem (${twin.status}).`]);
      return;
    }
    const near = findNearDuplicate(q.stem, otherIndex);
    if (near && !similarWarning) {
      setErrors([]);
      setSimilarWarning(
        `This stem is ${Math.round(near.similarity * 100)}% similar to: “${near.item.stem.slice(0, 140)}${near.item.stem.length > 140 ? "…" : ""}”. Save anyway?`,
      );
      return;
    }

    setSaving(true);
    setErrors([]);
    const row = { ...toQuestionRow(q), status: form.status };
    const { error } = question
      ? await supabase.from("practice_questions").update(row).eq("id", question.id)
      : await supabase.from("practice_questions").insert(row);
    setSaving(false);
    if (error) {
      setErrors([error.message]);
      return;
    }
    await onSaved(question ? "Question saved." : `Question created as ${form.status}.`);
  }

  return (
    <Dialog open onClose={onClose} title={question ? "Edit question" : "New question"} size="lg">
      <div role="group" aria-label="Editor view" className="inline-flex rounded-full border border-[#D6D0C4] bg-white p-1 text-[14px]">
        {(["edit", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1 font-semibold capitalize ${tab === t ? "bg-[#1A1A1A] text-white" : "hover:bg-[#EDE8DC]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "preview" && preview ? (
        <div className="-mx-6 mt-4 overflow-hidden border-y border-[#D6D0C4] bg-[#F7F4EC] md:-mx-7">
          <QuestionPanel
            question={preview}
            number={1}
            showTopic
            locked
            readOnly
            answer={{
              ...emptyAnswer(),
              selected: form.correct,
              feedback: {
                isCorrect: true,
                correctIndex: form.correct,
                explanation: form.explanation || "(explanation)",
                optionExplanations: form.optionExplanations.map((o, i) => o || `(why ${OPTION_LETTERS[i]})`),
              },
            }}
          />
        </div>
      ) : (
        <form
          className="mt-4 max-h-[65vh] space-y-4 overflow-y-auto pr-1"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-[13px]">
              <span className="font-semibold">Course</span>
              <select
                className={field}
                value={form.course}
                onChange={(e) => {
                  const c = e.target.value as CourseId;
                  setForm((f) => ({ ...f, course: c, topic: getUnit(c, f.unit)?.topics[0] ?? f.topic }));
                }}
              >
                {COURSE_IDS.map((c) => (
                  <option key={c} value={c}>
                    {COURSES[c].shortTitle}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[13px]">
              <span className="font-semibold">Unit</span>
              <select
                className={field}
                value={form.unit}
                onChange={(e) => {
                  const u = Number(e.target.value);
                  setForm((f) => ({ ...f, unit: u, topic: getUnit(f.course, u)?.topics[0] ?? f.topic }));
                }}
              >
                {COURSES[form.course].units.map((u) => (
                  <option key={u.number} value={u.number}>
                    {u.number}. {u.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[13px] sm:col-span-2">
              <span className="font-semibold">Topic</span>
              <select className={field} value={form.topic} onChange={(e) => set("topic", e.target.value)}>
                {!unit?.topics.includes(form.topic) && <option value={form.topic}>{form.topic}</option>}
                {unit?.topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[13px]">
              <span className="font-semibold">Difficulty</span>
              <select className={field} value={form.difficulty} onChange={(e) => set("difficulty", Number(e.target.value) as 1 | 2 | 3)}>
                <option value={1}>1: Easy</option>
                <option value={2}>2: Medium</option>
                <option value={3}>3: Hard</option>
              </select>
            </label>
            <label className="text-[13px]">
              <span className="font-semibold">Status</span>
              <select className={field} value={form.status} onChange={(e) => set("status", e.target.value as QuestionStatus)}>
                <option value="draft">Draft (hidden from students)</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <label className="block text-[13px]">
            <span className="font-semibold">Stem</span>
            <textarea className={`${field} min-h-24`} value={form.stem} onChange={(e) => set("stem", e.target.value)} />
          </label>

          <fieldset className="space-y-3">
            <legend className="text-[13px] font-semibold">Options, correct answer, and why each is right or wrong</legend>
            {form.options.map((o, i) => (
              <div key={i} className="rounded-xl border border-[#E2DDD2] bg-white p-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[13px] font-semibold">
                    <input
                      type="radio"
                      name="correct"
                      checked={form.correct === i}
                      onChange={() => set("correct", i)}
                      className="accent-[#0F5C4A]"
                    />
                    {OPTION_LETTERS[i]} {form.correct === i && <span className="font-normal text-[#0F5C4A]">(correct)</span>}
                  </label>
                  <input
                    className={field}
                    value={o}
                    aria-label={`Option ${OPTION_LETTERS[i]}`}
                    onChange={(e) => set("options", form.options.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                </div>
                <textarea
                  className={`${field} mt-2 min-h-14`}
                  value={form.optionExplanations[i]}
                  aria-label={`Explanation for option ${OPTION_LETTERS[i]}`}
                  placeholder={form.correct === i ? "Correct. Why this is right…" : "Why this is wrong…"}
                  onChange={(e) =>
                    set("optionExplanations", form.optionExplanations.map((x, j) => (j === i ? e.target.value : x)))
                  }
                />
              </div>
            ))}
          </fieldset>

          <label className="block text-[13px]">
            <span className="font-semibold">Explanation</span>
            <textarea className={`${field} min-h-20`} value={form.explanation} onChange={(e) => set("explanation", e.target.value)} />
          </label>

          <details className="rounded-xl border border-[#E2DDD2] bg-white p-3" open={Boolean(form.graph || form.imageUrl)}>
            <summary className="cursor-pointer text-[13px] font-semibold">Figure (graph JSON or image)</summary>
            <label className="mt-3 block text-[13px]">
              <span className="font-semibold">Graph JSON</span>{" "}
              <span className="text-[#5F5A4E]">(format in content/questions/README.md)</span>
              <textarea className={`${field} min-h-32 font-mono text-[12px]`} value={form.graph} onChange={(e) => set("graph", e.target.value)} />
            </label>
            <label className="mt-3 block text-[13px]">
              <span className="font-semibold">Image URL</span> <span className="text-[#5F5A4E]">(https)</span>
              <input className={field} value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
            </label>
            <label className="mt-3 block text-[13px]">
              <span className="font-semibold">Alt text</span>{" "}
              <span className="text-[#5F5A4E]">(required with a figure; describe it fully)</span>
              <textarea className={`${field} min-h-16`} value={form.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} />
            </label>
          </details>

          <label className="block text-[13px]">
            <span className="font-semibold">Source note</span> <span className="text-[#5F5A4E]">(internal)</span>
            <input className={field} value={form.sourceNote} onChange={(e) => set("sourceNote", e.target.value)} />
          </label>
        </form>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="mt-4 list-disc space-y-1 rounded-xl bg-[#FBEAEA] py-3 pl-8 pr-4 text-[13px] text-[#7F1D1D]">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {similarWarning && (
        <p role="alert" className="mt-4 rounded-xl bg-[#FBF1E2] px-4 py-3 text-[13px] text-[#6B3F0E]">
          {similarWarning}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-full border border-[#1A1A1A] px-5 py-2 text-sm font-semibold">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-[#0F5C4A] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          {similarWarning ? "Save anyway" : "Save"}
        </button>
      </div>
    </Dialog>
  );
}
