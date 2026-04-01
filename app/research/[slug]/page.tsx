"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Reviewer = {
  name: string;
  affiliation: string | null;
};

type Author = {
  id: string;
  name: string;
  bio: string | null;
  affiliation: string | null;
};

type ResearchPaper = {
  id: string;
  slug: string;
  title: string;
  abstract: string | null;
  field: string;
  status: string;
  pdf_url: string | null;
  original_url: string | null;
  submitted_at: string | null;
  accepted_at: string | null;
  level: string | null;
  topic: string | null;
  introduction: string | null;
  literature_review: string | null;
  methodology: string | null;
  results: string | null;
  discussion: string | null;
  conclusion: string | null;
  created_at: string;
  author: Author | null;
  paper_reviewers: Reviewer[];
};

function ContentSection({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <section className="mt-14 max-w-2xl">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#7A7462] font-sans mb-4">
        {title}
      </h2>
      <div className="space-y-4 text-[17px] leading-[1.75] text-[#433C30]">
        {content.split("\n\n").map((para, idx) => (
          <p key={idx}>{para}</p>
        ))}
      </div>
    </section>
  );
}

function RelatedCard({ slug, title, author, category }: { slug: string; title: string; author: string; category: string }) {
  return (
    <Link href={`/research/${slug}`} className="group block">
      <article className="border-t border-[#D6D0C4] pt-4">
        <p className="text-[10px] tracking-[0.22em] uppercase text-[#2F5E4E] mb-2">{category}</p>
        <h3 className="font-serif text-[17px] leading-snug text-[#1A1A1A] group-hover:text-[#2F5E4E] transition-colors">{title}</h3>
        <p className="mt-2 text-sm text-[#6B6560]">By {author}</p>
      </article>
    </Link>
  );
}

