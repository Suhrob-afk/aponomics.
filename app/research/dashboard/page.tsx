import Link from "next/link";

type SubmissionStatus = "Under Review" | "Accepted" | "Revise";

type ResearchSubmission = {
  slug: string;
  title: string;
  status: SubmissionStatus;
};

const submissions: ResearchSubmission[] = [
  {
    slug: "peer-review-signal",
    title: "Peer Review as a Signal: Quality Control in Student Research",
    status: "Under Review",
  },
  {
    slug: "measuring-incidence-2",
    title: "Robust Estimation Under Misclassification: Practical Guidance",
    status: "Revise",
  },
  {
    slug: "policy-communication",
    title: "Policy Communication and Public Trust: Evidence from Natural Experiments",
    status: "Accepted",
  },
  {
    slug: "incentives-labs",
    title: "Incentives in Research Labs: Participation, Feedback, and Learning",
    status: "Under Review",
  },
];

function SubmissionBadge({ status }: { status: SubmissionStatus }) {
  const style =
    status === "Accepted"
      ? "border-[#0F5C4A] text-[#0F5C4A] bg-[#F3F7F5]"
      : status === "Revise"
        ? "border-[#A45A3A] text-[#A45A3A] bg-[#FBF5F1]"
        : "border-[#2C3E5A] text-[#2C3E5A] bg-[#F3F5FB]";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1",
        "text-[11px] tracking-[0.22em] uppercase",
        "font-sans",
        style,
      ].join(" ")}
    >
      {status}
    </span>
  );
}

export default function ResearchDashboardPage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16 md:py-20">
      <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight text-[#1A1A1A]">
        My Submissions
      </h1>
      <p className="mt-4 text-[#6B6B6B] text-base md:text-lg max-w-3xl">
        Track the status of your research submissions. This dashboard is UI-only for
        now and uses mock data.
      </p>

      <section className="mt-10 max-w-3xl">
        <div className="space-y-0">
          {submissions.map((submission) => (
            <Link
              key={submission.slug}
              href={`/research/${submission.slug}`}
              className="group flex items-start justify-between gap-6 py-4 border-b border-[#D6D0C4] hover:opacity-70 transition cursor-pointer"
            >
              <div className="min-w-0">
                <h2 className="font-serif text-lg leading-snug text-[#1A1A1A] group-hover:text-[#2F5E4E] transition-colors">
                  {submission.title}
                </h2>
              </div>
              <div className="shrink-0">
                <SubmissionBadge status={submission.status} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

