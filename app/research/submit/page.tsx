"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const FIELDS = [
  "Academic Governance",
  "Empirical Methods",
  "Labor & Education",
  "Macroeconomics",
  "Methodology",
  "Policy",
  "Research Design",
  "Other",
];

type FormState = {
  title: string;
  abstract: string;
  field: string;
  introduction: string;
  literature_review: string;
  methodology: string;
  results: string;
  discussion: string;
  conclusion: string;
  author_name: string;
  author_bio: string;
  author_affiliation: string;
  level: string;
  topic: string;
};

const EMPTY: FormState = {
  title: "",
  abstract: "",
  field: "",
  introduction: "",
  literature_review: "",
  methodology: "",
  results: "",
  discussion: "",
  conclusion: "",
  author_name: "",
  author_bio: "",
  author_affiliation: "",
  level: "",
  topic: "",
};

type Step = "details" | "content" | "author" | "review" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "details", label: "Paper details" },
  { key: "content", label: "Full content" },
  { key: "author", label: "Author info" },
  { key: "review", label: "Review & submit" },
];

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] tracking-[0.16em] uppercase text-[#888070] mb-2">
      {children}
      {required && <span className="text-[#B48A3C] ml-1">*</span>}
    </label>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 text-sm bg-[#F7F3EB] border border-[#D6D0C4] rounded-md text-[#1A1A1A] placeholder-[#A09880] focus:outline-none focus:border-[#2F5E4E] transition"
    />
  );
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-4 py-3 text-sm bg-[#F7F3EB] border border-[#D6D0C4] rounded-md text-[#1A1A1A] placeholder-[#A09880] focus:outline-none focus:border-[#2F5E4E] transition resize-none"
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-4 py-3 text-sm bg-[#F7F3EB] border border-[#D6D0C4] rounded-md text-[#1A1A1A] focus:outline-none focus:border-[#2F5E4E] transition cursor-pointer"
    >
      {children}
    </select>
  );
}

export default function SubmitPage() {
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      let pdf_url: string | null = null;

      // Upload PDF if provided
      if (pdfFile) {
        const fileName = `${Date.now()}-${pdfFile.name.replace(/\s+/g, "-")}`;
        const { error: uploadError } = await supabase.storage
          .from("papers")
          .upload(fileName, pdfFile);

        if (uploadError) throw new Error("PDF upload failed: " + uploadError.message);

        const { data: urlData } = supabase.storage
          .from("papers")
          .getPublicUrl(fileName);

        pdf_url = urlData.publicUrl;
      }

      // Insert into paper_submissions
      const { error: insertError } = await supabase
        .from("paper_submissions")
        .insert({
          title: form.title,
          abstract: form.abstract,
          field: form.field,
          introduction: form.introduction || null,
          literature_review: form.literature_review || null,
          methodology: form.methodology || null,
          results: form.results || null,
          discussion: form.discussion || null,
          conclusion: form.conclusion || null,
          author_name: form.author_name,
          author_bio: form.author_bio || null,
          author_affiliation: form.author_affiliation || null,
          level: form.level || null,
          topic: form.topic || null,
          pdf_url,
          review_status: "pending",
        });

      if (insertError) throw new Error(insertError.message);

      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <main className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="max-w-xl">
          <Link href="/research" className="inline-flex items-center gap-1.5 text-sm text-[#6B6560] hover:text-[#2F5E4E] transition mb-10">
            ← Research Lab
          </Link>
          <div className="bg-[#F3F7F5] border border-[#C4D8CE] rounded-lg p-8">
            <div className="text-[#2F5E4E] text-2xl mb-3">✓</div>
            <h1 className="font-serif text-2xl text-[#1A1A1A] mb-3">Submission received</h1>
            <p className="text-[#6B6B6B] text-sm leading-relaxed">
              Thank you, <strong>{form.author_name}</strong>. Your paper <em>"{form.title}"</em> has been submitted for review. Our editors will evaluate it and you'll hear back within a few weeks.
            </p>
            <Link
              href="/research"
              className="mt-6 inline-flex items-center justify-center rounded-sm border border-[#D6D0C4] bg-[#F7F3EB] px-5 py-2.5 text-sm font-medium text-[#0F5C4A] hover:opacity-80 transition"
            >
              Back to Research Lab
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 md:py-20">
      <div className="max-w-2xl">

        {/* Back */}
        <Link href="/research" className="inline-flex items-center gap-1.5 text-sm text-[#6B6560] hover:text-[#2F5E4E] transition mb-10">
          ← Research Lab
        </Link>

        {/* Header */}
        <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-[#1A1A1A]">
          Submit a paper
        </h1>
        <p className="mt-3 text-[#6B6B6B]">
          We review all submissions for rigor, clarity, and contribution to economic inquiry.
        </p>

        {/* Step indicator */}
        <div className="mt-8 flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={[
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition",
                  i < currentStepIndex
                    ? "bg-[#2F5E4E] text-white"
                    : i === currentStepIndex
                    ? "border-2 border-[#2F5E4E] text-[#2F5E4E]"
                    : "border border-[#D6D0C4] text-[#A09880]",
                ].join(" ")}>
                  {i < currentStepIndex ? "✓" : i + 1}
                </div>
                <span className={[
                  "text-[11px] tracking-[0.12em] uppercase hidden sm:block",
                  i === currentStepIndex ? "text-[#2F5E4E]" : "text-[#A09880]",
                ].join(" ")}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={["mx-3 h-px w-8 transition", i < currentStepIndex ? "bg-[#2F5E4E]" : "bg-[#D6D0C4]"].join(" ")} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="mt-10 space-y-6">

          {/* STEP 1: Paper details */}
          {step === "details" && (
            <>
              <div>
                <Label required>Paper title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="The full title of your paper"
                />
              </div>
              <div>
                <Label required>Abstract</Label>
                <Textarea
                  rows={5}
                  value={form.abstract}
                  onChange={(e) => set("abstract", e.target.value)}
                  placeholder="A concise summary of your paper (200–300 words)"
                />
              </div>
              <div>
                <Label required>Field</Label>
                <Select value={form.field} onChange={(e) => set("field", e.target.value)}>
                  <option value="">Select a field</option>
                  {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Level</Label>
                  <Select value={form.level} onChange={(e) => set("level", e.target.value)}>
                    <option value="">Select level</option>
                    <option value="High School">High School</option>
                    <option value="University">University</option>
                  </Select>
                </div>
                <div>
                  <Label>Topic</Label>
                  <Input
                    value={form.topic}
                    onChange={(e) => set("topic", e.target.value)}
                    placeholder="e.g. Inflation, Trade"
                  />
                </div>
              </div>
              <div>
                <Label>PDF file</Label>
                <div className="border border-dashed border-[#D6D0C4] rounded-md px-4 py-6 text-center bg-[#F7F3EB]">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    {pdfFile ? (
                      <span className="text-sm text-[#2F5E4E] font-medium">{pdfFile.name}</span>
                    ) : (
                      <span className="text-sm text-[#A09880]">Click to upload PDF <span className="text-[#C8C0B0]">(optional)</span></span>
                    )}
                  </label>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Full content */}
          {step === "content" && (
            <>
              <p className="text-sm text-[#6B6B6B] -mt-2">
                All sections are optional — fill in what you have. You can always have the editor add more after approval.
              </p>
              {[
                { key: "introduction", label: "Introduction" },
                { key: "literature_review", label: "Literature Review" },
                { key: "methodology", label: "Methodology" },
                { key: "results", label: "Results" },
                { key: "discussion", label: "Discussion" },
                { key: "conclusion", label: "Conclusion" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Textarea
                    rows={4}
                    value={form[key as keyof FormState]}
                    onChange={(e) => set(key as keyof FormState, e.target.value)}
                    placeholder={`Write your ${label.toLowerCase()} here…`}
                  />
                </div>
              ))}
            </>
          )}

          {/* STEP 3: Author info */}
          {step === "author" && (
            <>
              <div>
                <Label required>Full name</Label>
                <Input
                  value={form.author_name}
                  onChange={(e) => set("author_name", e.target.value)}
                  placeholder="Your full name or initials"
                />
              </div>
              <div>
                <Label>Affiliation</Label>
                <Input
                  value={form.author_affiliation}
                  onChange={(e) => set("author_affiliation", e.target.value)}
                  placeholder="School, university, or institution"
                />
              </div>
              <div>
                <Label>Short bio</Label>
                <Textarea
                  rows={3}
                  value={form.author_bio}
                  onChange={(e) => set("author_bio", e.target.value)}
                  placeholder="A sentence or two about your research interests"
                />
              </div>
            </>
          )}

          {/* STEP 4: Review */}
          {step === "review" && (
            <>
              <div className="space-y-4 text-sm">
                {[
                  { label: "Title", value: form.title },
                  { label: "Field", value: form.field },
                  { label: "Level", value: form.level },
                  { label: "Author", value: form.author_name },
                  { label: "Affiliation", value: form.author_affiliation },
                  { label: "PDF", value: pdfFile?.name ?? "None" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-4 py-3 border-b border-[#D6D0C4]">
                    <span className="text-[#888070] w-28 shrink-0">{label}</span>
                    <span className="text-[#1A1A1A]">{value || <span className="text-[#A09880]">—</span>}</span>
                  </div>
                ))}
                <div className="py-3 border-b border-[#D6D0C4]">
                  <span className="text-[#888070] block mb-1">Abstract</span>
                  <p className="text-[#433C30] leading-relaxed line-clamp-3">{form.abstract}</p>
                </div>
              </div>

              {error && (
                <div className="bg-[#FDF0F0] border border-[#E8C4C4] rounded-md px-4 py-3 text-sm text-[#8B3A3A]">
                  {error}
                </div>
              )}

              <p className="text-xs text-[#A09880]">
                By submitting, you confirm this is your original work and you agree to our review process.
              </p>
            </>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="mt-10 flex items-center justify-between">
          {currentStepIndex > 0 ? (
            <button
              onClick={() => setStep(STEPS[currentStepIndex - 1].key)}
              className="text-sm text-[#6B6560] hover:text-[#2F5E4E] transition cursor-pointer"
            >
              ← Back
            </button>
          ) : <div />}

          {step === "review" ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-sm border border-[#2F5E4E] bg-[#2F5E4E] px-8 py-3 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Submitting…" : "Submit paper"}
            </button>
          ) : (
            <button
              onClick={() => {
                if (step === "details" && (!form.title || !form.abstract || !form.field)) {
                  setError("Please fill in title, abstract, and field before continuing.");
                  return;
                }
                if (step === "author" && !form.author_name) {
                  setError("Please enter your name before continuing.");
                  return;
                }
                setError(null);
                setStep(STEPS[currentStepIndex + 1].key);
              }}
              className="inline-flex items-center justify-center rounded-sm border border-[#D6D0C4] bg-[#F7F3EB] px-8 py-3 text-sm font-medium text-[#0F5C4A] hover:opacity-80 transition cursor-pointer"
            >
              Continue →
            </button>
          )}
        </div>

        {error && step !== "review" && (
          <p className="mt-3 text-sm text-[#8B3A3A]">{error}</p>
        )}

      </div>
    </main>
  );
}
