import Link from "next/link";

type PaperStatus = "Peer-reviewed" | "Editor's Pick";

type ResearchPaper = {
  slug: string;
  title: string;
  author: string;
  field: string;
  status: PaperStatus;
};

const featuredPapers: ResearchPaper[] = [
  {
    slug: "peer-review-signal",
    title: "Peer Review as a Signal: Quality Control in Student Research",
    author: "A. Nguyen",
    field: "Academic Governance",
    status: "Editor's Pick",
  },
  {
    slug: "measuring-incidence",
    title: "Measuring Incidence with Sparse Evidence: An Econometric Toolkit",
    author: "R. Patel",
    field: "Empirical Methods",
    status: "Peer-reviewed",
  },
  {
    slug: "policy-communication",
    title: "Policy Communication and Public Trust: Evidence from Natural Experiments",
    author: "S. Okafor",
    field: "Policy",
    status: "Peer-reviewed",
  },
];

const latestPublications: ResearchPaper[] = [
  {
    slug: "measuring-incidence-2",
    title: "Robust Estimation Under Misclassification: Practical Guidance",
    author: "L. Chen",
    field: "Methodology",
    status: "Peer-reviewed",
  },
  {
    slug: "incentives-labs",
    title: "Incentives in Research Labs: Participation, Feedback, and Learning",
    author: "M. Davis",
    field: "Labor & Education",
    status: "Peer-reviewed",
  },
  {
    slug: "boundary-conditions",
    title: "Boundary Conditions for Causal Claims in Student-Led Studies",
    author: "T. Garcia",
    field: "Research Design",
    status: "Editor's Pick",
  },
  {
    slug: "peer-review-signal-2",
    title: "A Comparative Review of Review Rubrics: Consistency and Bias",
    author: "K. Mensah",
    field: "Academic Governance",
    status: "Peer-reviewed",
  },
  {
    slug: "policy-communication-2",
    title: "When Messages Backfire: Heterogeneous Effects of Policy Framing",
    author: "J. Ibrahim",
    field: "Policy",
    status: "Peer-reviewed",
  },
];

function StatusBadge({ status }: { status: PaperStatus }) {
  const isEditorsPick = status === "Editor's Pick";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1",
        "text-[11px] tracking-[0.22em] uppercase",
        "font-sans",
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
  return (
    <main className="max-w-6xl mx-auto px-6 py-16 md:py-20">
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
          <p className="text-sm text-[#6B6B6B]">
            Acceptance rate: <span className="font-medium text-[#433C30]">18%</span> (static mock)
          </p>
          <Link
            href="/research/submit"
            className="inline-flex items-center justify-center rounded-sm border border-[#D6D0C4] bg-[#F7F3EB] px-6 py-3 text-sm font-medium text-[#0F5C4A] hover:opacity-80 transition cursor-pointer"
          >
            Submit Research
          </Link>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="font-serif text-2xl md:text-3xl tracking-tight text-[#1A1A1A]">
          Featured Papers
        </h2>
        <p className="mt-3 text-[#6B6B6B] max-w-3xl">
          Curated by our editors for rigor, clarity, and contribution to economic inquiry.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {featuredPapers.map((paper) => (
            <Link
              key={paper.slug}
              href={`/research/${paper.slug}`}
              className="group block h-full"
            >
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

                <p className="mt-3 text-sm text-[#6B6B6B]">
                  By{" "}
                  <span className="font-medium text-[#433C30]">{paper.author}</span>
                </p>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <h2 className="font-serif text-2xl md:text-3xl tracking-tight text-[#1A1A1A]">
            Latest Publications
          </h2>
          <p className="text-sm text-[#6B6B6B]">
            Updated regularly (static mock)
          </p>
        </div>

        <div className="mt-8 max-w-3xl">
          <div className="space-y-0">
            {latestPublications.map((paper) => (
              <Link
                key={paper.slug}
                href={`/research/${paper.slug}`}
                className="group flex items-start justify-between gap-6 py-4 border-b border-[#D6D0C4] hover:opacity-70 transition cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-[10px] tracking-[0.24em] uppercase text-[#2F5E4E]">
                    {paper.field}
                  </div>
                  <h3 className="mt-2 font-serif text-lg leading-snug text-[#1A1A1A] group-hover:text-[#2F5E4E] transition-colors">
                    {paper.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#6B6B6B]">
                    By{" "}
                    <span className="font-medium text-[#433C30]">{paper.author}</span>
                  </p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={paper.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

