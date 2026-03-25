"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const fieldOptions = [
  "Markets",
  "Growth",
  "Policy",
  "Society",
  "Empirical Methods",
  "Research Design",
];

export default function SubmitResearchPage() {
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [field, setField] = useState(fieldOptions[0] ?? "");
  const [authorName, setAuthorName] = useState("");
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && abstract.trim().length > 0 && authorName.trim().length > 0;
  }, [abstract, authorName, title]);

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 md:py-20">
      <div className="max-w-3xl">
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight text-[#1A1A1A]">
          Submit Research
        </h1>
        <p className="mt-4 text-[#6B6B6B] text-base md:text-lg">
          We aim for quality and selectivity. Submissions are reviewed for research rigor,
          clarity of argument, and transparency of methods.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="mt-10 space-y-6"
        >
          <div className="space-y-2">
            <label className="block text-xs tracking-[0.22em] uppercase text-[#7A7462] font-sans">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-[#D6D0C4] bg-[#F7F3EB] rounded-sm px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#2F5E4E]"
              placeholder="A concise, specific research title"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs tracking-[0.22em] uppercase text-[#7A7462] font-sans">
              Abstract
            </label>
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              rows={7}
              className="w-full border border-[#D6D0C4] bg-[#F7F3EB] rounded-sm px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#2F5E4E]"
              placeholder="Summarize the question, approach, and main findings."
              required
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs tracking-[0.22em] uppercase text-[#7A7462] font-sans">
                Field
              </label>
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full border border-[#D6D0C4] bg-[#F7F3EB] rounded-sm px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#2F5E4E]"
              >
                {fieldOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs tracking-[0.22em] uppercase text-[#7A7462] font-sans">
                Author name
              </label>
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full border border-[#D6D0C4] bg-[#F7F3EB] rounded-sm px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#2F5E4E]"
                placeholder="e.g., Jane Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs tracking-[0.22em] uppercase text-[#7A7462] font-sans">
              Upload PDF
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setPdfFileName(file ? file.name : null);
              }}
              className="w-full text-sm"
            />
            {pdfFileName ? (
              <p className="text-sm text-[#6B6B6B]">
                Selected:{" "}
                <span className="font-medium text-[#433C30]">{pdfFileName}</span>
              </p>
            ) : (
              <p className="text-sm text-[#6B6B6B]">PDF upload is optional for the mock UI.</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`inline-flex items-center justify-center rounded-sm border px-6 py-3 text-sm font-medium transition cursor-pointer ${
                canSubmit
                  ? "border-[#0F5C4A] bg-[#0F5C4A] text-[#F4F1EA] hover:opacity-90"
                  : "border-[#D6D0C4] bg-[#F7F3EB] text-[#6B6B6B] cursor-not-allowed opacity-70"
              }`}
            >
              Submit Research
            </button>

            <div className="text-sm text-[#6B6B6B]">
              Already submitted?{" "}
              <Link
                href="/research/dashboard"
                className="font-medium text-[#0F5C4A] hover:opacity-80 transition cursor-pointer"
              >
                View your dashboard
              </Link>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

