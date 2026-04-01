"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type PaperStatus = "Peer-reviewed" | "Editor's Pick";

type Author = {
  id: string;
  name: string;
  bio: string | null;
};

type ResearchPaper = {
  id: string;
  slug: string;
  title: string;
  abstract: string | null;
  field: string;
  status: PaperStatus;
  pdf_url: string | null;
  created_at: string;
  author: Author | null;
};

function StatusBadge({ status }: { status: PaperStatus }) {
  const isEditorsPick = status === "Editor's Pick";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1",
        "text-[11px] tracking-[0.22em] uppercase font-sans shrink-0",
        isEditorsPick
          ? "border-[#B48A3C] text-[#B48A3C] bg-[#F9F5EA]"
          : "border-[#2F5E4E] text-[#2F5E4E] bg-[#F3F7F5]",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

export default function ResearchLabPage() {
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeField, setActiveField] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<PaperStatus | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "az">("newest");

  useEffect(() => {
    async function fetchPapers() {
      const { data, error } = await supabase
        .from("papers")
        .select(`
          id,
          slug,
          title,
          abstract,
          field,
          status,
          pdf_url,
          created_at,
          author:authors(id, name, bio)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching papers:", error.message);
      } else {
        setPapers(data as unknown as ResearchPaper[]);
      }
      setLoading(false);
    }

    fetchPapers();
  }, []);

  const featuredPapers = papers.filter((p) => p.status === "Editor's Pick").slice(0, 3);
  const allFields = Array.from(new Set(papers.map((p) => p.field))).sort();
  const totalAuthors = new Set(papers.map((p) => p.author?.name).filter(Boolean)).size;

  const filteredPublications = useMemo(() => {
    let results = [...papers];

    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.author?.name.toLowerCase().includes(q) ||
          p.field.toLowerCase().includes(q)
      );
    }

    if (activeField) {
      results = results.filter((p) => p.field === activeField);
    }

    if (activeStatus) {
      results = results.filter((p) => p.status === activeStatus);
    }

    if (sortOrder === "az") {
      results = [...results].sort((a, b) => a.title.localeCompare(b.title));
    }

    return results;
  }, [papers, query, activeField, activeStatus, sortOrder]);

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 md:py-20">

      {/* ── HERO ── */}
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight text-[#1A1A1A]">
            Aponomics Research Lab
          </h1>
          <p className="mt-4 text-[#6B6B6B] text-base md:text-lg">
            A student-led, peer-reviewed research platform
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-4">
          <Link
            href="/research/submit"
            className="inline-flex items-center justify-center rounded-sm border border-[#D6D0C4] bg-[#F7F3EB] px-6 py-3 text-sm font-medium text-[#0F5C4A] hover:opacity-80 transition cursor-pointer"
          >
            Submit Research
          </Link>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
        <div className="bg-[#F0EDE6] rounded-lg px-5 py-4">
          <p className="text-[11px] tracking-[0.16em] uppercase text-[#888070] mb-1">Papers</p>
          <p className="font-serif text-3xl text-[#1A1A1A]">{loading ? "—" : papers.length}</p>
        </div>
        <div className="bg-[#F0EDE6] rounded-lg px-5 py-4">
          <p className="text-[11px] tracking-[0.16em] uppercase text-[#888070] mb-1">Authors</p>
          <p className="font-serif text-3xl text-[#1A1A1A]">{loading ? "—" : totalAuthors}</p>
        </div>
        <div className="bg-[#F0EDE6] rounded-lg px-5 py-4">
          <p className="text-[11px] tracking-[0.16em] uppercase text-[#888070] mb-1">Fields</p>
          <p className="font-serif text-3xl text-[#1A1A1A]">{loading ? "—" : allFields.length}</p>
        </div>
      </div>

      {/* ── FEATURED PAPERS ── */}
      {!loading && featuredPapers.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-2xl md:text-3xl tracking-tight text-[#1A1A1A]">
            Featured Papers
          </h2>
          <p className="mt-3 text-[#6B6B6B] max-w-3xl">
            Curated by our editors for rigor, clarity, and contribution to economic inquiry.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featuredPapers.map((paper) => (
              <Link key={paper.slug} href={`/research/${paper.slug}`} className="group block h-full">
                <article className="h-full border border-[#D6D0C4] bg-[#F7F3EB] rounded-lg p-6 transition hover:opacity-80 cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-[10px] tracking-[0.24em] uppercase text-[#2F5E4E]">
                      {paper.field}
                    </div>
                    <StatusBadge status={paper.status} />
                  </div>
                  <h3 className="mt-4 font-serif text-xl md:text-2xl leading-snug tracking-tight text-[#1A1A1A] group-hover:text-[#2F5E4E] transition-colors">
                    {paper.title}
                  </h3>
                  {paper.abstract && (
                    <p className="mt-2 text-sm text-[#6B6B6B] line-clamp-2">{paper.abstract}</p>
                  )}
                  <p className="mt-3 text-sm text-[#6B6B6B]">
                    By <span className="font-medium text-[#433C30]">{paper.author?.name}</span>
                  </p>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── LATEST PUBLICATIONS ── */}
      <section className="mt-16">
        <h2 className="font-serif text-2xl md:text-3xl tracking-tight text-[#1A1A1A]">
          Latest Publications
        </h2>

        {/* Search bar */}
        <div className="mt-6 relative max-w-xl">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A09880]" width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M10 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM9.5 10.207l3.146 3.147" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or field…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#F0EDE6] border border-[#D6D0C4] rounded-md text-[#1A1A1A] placeholder-[#A09880] focus:outline-none focus:border-[#2F5E4E] transition"
          />
        </div>

        {/* Filter pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveField(null)}
            className={["text-[11px] tracking-[0.14em] uppercase px-3 py-1.5 rounded-full border transition cursor-pointer",
              activeField === null ? "border-[#2F5E4E] text-[#2F5E4E] bg-[#F3F7F5]" : "border-[#D6D0C4] text-[#6B6B6B] hover:border-[#A09880]",
            ].join(" ")}
          >
            All fields
          </button>
          {allFields.map((field) => (
            <button
              key={field}
              onClick={() => setActiveField(activeField === field ? null : field)}
              className={["text-[11px] tracking-[0.14em] uppercase px-3 py-1.5 rounded-full border transition cursor-pointer",
                activeField === field ? "border-[#2F5E4E] text-[#2F5E4E] bg-[#F3F7F5]" : "border-[#D6D0C4] text-[#6B6B6B] hover:border-[#A09880]",
              ].join(" ")}
            >
              {field}
            </button>
          ))}

          <span className="text-[#D6D0C4] select-none">|</span>

          {(["Peer-reviewed", "Editor's Pick"] as PaperStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(activeStatus === status ? null : status)}
              className={["text-[11px] tracking-[0.14em] uppercase px-3 py-1.5 rounded-full border transition cursor-pointer",
                activeStatus === status
                  ? status === "Editor's Pick" ? "border-[#B48A3C] text-[#B48A3C] bg-[#F9F5EA]" : "border-[#2F5E4E] text-[#2F5E4E] bg-[#F3F7F5]"
                  : "border-[#D6D0C4] text-[#6B6B6B] hover:border-[#A09880]",
              ].join(" ")}
            >
              {status}
            </button>
          ))}

          <div className="ml-auto">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "newest" | "az")}
              className="text-[11px] tracking-[0.14em] uppercase bg-transparent border border-[#D6D0C4] rounded-full px-3 py-1.5 text-[#6B6B6B] cursor-pointer focus:outline-none focus:border-[#2F5E4E] transition"
            >
              <option value="newest">Newest first</option>
              <option value="az">A → Z</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="mt-4 text-xs text-[#A09880]">
            {filteredPublications.length === papers.length
              ? `${papers.length} papers`
              : `${filteredPublications.length} of ${papers.length} papers`}
          </p>
        )}

        {/* Publication list */}
        <div className="mt-2 max-w-3xl">
          {loading ? (
            <div className="py-12 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-4 py-4 border-b border-[#D6D0C4]">
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[#E8E4DC] rounded w-1/4" />
                    <div className="h-4 bg-[#E8E4DC] rounded w-3/4" />
                    <div className="h-3 bg-[#E8E4DC] rounded w-1/3" />
                  </div>
                  <div className="h-6 w-24 bg-[#E8E4DC] rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredPublications.length === 0 ? (
            <div className="py-12 text-center text-[#A09880] text-sm">
              {papers.length === 0 ? (
                <>
                  No papers published yet.{" "}
                  <Link href="/research/submit" className="underline hover:text-[#433C30] transition">
                    Be the first to submit.
                  </Link>
                </>
              ) : (
                <>
                  No papers match your search.{" "}
                  <button
                    onClick={() => { setQuery(""); setActiveField(null); setActiveStatus(null); }}
                    className="underline hover:text-[#433C30] transition cursor-pointer"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-0">
              {filteredPublications.map((paper) => (
                <Link
                  key={paper.slug}
                  href={`/research/${paper.slug}`}
                  className="group flex items-start justify-between gap-6 py-4 border-b border-[#D6D0C4] hover:opacity-70 transition cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] tracking-[0.24em] uppercase text-[#2F5E4E]">{paper.field}</div>
                    <h3 className="mt-2 font-serif text-lg leading-snug text-[#1A1A1A] group-hover:text-[#2F5E4E] transition-colors">
                      {paper.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#6B6B6B]">
                      By <span className="font-medium text-[#433C30]">{paper.author?.name}</span>
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <StatusBadge status={paper.status} />
                    {paper.pdf_url && (
                      <a
                        href={paper.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] tracking-[0.14em] uppercase text-[#2F5E4E] border border-[#2F5E4E] rounded-full px-3 py-1 hover:bg-[#F3F7F5] transition"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="mt-20 border-t border-[#D6D0C4] pt-12 max-w-3xl">
        <h2 className="font-serif text-2xl tracking-tight text-[#1A1A1A]">
          Want to contribute your research?
        </h2>
        <p className="mt-3 text-[#6B6B6B]">
          We review submissions on a rolling basis. Our editors evaluate for rigor, clarity, and contribution to economic inquiry.
        </p>
        <div className="mt-6 flex gap-4">
          <Link
            href="/research/submit"
            className="inline-flex items-center justify-center rounded-sm border border-[#D6D0C4] bg-[#F7F3EB] px-6 py-3 text-sm font-medium text-[#0F5C4A] hover:opacity-80 transition"
          >
            Submit a paper
          </Link>
          <Link
            href="/research/dashboard"
            className="inline-flex items-center justify-center rounded-sm border border-[#D6D0C4] px-6 py-3 text-sm font-medium text-[#6B6B6B] hover:opacity-80 transition"
          >
            Editor dashboard
          </Link>
        </div>
      </section>

    </main>
  );
}
