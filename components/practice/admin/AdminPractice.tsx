"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChartLine, Eye, LoaderCircle, Pencil, Plus, Search, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { COURSES, COURSE_IDS, OPTION_LETTERS, type CourseId } from "@/lib/practice/courses";
import { currentUserId, emptyAnswer } from "@/lib/practice/session";
import type { AdminQuestion, QuestionStatus } from "@/lib/practice/types";
import { Dialog } from "../Dialog";
import { QuestionPanel } from "../QuestionPanel";
import { ImportDialog } from "./ImportDialog";
import { QuestionEditor } from "./QuestionEditor";

type Gate = "loading" | "signed-out" | "denied" | "ok" | "error";

export function AdminPractice() {
  const [gate, setGate] = useState<Gate>("loading");
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [status, setStatus] = useState<"all" | QuestionStatus>("draft");
  const [course, setCourse] = useState<"all" | CourseId>("all");
  const [unit, setUnit] = useState<number | 0>(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<AdminQuestion | null>(null);
  const [editing, setEditing] = useState<AdminQuestion | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("practice_admin_list");
    if (error) throw error;
    setQuestions((data ?? []) as AdminQuestion[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = await currentUserId();
        if (!uid) return !cancelled && setGate("signed-out");
        const { data: isAdmin, error } = await supabase.rpc("is_practice_admin");
        if (error) throw error;
        if (!isAdmin) return !cancelled && setGate("denied");
        await load();
        if (!cancelled) setGate("ok");
      } catch (e) {
        console.error(e);
        if (!cancelled) setGate("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions.filter(
      (x) =>
        (status === "all" || x.status === status) &&
        (course === "all" || x.course === course) &&
        (!unit || x.unit === unit) &&
        (!q || x.stem.toLowerCase().includes(q) || x.topic.toLowerCase().includes(q)),
    );
  }, [questions, status, course, unit, query]);

  const counts = useMemo(
    () => ({
      draft: questions.filter((q) => q.status === "draft").length,
      published: questions.filter((q) => q.status === "published").length,
    }),
    [questions],
  );

  const selectedVisible = visible.filter((q) => selected.has(q.id));
  const allVisibleSelected = visible.length > 0 && selectedVisible.length === visible.length;

  async function setStatusFor(ids: string[], next: QuestionStatus) {
    if (ids.length === 0) return;
    setWorking(true);
    setMessage(null);
    const { error } = await supabase.from("practice_questions").update({ status: next }).in("id", ids);
    if (error) setMessage({ kind: "error", text: error.message });
    else {
      setMessage({ kind: "ok", text: `${ids.length} question${ids.length === 1 ? "" : "s"} ${next === "published" ? "published" : "moved to drafts"}.` });
      setSelected(new Set());
      await load();
    }
    setWorking(false);
  }

  async function deleteDrafts(ids: string[]) {
    const drafts = questions.filter((q) => ids.includes(q.id) && q.status === "draft").map((q) => q.id);
    if (drafts.length === 0) return;
    if (!window.confirm(`Permanently delete ${drafts.length} draft question${drafts.length === 1 ? "" : "s"}? This can't be undone.`)) return;
    setWorking(true);
    setMessage(null);
    const { error } = await supabase.from("practice_questions").delete().in("id", drafts);
    if (error) setMessage({ kind: "error", text: error.message });
    else {
      setMessage({ kind: "ok", text: `Deleted ${drafts.length} draft${drafts.length === 1 ? "" : "s"}.` });
      setSelected(new Set());
      await load();
    }
    setWorking(false);
  }

  if (gate !== "ok") {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        {gate === "loading" ? (
          <p role="status" className="flex items-center justify-center gap-3 text-[#4A4639]">
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> Checking access…
          </p>
        ) : (
          <>
            <h1 className="font-serif text-3xl">
              {gate === "signed-out" ? "Sign in required" : gate === "denied" ? "Not authorized" : "Something went wrong"}
            </h1>
            <p className="mt-3 text-[15px] text-[#4A4639]">
              {gate === "signed-out"
                ? "Sign in with an admin account to manage practice questions."
                : gate === "denied"
                  ? "This account doesn't have access to the question bank."
                  : "Couldn't load the question bank. Has the practice migration been applied?"}
            </p>
            <Link
              href={gate === "signed-out" ? "/signin" : "/practice"}
              className="mt-6 inline-block rounded-full border border-[#1A1A1A] px-5 py-2.5 text-sm font-semibold"
            >
              {gate === "signed-out" ? "Sign in" : "Go to practice"}
            </Link>
          </>
        )}
      </main>
    );
  }

  const unitsForCourse = course === "all" ? [1, 2, 3, 4, 5, 6] : COURSES[course].units.map((u) => u.number);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 font-sans">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] uppercase tracking-[0.2em] text-[#0F5C4A]">Admin</p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight">Practice questions</h1>
          <p className="mt-2 text-[15px] text-[#4A4639]">
            {counts.draft} draft · {counts.published} published. Students only ever see published questions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#1A1A1A] px-4 py-2 text-sm font-semibold hover:bg-[#1A1A1A] hover:text-white"
          >
            <Upload className="h-4 w-4" aria-hidden /> Import JSON
          </button>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 rounded-full bg-[#0F5C4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B4A3B]"
          >
            <Plus className="h-4 w-4" aria-hidden /> New question
          </button>
        </div>
      </div>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-5 rounded-xl px-4 py-2.5 text-[14px] ${message.kind === "error" ? "bg-[#FBEAEA] text-[#7F1D1D]" : "bg-[#EEF5F1] text-[#0F5C4A]"}`}
        >
          {message.text}
        </p>
      )}

      {/* Filters: one row above the list */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} options={[["draft", `Drafts (${counts.draft})`], ["published", `Published (${counts.published})`], ["all", "All"]]} />
        <Select
          label="Course"
          value={course}
          onChange={(v) => {
            setCourse(v as typeof course);
            setUnit(0);
          }}
          options={[["all", "Both courses"], ...COURSE_IDS.map((c) => [c, COURSES[c].shortTitle] as [string, string])]}
        />
        <Select label="Unit" value={String(unit)} onChange={(v) => setUnit(Number(v))} options={[["0", "All units"], ...unitsForCourse.map((u) => [String(u), `Unit ${u}`] as [string, string])]} />
        <label className="relative flex-1 min-w-[14rem]">
          <span className="sr-only">Search stems and topics</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6555]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stems and topics"
            className="w-full rounded-full border border-[#D6D0C4] bg-white py-2 pl-9 pr-4 text-[14px] focus:border-[#0F5C4A] focus:outline-none focus:ring-2 focus:ring-[#0F5C4A]/30"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#D6D0C4] bg-[#FFFDF8] px-4 py-2.5 text-[14px]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={() =>
              setSelected(allVisibleSelected ? new Set() : new Set(visible.map((q) => q.id)))
            }
            className="h-4 w-4 accent-[#0F5C4A]"
          />
          Select all {visible.length}
        </label>
        <span className="text-[#5F5A4E]">{selectedVisible.length} selected</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <BulkButton disabled={working || !selectedVisible.length} onClick={() => void setStatusFor(selectedVisible.map((q) => q.id), "published")}>
            Publish
          </BulkButton>
          <BulkButton disabled={working || !selectedVisible.length} onClick={() => void setStatusFor(selectedVisible.map((q) => q.id), "draft")}>
            Unpublish
          </BulkButton>
          <BulkButton
            danger
            disabled={working || !selectedVisible.some((q) => q.status === "draft")}
            onClick={() => void deleteDrafts(selectedVisible.map((q) => q.id))}
          >
            Delete drafts
          </BulkButton>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-center text-[15px] text-[#4A4639]">
          {questions.length === 0 ? "The bank is empty. Import a JSON batch to get started." : "No questions match these filters."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[#E2DDD2] rounded-2xl border border-[#D6D0C4] bg-[#FFFDF8]">
          {visible.map((q) => (
            <li key={q.id} className="flex items-start gap-4 px-4 py-3.5">
              <input
                type="checkbox"
                checked={selected.has(q.id)}
                onChange={() =>
                  setSelected((cur) => {
                    const next = new Set(cur);
                    if (next.has(q.id)) next.delete(q.id);
                    else next.add(q.id);
                    return next;
                  })
                }
                aria-label={`Select question: ${q.stem.slice(0, 60)}`}
                className="mt-1 h-4 w-4 shrink-0 accent-[#0F5C4A]"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[15px] leading-snug">{q.stem}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] text-[#5F5A4E]">
                  <span className={`rounded-full border px-2 py-px text-[11px] font-semibold uppercase tracking-wide ${q.status === "published" ? "border-[#0F5C4A] text-[#0F5C4A]" : "border-[#9A5B13] text-[#7A4510]"}`}>
                    {q.status}
                  </span>
                  <span>{COURSES[q.course].shortTitle} · Unit {q.unit}</span>
                  <span>· {q.topic}</span>
                  <span>· Difficulty {q.difficulty}</span>
                  <span>· Key {OPTION_LETTERS[q.correct_index]}</span>
                  {(q.graph || q.image_url) && (
                    <span className="inline-flex items-center gap-1">
                      · <ChartLine className="h-3.5 w-3.5" aria-hidden /> figure
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton label="Preview" onClick={() => setPreview(q)}>
                  <Eye className="h-4 w-4" aria-hidden />
                </IconButton>
                <IconButton label="Edit" onClick={() => setEditing(q)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </IconButton>
                <button
                  type="button"
                  disabled={working}
                  onClick={() => void setStatusFor([q.id], q.status === "published" ? "draft" : "published")}
                  className={`ml-1 rounded-full px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50 ${q.status === "published" ? "border border-[#1A1A1A] hover:bg-[#EDE8DC]" : "bg-[#0F5C4A] text-white hover:bg-[#0B4A3B]"}`}
                >
                  {q.status === "published" ? "Unpublish" : "Publish"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={preview !== null} onClose={() => setPreview(null)} title="Student preview" size="lg">
        {preview && (
          <div className="-mx-6 overflow-hidden border-y border-[#D6D0C4] bg-[#F7F4EC] md:-mx-7">
            <QuestionPanel
              question={preview}
              number={1}
              showTopic
              locked
              readOnly
              answer={{
                ...emptyAnswer(),
                selected: preview.correct_index,
                feedback: {
                  isCorrect: true,
                  correctIndex: preview.correct_index,
                  explanation: preview.explanation,
                  optionExplanations: preview.option_explanations,
                },
              }}
            />
          </div>
        )}
      </Dialog>

      {editing !== null && (
        <QuestionEditor
          question={editing === "new" ? null : editing}
          bank={questions}
          onClose={() => setEditing(null)}
          onSaved={async (text) => {
            setEditing(null);
            setMessage({ kind: "ok", text });
            await load();
          }}
        />
      )}

      <ImportDialog
        open={importOpen}
        bank={questions}
        onClose={() => setImportOpen(false)}
        onImported={async (text) => {
          setMessage({ kind: "ok", text });
          await load();
        }}
      />
    </main>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-2 text-[14px]">
      <span className="text-[#5F5A4E]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-[#D6D0C4] bg-white px-3 py-2 text-[14px] focus:border-[#0F5C4A] focus:outline-none focus:ring-2 focus:ring-[#0F5C4A]/30"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function BulkButton({ children, onClick, disabled, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "border-[#9B2C2C] text-[#9B2C2C] hover:bg-[#FBEAEA]" : "border-[#1A1A1A] hover:bg-[#EDE8DC]"}`}
    >
      {children}
    </button>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-full p-2 text-[#3A372E] hover:bg-[#EDE8DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A]"
    >
      {children}
    </button>
  );
}
