"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";

type PaperStatus = "Peer-reviewed";

type ResearchPaper = {
  slug: string;
  title: string;
  author: string;
  field: string;
  status: PaperStatus;
  pdfUrl: string;
  originalUrl: string;
  submittedAt: string;
  acceptedAt: string;
  level: "High School" | "University";
  topic: string;
  authorBio: string;
  abstract: string[];
  introduction: string[];
  literatureReview: string[];
  methodology: string[];
  results: string[];
  discussion: string[];
  conclusion: string[];
  reviewers: { name: string; affiliation?: string }[];
  decision: string;
};

const DUMMY_PDF_URL =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

const DUMMY_ORIGINAL_URL = "https://example.com";

const papers: Record<string, ResearchPaper> = {
  "peer-review-signal": {
    slug: "peer-review-signal",
    title: "Peer Review as a Signal: Quality Control in Student Research",
    author: "A. Nguyen",
    field: "Academic Governance",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    submittedAt: "March 2, 2025",
    acceptedAt: "August 14, 2025",
    level: "University",
    topic: "Policy",
    authorBio:
      "Graduate researcher focused on academic institutions and research quality signals.",
    abstract: [
      "This study examines peer review as a signaling mechanism for student research quality. We argue that structured feedback alters the probability of publishing credible claims.",
      "Using a mock dataset of submissions and editorial outcomes, we illustrate how rubric-based evaluation reduces variance in methodological reporting.",
    ],
    introduction: [
      "Student-led research often faces constraints in time, training, and tooling. These pressures can affect clarity and methodological transparency.",
      "Peer review is widely treated as quality assurance, but its mechanism is frequently described qualitatively. We formalize peer review as a signal about research rigor.",
    ],
    literatureReview: [
      "Prior work emphasizes editorial gatekeeping and reputational sorting; fewer studies treat review as an explicit signal observable to readers.",
      "We connect this literature to student research contexts where mentorship and rubric design vary widely across institutions.",
    ],
    methodology: [
      "We construct a rubric aligned with research design criteria: identification strategy, measurement validity, and internal consistency.",
      "Editorial decisions are mapped to reviewer scores, then compared across field categories to estimate whether structured review decreases reporting gaps.",
    ],
    results: [
      "Rubric-based review is associated with higher completeness in methods sections and lower incidence of unsupported causal language.",
      "Editorial selection effects are strongest in domains requiring careful identification (e.g., quasi-experimental designs).",
    ],
    discussion: [
      "The findings suggest that transparent rubrics make peer review legible as a quality signal, not only as a pass/fail filter.",
      "Limitations include reliance on mock data; field trials would be needed to validate external validity.",
    ],
    conclusion: [
      "Peer review can function as a practical signaling device when evaluation is transparent and rubric-driven.",
      "Future work should test whether these gains persist when student teams vary in experience and access to mentorship.",
    ],
    reviewers: [
      { name: "Professor M. Okonkwo", affiliation: "AUT" },
      { name: "Student Editor J. Park" },
    ],
    decision: "Accepted",
  },
  "measuring-incidence": {
    slug: "measuring-incidence",
    title: "Measuring Incidence with Sparse Evidence: An Econometric Toolkit",
    author: "R. Patel",
    field: "Empirical Methods",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    submittedAt: "January 18, 2025",
    acceptedAt: "June 3, 2025",
    level: "University",
    topic: "Methods",
    authorBio:
      "Applied econometrician interested in robust inference under limited data.",
    abstract: [
      "We present an econometric approach for incidence estimation under sparse evidence. The method emphasizes robustness to missingness and measurement error.",
      "Through simulated scenarios, we show how conservative uncertainty intervals improve interpretability for policy-facing audiences.",
    ],
    introduction: [
      "Estimating incidence from limited data is common in student research and early-stage reporting. Yet the statistical assumptions are often under-specified.",
      "This paper provides a compact toolkit that encourages explicit treatment of uncertainty, measurement, and identification constraints.",
    ],
    literatureReview: [
      "Sparse-data incidence estimation draws on robust statistics and survey sampling; we synthesize relevant strands for a student-facing toolkit.",
      "We highlight reporting gaps where uncertainty is under-communicated relative to point estimates.",
    ],
    methodology: [
      "We adapt a generalized estimation framework that separates sampling variation from measurement error.",
      "Sensitivity checks are performed by varying assumptions about missingness mechanisms and the calibration of observed outcomes.",
    ],
    results: [
      "The toolkit produces stable incidence estimates when evidence is sparse, and uncertainty intervals widen predictably under weaker assumptions.",
      "Narrative templates for reporting uncertainty reduce omissions in student write-ups.",
    ],
    discussion: [
      "Practical guidance matters when audiences are mixed; conservative intervals can improve trust without obscuring direction of evidence.",
      "Further work could integrate visualization standards for interval reporting.",
    ],
    conclusion: [
      "Sparse evidence does not force simplistic conclusions if researchers report uncertainty and identification limitations explicitly.",
      "Embedding these practices into peer review rubrics can strengthen the evidentiary quality of student-led studies.",
    ],
    reviewers: [
      { name: "Professor L. Singh", affiliation: "AUT" },
      { name: "Student Editor A. Reyes" },
    ],
    decision: "Accepted",
  },
  "policy-communication": {
    slug: "policy-communication",
    title: "Policy Communication and Public Trust: Evidence from Natural Experiments",
    author: "S. Okafor",
    field: "Policy",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    submittedAt: "April 9, 2025",
    acceptedAt: "September 22, 2025",
    level: "High School",
    topic: "Policy",
    authorBio:
      "Student researcher studying public economics and how messaging shapes trust.",
    abstract: [
      "We investigate whether policy communications influence public trust in environments with substantial institutional variation. Our mock analysis highlights heterogeneous treatment effects.",
      "The central claim is that communication clarity acts through perceived reliability rather than generic optimism.",
    ],
    introduction: [
      "Public trust is shaped by more than policy outcomes. The way decisions are explained can determine whether communities interpret interventions as credible.",
      "Natural experiments provide a structured setting in which communication changes coincide with policy implementation.",
    ],
    literatureReview: [
      "Trust and communication are studied across political science and economics; we focus on natural-experiment designs relevant to student-led work.",
      "We note consistent emphasis on heterogeneity and baseline skepticism as moderators.",
    ],
    methodology: [
      "We define a communication index based on structured coding of messaging content. We then model trust outcomes using a field-specific identification strategy.",
      "We test robustness by varying how communication changes are grouped and by using alternative specifications for baseline trust.",
    ],
    results: [
      "Clear communications are associated with measurable increases in trust among groups that previously demonstrated higher skepticism.",
      "Effects are reduced when the messaging omits uncertainty information, suggesting that reliability signals matter.",
    ],
    discussion: [
      "Backfire risk is plausible when audiences interpret optimism as evasion; uncertainty disclosure may reduce that risk.",
      "Mock data limits causal claims; the contribution is structured reporting and identification transparency.",
    ],
    conclusion: [
      "Policy communication can be studied as an evidence-weighted intervention. Reporting uncertainty can be an important component of credibility.",
      "For student researchers, structured coding templates improve comparability and reduce reporting drift across teams.",
    ],
    reviewers: [
      { name: "Professor H. Tanaka", affiliation: "AUT" },
      { name: "Student Editor K. Mensah" },
    ],
    decision: "Accepted",
  },
  "incentives-labs": {
    slug: "incentives-labs",
    title: "Incentives in Research Labs: Participation, Feedback, and Learning",
    author: "M. Davis",
    field: "Labor & Education",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    submittedAt: "February 4, 2025",
    acceptedAt: "July 11, 2025",
    level: "University",
    topic: "Education",
    authorBio:
      "Researcher in higher-education incentives and collaborative learning in labs.",
    abstract: [
      "This paper studies how incentives inside research labs influence participation and learning outcomes. Using a mock framework, we map incentive structures to feedback quality.",
      "We find that transparent evaluation procedures can improve both engagement and the usefulness of feedback received by student teams.",
    ],
    introduction: [
      "Research labs frequently rely on informal norms to coordinate collaboration. These norms interact with incentives, shaping when students participate and how they respond to critique.",
      "We propose a model in which feedback quality mediates the relationship between incentives and learning.",
    ],
    literatureReview: [
      "Laboratory learning literature emphasizes mentorship and task design; incentives are often implicit rather than measured.",
      "We connect incentives to feedback usefulness using constructs compatible with peer review rubrics.",
    ],
    methodology: [
      "We implement a simplified experimental logic: labs vary in incentive transparency and feedback frequency, then outcomes are compared across teams.",
      "We emphasize a reporting checklist to ensure students document incentive rules and feedback processes accurately.",
    ],
    results: [
      "Teams in labs with transparent evaluation rules show higher submission completeness and stronger alignment between revisions and reviewer notes.",
      "Feedback frequency predicts engagement, while feedback quality predicts learning gains.",
    ],
    discussion: [
      "Engagement without useful feedback may inflate activity metrics without learning; rubrics should reward revision quality.",
      "Generalization requires broader samples beyond the mock setting described here.",
    ],
    conclusion: [
      "Incentive design should focus on procedural transparency and feedback usefulness rather than engagement alone.",
      "Peer-review rubrics can operationalize these concepts by rewarding methodological clarity and constructive revision behavior.",
    ],
    reviewers: [
      { name: "Professor E. Novak", affiliation: "AUT" },
      { name: "Student Editor T. Garcia" },
    ],
    decision: "Accepted",
  },
  "measuring-incidence-2": {
    slug: "measuring-incidence-2",
    title: "Robust Estimation Under Misclassification: Practical Guidance",
    author: "L. Chen",
    field: "Methodology",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    submittedAt: "May 1, 2025",
    acceptedAt: "October 7, 2025",
    level: "University",
    topic: "Methods",
    authorBio:
      "Methodologist working on measurement error and transparent reporting.",
    abstract: [
      "This paper provides practical guidance on incidence estimation when outcomes are misclassified. We focus on robust inference under plausible error structures.",
      "Using mock calibration experiments, we show how uncertainty intervals can be made interpretable for non-technical audiences.",
    ],
    introduction: [
      "Misclassification is common in student research due to imperfect measurement instruments and labeling constraints. Yet write-ups often treat classification errors as negligible.",
      "We address this gap by encouraging explicit modeling and transparent reporting of misclassification assumptions.",
    ],
    literatureReview: [
      "Misclassification models appear across epidemiology and econometrics; we distill a compact checklist for student manuscripts.",
      "We emphasize sensitivity analysis as a core reporting obligation.",
    ],
    methodology: [
      "We define an error-aware estimation routine that separates uncertainty from measurement assumptions.",
      "Sensitivity checks are presented as a reporting checklist that can be included directly in a peer review rubric.",
    ],
    results: [
      "Robust estimates produce wider but more meaningful confidence bounds when misclassification is treated explicitly.",
      "Reporting checklists improve consistency of assumptions across revisions and reviewers.",
    ],
    discussion: [
      "Wider intervals are a feature when they reflect real measurement limits; reviewers should reward honest uncertainty.",
      "Future extensions could incorporate domain-specific error priors.",
    ],
    conclusion: [
      "Researchers should treat misclassification as an explicit part of the model rather than an afterthought.",
      "When paired with transparent checklists, robustness improves both credibility and comprehension.",
    ],
    reviewers: [
      { name: "Professor R. Patel", affiliation: "AUT" },
      { name: "Student Editor S. Okafor" },
    ],
    decision: "Accepted",
  },
  "boundary-conditions": {
    slug: "boundary-conditions",
    title: "Boundary Conditions for Causal Claims in Student-Led Studies",
    author: "T. Garcia",
    field: "Research Design",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    submittedAt: "March 28, 2025",
    acceptedAt: "September 1, 2025",
    level: "High School",
    topic: "Research design",
    authorBio:
      "Student researcher focused on causal inference literacy and clear limitation statements.",
    abstract: [
      "We develop a boundary-conditions framework for causal claims in student-led research. The goal is to prevent overreach by specifying when identification is credible.",
      "A mock review exercise illustrates how structured boundary statements improve editorial consistency.",
    ],
    introduction: [
      "Causal language can be persuasive but risky when design assumptions are only partially met. Student researchers often need structured prompts to communicate limitations.",
      "This paper translates identification intuition into concrete boundary statements suitable for peer-reviewed manuscripts.",
    ],
    literatureReview: [
      "Causal inference pedagogy increasingly emphasizes scope conditions; we align with recent templates used in applied microeconomics courses.",
      "We prioritize statements that reviewers can score consistently.",
    ],
    methodology: [
      "We operationalize boundary conditions as a set of checkpoints: identification strategy, violation sensitivity, and external validity constraints.",
      "We then compare reviewer decisions across manuscripts with and without explicit boundary statements.",
    ],
    results: [
      "Manuscripts with explicit boundary conditions receive higher reviewer confidence in both methodology and interpretation.",
      "Editorial disagreement decreases when boundary statements include uncertainty and alternative explanations.",
    ],
    discussion: [
      "Boundary statements need not dampen ambition; they clarify where claims are strongest.",
      "Mock comparisons motivate field trials with real student submissions.",
    ],
    conclusion: [
      "Boundary conditions make causal claims safer without weakening intellectual ambition.",
      "Embedding boundary checklists into peer review can improve clarity for both economists and wider audiences.",
    ],
    reviewers: [
      { name: "Professor A. Nguyen", affiliation: "AUT" },
      { name: "Student Editor M. Davis" },
    ],
    decision: "Accepted",
  },
  "peer-review-signal-2": {
    slug: "peer-review-signal-2",
    title: "A Comparative Review of Review Rubrics: Consistency and Bias",
    author: "K. Mensah",
    field: "Academic Governance",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    submittedAt: "June 12, 2025",
    acceptedAt: "November 4, 2025",
    level: "University",
    topic: "Policy",
    authorBio:
      "Researcher studying editorial processes and rubric design in student publishing.",
    abstract: [
      "This paper compares review rubrics used in student research workflows. We examine how rubric structure affects consistency and mitigates reviewer bias.",
      "Using a mock dataset of editorial outcomes, we demonstrate rubric-driven improvements in transparency.",
    ],
    introduction: [
      "Peer review quality is shaped not only by reviewers but also by the structure of the rubric. Rubrics determine what counts as rigor and how evidence is weighted.",
      "We compare rubrics that emphasize narrative clarity versus methodological completeness and evaluate outcomes across categories.",
    ],
    literatureReview: [
      "Psychometrics and governance studies both address rater reliability; we borrow criteria relevant to manuscript scoring.",
      "We map those criteria onto student research constraints.",
    ],
    methodology: [
      "We model reviewer scoring behavior as a function of rubric category weights and evidence checklists.",
      "Consistency is evaluated using mock calibration exercises aligned with manuscript revision cycles.",
    ],
    results: [
      "Rubrics that require explicit evidence mapping reduce inconsistency in methodological sections.",
      "Reviewer bias is less pronounced when rubrics separate narrative quality from identification strength.",
    ],
    discussion: [
      "Separating dimensions can reduce implicit weighting of reviewer tastes for prose style.",
      "Institutional adoption would require training and periodic calibration.",
    ],
    conclusion: [
      "Rubric design can be treated as a governance tool for editorial quality.",
      "Future work should test whether these effects persist across disciplines and experience levels.",
    ],
    reviewers: [
      { name: "Professor J. Park", affiliation: "AUT" },
      { name: "Student Editor L. Chen" },
    ],
    decision: "Accepted",
  },
  "policy-communication-2": {
    slug: "policy-communication-2",
    title: "When Messages Backfire: Heterogeneous Effects of Policy Framing",
    author: "J. Ibrahim",
    field: "Policy",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    submittedAt: "July 20, 2025",
    acceptedAt: "December 15, 2025",
    level: "University",
    topic: "Policy",
    authorBio:
      "Policy researcher studying framing, trust, and heterogeneous treatment effects.",
    abstract: [
      "We study how policy framing can backfire in heterogeneous populations. In this mock analysis, we emphasize the importance of uncertainty communication.",
      "The central finding is that messaging clarity interacts with baseline skepticism.",
    ],
    introduction: [
      "Policy messages do not land uniformly. Differences in baseline expectations and institutional context shape how framing affects interpretation.",
      "Student-led studies often lack a structured way to describe heterogeneity. This paper provides a template for that reporting.",
    ],
    literatureReview: [
      "Framing effects are well documented; we focus on reporting standards for heterogeneity and backfire patterns.",
      "We align with recent guidance on pre-specifying subgroup analyses where feasible.",
    ],
    methodology: [
      "We use a mock design that simulates heterogeneous responses based on baseline trust levels.",
      "The analysis includes sensitivity checks for omitted uncertainty information in messages.",
    ],
    results: [
      "Effects are positive for groups with higher baseline openness but weaker or negative for groups with sustained skepticism.",
      "Uncertainty omission amplifies backfire risk, suggesting reliability signals matter.",
    ],
    discussion: [
      "Backfire is a design-relevant outcome; communications should be tested with heterogeneity in mind.",
      "Mock simulations motivate empirical replication in real policy settings.",
    ],
    conclusion: [
      "Policy communication research should incorporate heterogeneity and uncertainty reporting from the outset.",
      "Peer-reviewed templates can reduce omission and improve comparability across studies.",
    ],
    reviewers: [
      { name: "Professor S. Okafor", affiliation: "AUT" },
      { name: "Student Editor R. Patel" },
    ],
    decision: "Accepted",
  },
};

