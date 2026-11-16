"use client";

import { useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { findNearDuplicate, indexStems, normalizeStem, type StemEntry } from "@/lib/practice/similarity";
import type { AdminQuestion, ImportQuestion } from "@/lib/practice/types";
import { extractQuestions, toQuestionRow, validateQuestion } from "@/lib/practice/validate";
import { Dialog } from "../Dialog";

type Checked = {
  index: number;
  question: ImportQuestion | null;
  errors: string[];
  warnings: string[];
  duplicate: boolean;
  similarTo: string | null;
};

export function ImportDialog({
  open,
  bank,
  onClose,
  onImported,
}: {
  open: boolean;
  bank: AdminQuestion[];
  onClose: () => void;
  onImported: (message: string) => void | Promise<void>;
}) {
  const [text, setText] = useState("");
  const [allowSimilar, setAllowSimilar] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const report = useMemo((): { parseError: string | null; items: Checked[] } => {
    if (!text.trim()) return { parseError: null, items: [] };
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return { parseError: `Invalid JSON: ${(e as Error).message}`, items: [] };
    }
    const list = extractQuestions(json);
    if (!list) return { parseError: 'Expected { "questions": [...] } or an array of questions.', items: [] };

    const existingNorm = new Set(bank.map((b) => normalizeStem(b.stem)));
    const index: StemEntry<string>[] = indexStems(bank.map((b) => b.stem), (s) => s);
    const seen = new Set<string>();
    return {
      parseError: null,
      items: list.map((raw, i) => {
        const { errors, warnings } = validateQuestion(raw);
        if (errors.length) return { index: i, question: null, errors, warnings, duplicate: false, similarTo: null };
        const q = raw as ImportQuestion;
        const norm = normalizeStem(q.stem);
        const duplicate = existingNorm.has(norm) || seen.has(norm);
        const near = duplicate ? null : findNearDuplicate(q.stem, index);
        seen.add(norm);
        index.push(...indexStems([q.stem], (s) => s));
        return {
          index: i,
          question: q,
          errors,
          warnings,
          duplicate,
          similarTo: near ? `${Math.round(near.similarity * 100)}% similar to “${near.item.slice(0, 90)}…”` : null,
        };
      }),
    };
  }, [text, bank]);

  const invalid = report.items.filter((i) => i.errors.length);
  const duplicates = report.items.filter((i) => i.duplicate);
  const similar = report.items.filter((i) => i.similarTo);
  const toImport = report.items.filter((i) => i.question && !i.duplicate && (allowSimilar || !i.similarTo));

  async function runImport() {
    setImporting(true);
    setError(null);
    const rows = toImport.map((i) => toQuestionRow(i.question!));
    for (let k = 0; k < rows.length; k += 100) {
      const { error: e } = await supabase
        .from("practice_questions")
        .upsert(rows.slice(k, k + 100), { onConflict: "stem_hash", ignoreDuplicates: true });
      if (e) {
        setError(e.message);
        setImporting(false);
        return;
      }
    }
    setImporting(false);
    setText("");
    onClose();
    await onImported(`Imported ${rows.length} draft question${rows.length === 1 ? "" : "s"}.`);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Import questions"
      description="Paste a batch in the content/questions format, or choose a .json file. Everything is imported as a draft."
      size="lg"
    >
      <input
        type="file"
        accept="application/json,.json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setText(await f.text());
        }}
        className="block text-[14px] file:mr-3 file:rounded-full file:border file:border-[#1A1A1A] file:bg-white file:px-4 file:py-1.5 file:text-[13px] file:font-semibold"
      />
      <label className="mt-3 block">
        <span className="sr-only">Batch JSON</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{ "questions": [ … ] }'
          className="min-h-40 w-full rounded-lg border border-[#D6D0C4] bg-white px-3 py-2 font-mono text-[12px] focus:border-[#0F5C4A] focus:outline-none focus:ring-2 focus:ring-[#0F5C4A]/30"
        />
      </label>

      {report.parseError && <p role="alert" className="mt-3 text-[14px] text-[#7F1D1D]">{report.parseError}</p>}

      {report.items.length > 0 && (
        <div className="mt-3 space-y-2 text-[14px]" aria-live="polite">
          <p>
            <strong>{report.items.length}</strong> question{report.items.length === 1 ? "" : "s"} found ·{" "}
            <strong>{toImport.length}</strong> ready to import
            {invalid.length > 0 && ` · ${invalid.length} invalid`}
            {duplicates.length > 0 && ` · ${duplicates.length} already in the bank (skipped)`}
            {similar.length > 0 && ` · ${similar.length} near-duplicate${similar.length === 1 ? "" : "s"}`}
          </p>
          {(invalid.length > 0 || similar.length > 0) && (
            <ul className="max-h-48 list-disc space-y-1 overflow-y-auto rounded-xl bg-[#FBF7EE] py-2 pl-8 pr-3 text-[13px]">
              {invalid.map((i) => (
                <li key={`e${i.index}`} className="text-[#7F1D1D]">
                  #{i.index + 1}: {i.errors.join("; ")}
                </li>
              ))}
              {similar.map((i) => (
                <li key={`s${i.index}`} className="text-[#6B3F0E]">
                  #{i.index + 1}: {i.similarTo}
                </li>
              ))}
            </ul>
          )}
          {similar.length > 0 && (
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={allowSimilar} onChange={(e) => setAllowSimilar(e.target.checked)} className="accent-[#0F5C4A]" />
              Import near-duplicates too (only if they are genuinely different questions)
            </label>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-[14px] text-[#7F1D1D]">{error}</p>}

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-full border border-[#1A1A1A] px-5 py-2 text-sm font-semibold">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void runImport()}
          disabled={importing || toImport.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-[#0F5C4A] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {importing && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Import {toImport.length || ""} as drafts
        </button>
      </div>
    </Dialog>
  );
}