export default function ResearchPaperPage() {
  const { slug } = useParams<{ slug: string }>();
  const [paper, setPaper] = useState<ResearchPaper | null>(null);
  const [related, setRelated] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<"read" | "pdf">("read");

  useEffect(() => {
    async function fetchPaper() {
      const { data, error } = await supabase
        .from("papers")
        .select(`
          id, slug, title, abstract, field, status, pdf_url, original_url,
          submitted_at, accepted_at, level, topic,
          introduction, literature_review, methodology, results, discussion, conclusion,
          created_at,
          author:authors(id, name, bio, affiliation),
          paper_reviewers(name, affiliation)
        `)
        .eq("slug", slug)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPaper(data as unknown as ResearchPaper);

      const { data: relatedData } = await supabase
        .from("papers")
        .select("id, slug, title, field, author:authors(name)")
        .eq("field", data.field)
        .neq("slug", slug)
        .limit(3);

      if (relatedData) setRelated(relatedData as unknown as ResearchPaper[]);
      setLoading(false);
    }

    if (slug) fetchPaper();
  }, [slug]);

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="animate-pulse space-y-6 max-w-2xl">
          <div className="h-4 bg-[#E8E4DC] rounded w-1/4" />
          <div className="h-10 bg-[#E8E4DC] rounded w-3/4" />
          <div className="h-4 bg-[#E8E4DC] rounded w-1/3" />
          <div className="space-y-3 mt-8">
            <div className="h-4 bg-[#E8E4DC] rounded" />
            <div className="h-4 bg-[#E8E4DC] rounded" />
            <div className="h-4 bg-[#E8E4DC] rounded w-5/6" />
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !paper) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-[#6B6560]">Paper not found.</p>
        <Link href="/research" className="mt-4 inline-block text-sm text-[#2F5E4E] underline">
          Back to Research Lab
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 md:py-20">
      <div className="max-w-5xl">
        <Link href="/research" className="inline-flex items-center gap-1.5 text-sm text-[#6B6560] hover:text-[#2F5E4E] transition mb-10">
          ← Research Lab
        </Link>

        <div className="flex flex-col md:flex-row gap-16">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] tracking-[0.24em] uppercase text-[#2F5E4E]">{paper.field}</span>
              <span className="inline-flex items-center rounded-full border border-[#2F5E4E] px-3 py-1 text-[11px] tracking-[0.22em] uppercase text-[#2F5E4E] bg-[#F3F7F5]">
                {paper.status}
              </span>
            </div>

            <h1 className="mt-4 font-serif text-3xl md:text-4xl leading-tight tracking-tight text-[#1A1A1A]">
              {paper.title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#6B6560]">
              <span>By <span className="font-medium text-[#433C30]">{paper.author?.name}</span></span>
              {paper.submitted_at && <span>Submitted {paper.submitted_at}</span>}
              {paper.accepted_at && <span>Accepted {paper.accepted_at}</span>}
            </div>

            <div className="mt-8 flex items-center gap-1 flex-wrap bg-[#F0EDE6] rounded-full px-2 py-1 w-fit" role="toolbar">
              <button type="button" onClick={() => setView("read")}
                className={["rounded-full px-4 py-2 text-sm transition", view === "read" ? "bg-[#E8EFE9] text-[#1A4D3E] ring-1 ring-[#2F5E4E]/25" : "text-[#6B6560] hover:text-[#2F5E4E]"].join(" ")}>
                Read Online
              </button>
              <button type="button" onClick={() => setView("pdf")}
                className={["rounded-full px-4 py-2 text-sm transition", view === "pdf" ? "bg-[#E8EFE9] text-[#1A4D3E] ring-1 ring-[#2F5E4E]/25" : "text-[#6B6560] hover:text-[#2F5E4E]"].join(" ")}>
                View PDF
              </button>
              <span className="hidden sm:inline text-[#D6D0C4] px-1">|</span>
              {paper.pdf_url && (
                <a href={paper.pdf_url} target="_blank" rel="noreferrer"
                  className="rounded-full border border-[#D6D0C4] px-4 py-2 text-sm text-[#433C30] hover:border-[#2F5E4E]/40 hover:text-[#2F5E4E] transition">
                  Download PDF
                </a>
              )}
            </div>

            {view === "pdf" ? (
              <section className="mt-16 py-24 text-center">
                <p className="text-[15px] text-[#6B6560] font-sans tracking-wide">PDF viewer coming soon</p>
              </section>
            ) : (
              <>
                <ContentSection title="Abstract" content={paper.abstract} />
                <article className="max-w-4xl">
                  <ContentSection title="Introduction" content={paper.introduction} />
                  <ContentSection title="Literature Review" content={paper.literature_review} />
                  <ContentSection title="Methodology" content={paper.methodology} />
                  <ContentSection title="Results" content={paper.results} />
                  <ContentSection title="Discussion" content={paper.discussion} />
                  <ContentSection title="Conclusion" content={paper.conclusion} />
                </article>
              </>
            )}

            {paper.paper_reviewers?.length > 0 && (
              <section className="mt-16 max-w-2xl border-t border-[#D6D0C4]/70 pt-8">
                <h2 className="text-lg font-semibold text-[#1A1A1A] font-sans mb-6">Peer review</h2>
                <p className="text-[12px] uppercase tracking-[0.16em] text-[#7A7462] font-sans mb-2">Reviewed by</p>
                <ul className="space-y-2 text-[15px] text-[#433C30]">
                  {paper.paper_reviewers.map((r, i) => (
                    <li key={i}>{r.name}{r.affiliation && <span className="text-[#6B6560]"> ({r.affiliation})</span>}</li>
                  ))}
                </ul>
              </section>
            )}

            {related.length > 0 && (
              <section className="mt-16">
                <h2 className="text-lg font-semibold text-[#1A1A1A] font-sans mb-8">Related research</h2>
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((p) => (
                    <RelatedCard key={p.slug} slug={p.slug} title={p.title} author={p.author?.name ?? ""} category={p.field} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="hidden md:block md:w-64 shrink-0 md:sticky md:top-24 self-start space-y-10 text-[14px]">
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-[#7A7462] font-sans mb-4">About this paper</h3>
              <ul className="space-y-3 text-[#433C30]">
                <li className="flex gap-2"><span className="text-[#2F5E4E]">✓</span><span>{paper.status}</span></li>
                {paper.level && <li><span className="text-[#6B6560]">Level:</span> {paper.level}</li>}
                {paper.topic && <li><span className="text-[#6B6560]">Topic:</span> {paper.topic}</li>}
                {paper.original_url && (
                  <li><a href={paper.original_url} target="_blank" rel="noreferrer" className="text-[#2F5E4E] underline hover:opacity-70 transition">Original source ↗</a></li>
                )}
              </ul>
            </div>

            {paper.author && (
              <div className="pt-2 border-t border-[#D6D0C4]/60">
                <h3 className="text-[11px] uppercase tracking-[0.18em] text-[#7A7462] font-sans mb-3">Author</h3>
                <p className="font-medium text-[#1A1A1A]">{paper.author.name}</p>
                {paper.author.affiliation && <p className="text-[13px] text-[#6B6560] mt-1">{paper.author.affiliation}</p>}
                {paper.author.bio && <p className="mt-3 leading-relaxed text-[#6B6560] text-[13px]">{paper.author.bio}</p>}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