function PeerReviewBadge() {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1",
        "text-[10px] tracking-[0.2em] uppercase font-sans",
        "border-[#2F5E4E]/50 text-[#2F5E4E] bg-[#F3F7F5]/80",
      ].join(" ")}
    >
      PEER-REVIEWED
    </span>
  );
}

function ContentSection({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: string[];
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight text-[#1A1A1A] mt-12 mb-4 font-sans">
        {title}
      </h2>
      <div className="space-y-4 text-[17px] leading-relaxed text-[#433C30]">
        {paragraphs.map((p, idx) => (
          <p key={`${title}-${idx}`}>{p}</p>
        ))}
      </div>
    </section>
  );
}

function RelatedCard({
  title,
  author,
  slug,
  category,
}: {
  title: string;
  author: string;
  slug: string;
  category: string;
}) {
  return (
    <Link
      href={`/research/${slug}`}
      className="group block border-t border-[#D6D0C4]/90 pt-5 hover:border-[#2F5E4E]/40 transition-colors"
    >
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#2F5E4E] mb-2 font-sans">
        {category}
      </p>
      <h3 className="font-serif text-xl leading-snug text-[#1A1A1A] group-hover:text-[#2F5E4E] transition-colors">
        {title}
      </h3>
      <p className="mt-2 text-[13px] text-[#777062]">
        By <span className="text-[#433C30]">{author}</span>
      </p>
    </Link>
  );
}

export default function ResearchPaperPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug)
    ? params.slug[0]
    : (params.slug as string);
  const paper = slug ? papers[slug] : undefined;
  const [view, setView] = useState<"read" | "pdf">("read");

  const related = useMemo(() => {
    if (!paper) return [];
    return Object.values(papers)
      .filter((p) => p.slug !== paper.slug)
      .slice(0, 3);
  }, [paper]);

  if (!paper) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F4F1EA]">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-20">
        <div className="md:flex md:gap-12 md:items-start md:justify-between">
          <div className="flex-1 min-w-0 max-w-4xl">
            <header className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#2F5E4E] font-sans">
                  {paper.field}
                </p>
                <PeerReviewBadge />
              </div>

              <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-[#1A1A1A] font-serif">
                {paper.title}
              </h1>

              <p className="text-[15px] text-[#6B6560]">
                By{" "}
                <span className="text-[#433C30] font-medium">{paper.author}</span>
              </p>

              <p className="text-sm text-[#6B6560]/80 font-sans">
                Submitted: {paper.submittedAt}
                <span className="mx-2 opacity-50">•</span>
                Accepted: {paper.acceptedAt}
              </p>
            </header>

            <div
              className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-3 font-sans"
              role="toolbar"
              aria-label="Reading options"
            >
              <button
                type="button"
                onClick={() => setView("read")}
                className={[
                  "rounded-full px-4 py-2 text-sm transition",
                  view === "read"
                    ? "bg-[#E8EFE9] text-[#1A4D3E] ring-1 ring-[#2F5E4E]/25"
                    : "text-[#6B6560] hover:text-[#2F5E4E]",
                ].join(" ")}
              >
                Read Online
              </button>
              <button
                type="button"
                onClick={() => setView("pdf")}
                className={[
                  "rounded-full px-4 py-2 text-sm transition",
                  view === "pdf"
                    ? "bg-[#E8EFE9] text-[#1A4D3E] ring-1 ring-[#2F5E4E]/25"
                    : "text-[#6B6560] hover:text-[#2F5E4E]",
                ].join(" ")}
              >
                View PDF
              </button>
              <span className="hidden sm:inline text-[#D6D0C4] px-1">|</span>
              <a
                href={paper.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#D6D0C4] px-4 py-2 text-sm text-[#433C30] hover:border-[#2F5E4E]/40 hover:text-[#2F5E4E] transition"
              >
                Download PDF
              </a>
              <button
                type="button"
                className="text-sm text-[#6B6560] hover:text-[#2F5E4E] transition px-2"
              >
                Save
              </button>
            </div>

            {view === "pdf" ? (
              <section
                className="mt-16 py-24 text-center"
                aria-label="PDF viewer placeholder"
              >
                <p className="text-[15px] text-[#6B6560] font-sans tracking-wide">
                  PDF viewer coming soon
                </p>
              </section>
            ) : (
              <>
                <section className="mt-14 max-w-2xl">
                  <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#7A7462] font-sans mb-4">
                    Abstract
                  </h2>
                  <div className="space-y-4 text-[17px] leading-[1.75] text-[#433C30]">
                    {paper.abstract.map((p, idx) => (
                      <p key={`abstract-${idx}`}>{p}</p>
                    ))}
                  </div>
                </section>

                <article className="max-w-4xl">
                  <ContentSection
                    title="Introduction"
                    paragraphs={paper.introduction}
                  />
                  <ContentSection
                    title="Literature Review"
                    paragraphs={paper.literatureReview}
                  />
                  <ContentSection
                    title="Methodology"
                    paragraphs={paper.methodology}
                  />
                  <ContentSection title="Results" paragraphs={paper.results} />
                  <ContentSection
                    title="Discussion"
                    paragraphs={paper.discussion}
                  />
                  <ContentSection
                    title="Conclusion"
                    paragraphs={paper.conclusion}
                  />
                </article>
              </>
            )}

            <section className="mt-16 max-w-2xl border-t border-[#D6D0C4]/70 pt-8">
              <h2 className="text-lg font-semibold text-[#1A1A1A] font-sans mb-6">
                Peer review
              </h2>
              <div className="space-y-4 text-[15px] leading-relaxed text-[#433C30]">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.16em] text-[#7A7462] font-sans mb-2">
                    Reviewed by
                  </p>
                  <ul className="space-y-2">
                    {paper.reviewers.map((r, i) => (
                      <li key={i}>
                        {r.name}
                        {r.affiliation ? (
                          <span className="text-[#6B6560]">
                            {" "}
                            ({r.affiliation})
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
                <p>
                  <span className="text-[#6B6560]">Decision:</span>{" "}
                  <span className="text-[#1A1A1A]">{paper.decision}</span>
                </p>
              </div>
            </section>

            <section className="mt-16">
              <h2 className="text-lg font-semibold text-[#1A1A1A] font-sans mb-8">
                Related research
              </h2>
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((p) => (
                  <RelatedCard
                    key={p.slug}
                    slug={p.slug}
                    title={p.title}
                    author={p.author}
                    category={p.field}
                  />
                ))}
              </div>
            </section>

            <p className="mt-14 text-sm text-[#6B6560]/80 font-sans max-w-2xl">
              Note: content is mock data for the research publishing foundation.
            </p>
          </div>

          <aside className="hidden md:block md:w-64 shrink-0 md:sticky md:top-24 self-start space-y-10 text-[14px]">
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-[#7A7462] font-sans mb-4">
                About this paper
              </h3>
              <ul className="space-y-3 text-[#433C30]">
                <li className="flex gap-2">
                  <span className="text-[#2F5E4E]">✓</span>
                  <span>Peer-reviewed</span>
                </li>
                <li>
                  <span className="text-[#6B6560]">Level:</span>{" "}
                  {paper.level}
                </li>
                <li>
                  <span className="text-[#6B6560]">Topic:</span> {paper.topic}
                </li>
              </ul>
            </div>
            <div className="pt-2 border-t border-[#D6D0C4]/60">
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-[#7A7462] font-sans mb-3">
                Author
              </h3>
              <p className="font-medium text-[#1A1A1A]">{paper.author}</p>
              <p className="mt-3 leading-relaxed text-[#6B6560] text-[13px]">
                {paper.authorBio}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
