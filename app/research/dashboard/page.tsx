"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Submission = {
  id: string;
  title: string;
  abstract: string | null;
  field: string | null;
  introduction: string | null;
  literature_review: string | null;
  methodology: string | null;
  results: string | null;
  discussion: string | null;
  conclusion: string | null;
  author_name: string;
  author_bio: string | null;
  author_affiliation: string | null;
  level: string | null;
  topic: string | null;
  pdf_url: string | null;
  review_status: "pending" | "approved" | "rejected";
  submitted_at: string;
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function StatusPill({ status }: { status: Submission["review_status"] }) {
  const styles = {
    pending: "border-[#B48A3C] text-[#B48A3C] bg-[#F9F5EA]",
    approved: "border-[#2F5E4E] text-[#2F5E4E] bg-[#F3F7F5]",
    rejected: "border-[#8B3A3A] text-[#8B3A3A] bg-[#FDF0F0]",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] tracking-[0.18em] uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || !["admin", "editor"].includes(profile.role)) {
        router.push("/");
        return;
      }

      setAuthorized(true);
      await fetchSubmissions();
      setLoading(false);
    }

    checkAuth();
  }, []);

  async function fetchSubmissions() {
    const { data } = await supabase
      .from("paper_submissions")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (data) setSubmissions(data as Submission[]);
  }

  async function handleApprove(submission: Submission) {
    setActing(submission.id);
    try {
      // 1. Create or find author
      let authorId: string;

      const { data: existingAuthor } = await supabase
        .from("authors")
        .select("id")
        .eq("name", submission.author_name)
        .single();

      if (existingAuthor) {
        authorId = existingAuthor.id;
      } else {
        const { data: newAuthor, error: authorError } = await supabase
          .from("authors")
          .insert({
            name: submission.author_name,
            bio: submission.author_bio,
            affiliation: submission.author_affiliation,
          })
          .select("id")
          .single();

        if (authorError || !newAuthor) throw new Error("Failed to create author");
        authorId = newAuthor.id;
      }

      // 2. Generate unique slug
      const baseSlug = slugify(submission.title);
      let slug = baseSlug;
      let attempt = 0;

      while (true) {
        const { data: existing } = await supabase
          .from("papers")
          .select("id")
          .eq("slug", slug)
          .single();

        if (!existing) break;
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      // 3. Insert into papers
      const { error: paperError } = await supabase
        .from("papers")
        .insert({
          slug,
          title: submission.title,
          abstract: submission.abstract,
          field: submission.field,
          status: "Peer-reviewed",
          pdf_url: submission.pdf_url,
          author_id: authorId,
          introduction: submission.introduction,
          literature_review: submission.literature_review,
          methodology: submission.methodology,
          results: submission.results,
          discussion: submission.discussion,
          conclusion: submission.conclusion,
          level: submission.level,
          topic: submission.topic,
          submitted_at: new Date(submission.submitted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          accepted_at: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        });

      if (paperError) throw new Error(paperError.message);

      // 4. Update submission status
      await supabase
        .from("paper_submissions")
        .update({ review_status: "approved" })
        .eq("id", submission.id);

      setMessage({ id: submission.id, text: "Paper approved and published.", type: "success" });
      await fetchSubmissions();
    } catch (err: unknown) {
      setMessage({ id: submission.id, text: err instanceof Error ? err.message : "Something went wrong.", type: "error" });
    } finally {
      setActing(null);
    }
  }

  async function handleReject(submission: Submission) {
    setActing(submission.id);
    try {
      await supabase
        .from("paper_submissions")
        .update({ review_status: "rejected" })
        .eq("id", submission.id);

      setMessage({ id: submission.id, text: "Submission rejected.", type: "error" });
      await fetchSubmissions();
    } catch {
      setMessage({ id: submission.id, text: "Failed to reject.", type: "error" });
    } finally {
      setActing(null);
    }
  }

  const filtered = submissions.filter((s) => filter === "all" || s.review_status === filter);
  const counts = {
    all: submissions.length,
    pending: submissions.filter((s) => s.review_status === "pending").length,
    approved: submissions.filter((s) => s.review_status === "approved").length,
    rejected: submissions.filter((s) => s.review_status === "rejected").length,
  };

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="animate-pulse space-y-4 max-w-2xl">
          <div className="h-8 bg-[#E8E4DC] rounded w-1/3" />
          <div className="h-4 bg-[#E8E4DC] rounded w-1/2" />
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 md:py-20">

      {/* Header */}
      <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
        <div>
          <Link href="/research" className="text-sm text-[#6B6560] hover:text-[#2F5E4E] transition">
            ← Research Lab
          </Link>
          <h1 className="mt-4 font-serif text-3xl md:text-4xl tracking-tight text-[#1A1A1A]">
            Editor Dashboard
          </h1>
          <p className="mt-2 text-[#6B6B6B]">Review and publish submitted research papers.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-serif text-[#B48A3C]">{counts.pending}</p>
          <p className="text-xs tracking-[0.16em] uppercase text-[#888070]">Pending review</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-8">
        {(["pending", "all", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "text-[11px] tracking-[0.14em] uppercase px-4 py-2 rounded-full border transition cursor-pointer",
              filter === f
                ? "border-[#2F5E4E] text-[#2F5E4E] bg-[#F3F7F5]"
                : "border-[#D6D0C4] text-[#6B6B6B] hover:border-[#A09880]",
            ].join(" ")}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Submissions list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-[#A09880] text-sm">
          No {filter === "all" ? "" : filter} submissions yet.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((sub) => (
            <div key={sub.id} className="border border-[#D6D0C4] rounded-lg bg-[#F7F3EB] overflow-hidden">

              {/* Card header */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      {sub.field && (
                        <span className="text-[10px] tracking-[0.24em] uppercase text-[#2F5E4E]">
                          {sub.field}
                        </span>
                      )}
                      <StatusPill status={sub.review_status} />
                    </div>
                    <h2 className="font-serif text-xl leading-snug text-[#1A1A1A]">
                      {sub.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6B6B6B]">
                      <span>By <span className="font-medium text-[#433C30]">{sub.author_name}</span></span>
                      {sub.author_affiliation && <span>{sub.author_affiliation}</span>}
                      <span>Submitted {new Date(sub.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {sub.review_status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleReject(sub)}
                        disabled={acting === sub.id}
                        className="px-4 py-2 text-sm border border-[#D6D0C4] rounded-sm text-[#6B6560] hover:border-[#8B3A3A] hover:text-[#8B3A3A] transition disabled:opacity-50 cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(sub)}
                        disabled={acting === sub.id}
                        className="px-4 py-2 text-sm border border-[#2F5E4E] bg-[#2F5E4E] rounded-sm text-white hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
                      >
                        {acting === sub.id ? "Publishing…" : "Approve & Publish"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Message */}
                {message?.id === sub.id && (
                  <div className={`mt-3 text-sm px-3 py-2 rounded ${message.type === "success" ? "bg-[#F3F7F5] text-[#2F5E4E]" : "bg-[#FDF0F0] text-[#8B3A3A]"}`}>
                    {message.text}
                  </div>
                )}

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                  className="mt-4 text-xs text-[#A09880] hover:text-[#2F5E4E] transition cursor-pointer"
                >
                  {expanded === sub.id ? "Hide details ↑" : "View full submission ↓"}
                </button>
              </div>

              {/* Expanded content */}
              {expanded === sub.id && (
                <div className="border-t border-[#D6D0C4] px-6 py-6 space-y-6 bg-[#FAF8F3]">
                  {sub.abstract && (
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-[#888070] mb-2">Abstract</p>
                      <p className="text-sm text-[#433C30] leading-relaxed">{sub.abstract}</p>
                    </div>
                  )}
                  {[
                    { key: "introduction", label: "Introduction" },
                    { key: "literature_review", label: "Literature Review" },
                    { key: "methodology", label: "Methodology" },
                    { key: "results", label: "Results" },
                    { key: "discussion", label: "Discussion" },
                    { key: "conclusion", label: "Conclusion" },
                  ].map(({ key, label }) =>
                    sub[key as keyof Submission] ? (
                      <div key={key}>
                        <p className="text-[10px] tracking-[0.2em] uppercase text-[#888070] mb-2">{label}</p>
                        <p className="text-sm text-[#433C30] leading-relaxed">{sub[key as keyof Submission] as string}</p>
                      </div>
                    ) : null
                  )}
                  {sub.author_bio && (
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-[#888070] mb-2">Author bio</p>
                      <p className="text-sm text-[#433C30]">{sub.author_bio}</p>
                    </div>
                  )}
                  {sub.pdf_url && (
                    <a href={sub.pdf_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[#2F5E4E] border border-[#2F5E4E] rounded-full px-4 py-2 hover:bg-[#F3F7F5] transition">
                      View PDF ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
