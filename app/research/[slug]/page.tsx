import { notFound } from "next/navigation";

type PaperStatus = "Peer-reviewed";

type ResearchPaper = {
  slug: string;
  title: string;
  author: string;
  field: string;
  status: PaperStatus;
  pdfUrl: string;
  originalUrl: string;
  abstract: string[];
  introduction: string[];
  methodology: string[];
  results: string[];
  conclusion: string[];
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
    abstract: [
      "This study examines peer review as a signaling mechanism for student research quality. We argue that structured feedback alters the probability of publishing credible claims.",
      "Using a mock dataset of submissions and editorial outcomes, we illustrate how rubric-based evaluation reduces variance in methodological reporting.",
    ],
    introduction: [
      "Student-led research often faces constraints in time, training, and tooling. These pressures can affect clarity and methodological transparency.",
      "Peer review is widely treated as quality assurance, but its mechanism is frequently described qualitatively. We formalize peer review as a signal about research rigor.",
    ],
    methodology: [
      "We construct a rubric aligned with research design criteria: identification strategy, measurement validity, and internal consistency.",
      "Editorial decisions are mapped to reviewer scores, then compared across field categories to estimate whether structured review decreases reporting gaps.",
    ],
    results: [
      "Rubric-based review is associated with higher completeness in methods sections and lower incidence of unsupported causal language.",
      "Editorial selection effects are strongest in domains requiring careful identification (e.g., quasi-experimental designs).",
    ],
    conclusion: [
      "Peer review can function as a practical signaling device when evaluation is transparent and rubric-driven.",
      "Future work should test whether these gains persist when student teams vary in experience and access to mentorship.",
    ],
  },
  "measuring-incidence": {
    slug: "measuring-incidence",
    title: "Measuring Incidence with Sparse Evidence: An Econometric Toolkit",
    author: "R. Patel",
    field: "Empirical Methods",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    abstract: [
      "We present an econometric approach for incidence estimation under sparse evidence. The method emphasizes robustness to missingness and measurement error.",
      "Through simulated scenarios, we show how conservative uncertainty intervals improve interpretability for policy-facing audiences.",
    ],
    introduction: [
      "Estimating incidence from limited data is common in student research and early-stage reporting. Yet the statistical assumptions are often under-specified.",
      "This paper provides a compact toolkit that encourages explicit treatment of uncertainty, measurement, and identification constraints.",
    ],
    methodology: [
      "We adapt a generalized estimation framework that separates sampling variation from measurement error.",
      "Sensitivity checks are performed by varying assumptions about missingness mechanisms and the calibration of observed outcomes.",
    ],
    results: [
      "The toolkit produces stable incidence estimates when evidence is sparse, and uncertainty intervals widen predictably under weaker assumptions.",
      "Narrative templates for reporting uncertainty reduce omissions in student write-ups.",
    ],
    conclusion: [
      "Sparse evidence does not force simplistic conclusions if researchers report uncertainty and identification limitations explicitly.",
      "Embedding these practices into peer review rubrics can strengthen the evidentiary quality of student-led studies.",
    ],
  },
  "policy-communication": {
    slug: "policy-communication",
    title: "Policy Communication and Public Trust: Evidence from Natural Experiments",
    author: "S. Okafor",
    field: "Policy",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    abstract: [
      "We investigate whether policy communications influence public trust in environments with substantial institutional variation. Our mock analysis highlights heterogeneous treatment effects.",
      "The central claim is that communication clarity acts through perceived reliability rather than generic optimism.",
    ],
    introduction: [
      "Public trust is shaped by more than policy outcomes. The way decisions are explained can determine whether communities interpret interventions as credible.",
      "Natural experiments provide a structured setting in which communication changes coincide with policy implementation.",
    ],
    methodology: [
      "We define a communication index based on structured coding of messaging content. We then model trust outcomes using a field-specific identification strategy.",
      "We test robustness by varying how communication changes are grouped and by using alternative specifications for baseline trust.",
    ],
    results: [
      "Clear communications are associated with measurable increases in trust among groups that previously demonstrated higher skepticism.",
      "Effects are reduced when the messaging omits uncertainty information, suggesting that reliability signals matter.",
    ],
    conclusion: [
      "Policy communication can be studied as an evidence-weighted intervention. Reporting uncertainty can be an important component of credibility.",
      "For student researchers, structured coding templates improve comparability and reduce reporting drift across teams.",
    ],
  },
  "incentives-labs": {
    slug: "incentives-labs",
    title: "Incentives in Research Labs: Participation, Feedback, and Learning",
    author: "M. Davis",
    field: "Labor & Education",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    abstract: [
      "This paper studies how incentives inside research labs influence participation and learning outcomes. Using a mock framework, we map incentive structures to feedback quality.",
      "We find that transparent evaluation procedures can improve both engagement and the usefulness of feedback received by student teams.",
    ],
    introduction: [
      "Research labs frequently rely on informal norms to coordinate collaboration. These norms interact with incentives, shaping when students participate and how they respond to critique.",
      "We propose a model in which feedback quality mediates the relationship between incentives and learning.",
    ],
    methodology: [
      "We implement a simplified experimental logic: labs vary in incentive transparency and feedback frequency, then outcomes are compared across teams.",
      "We emphasize a reporting checklist to ensure students document incentive rules and feedback processes accurately.",
    ],
    results: [
      "Teams in labs with transparent evaluation rules show higher submission completeness and stronger alignment between revisions and reviewer notes.",
      "Feedback frequency predicts engagement, while feedback quality predicts learning gains.",
    ],
    conclusion: [
      "Incentive design should focus on procedural transparency and feedback usefulness rather than engagement alone.",
      "Peer-review rubrics can operationalize these concepts by rewarding methodological clarity and constructive revision behavior.",
    ],
  },
  "measuring-incidence-2": {
    slug: "measuring-incidence-2",
    title: "Robust Estimation Under Misclassification: Practical Guidance",
    author: "L. Chen",
    field: "Methodology",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    abstract: [
      "This paper provides practical guidance on incidence estimation when outcomes are misclassified. We focus on robust inference under plausible error structures.",
      "Using mock calibration experiments, we show how uncertainty intervals can be made interpretable for non-technical audiences.",
    ],
    introduction: [
      "Misclassification is common in student research due to imperfect measurement instruments and labeling constraints. Yet write-ups often treat classification errors as negligible.",
      "We address this gap by encouraging explicit modeling and transparent reporting of misclassification assumptions.",
    ],
    methodology: [
      "We define an error-aware estimation routine that separates uncertainty from measurement assumptions.",
      "Sensitivity checks are presented as a reporting checklist that can be included directly in a peer review rubric.",
    ],
    results: [
      "Robust estimates produce wider but more meaningful confidence bounds when misclassification is treated explicitly.",
      "Reporting checklists improve consistency of assumptions across revisions and reviewers.",
    ],
    conclusion: [
      "Researchers should treat misclassification as an explicit part of the model rather than an afterthought.",
      "When paired with transparent checklists, robustness improves both credibility and comprehension.",
    ],
  },
  "boundary-conditions": {
    slug: "boundary-conditions",
    title: "Boundary Conditions for Causal Claims in Student-Led Studies",
    author: "T. Garcia",
    field: "Research Design",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    abstract: [
      "We develop a boundary-conditions framework for causal claims in student-led research. The goal is to prevent overreach by specifying when identification is credible.",
      "A mock review exercise illustrates how structured boundary statements improve editorial consistency.",
    ],
    introduction: [
      "Causal language can be persuasive but risky when design assumptions are only partially met. Student researchers often need structured prompts to communicate limitations.",
      "This paper translates identification intuition into concrete boundary statements suitable for peer-reviewed manuscripts.",
    ],
    methodology: [
      "We operationalize boundary conditions as a set of checkpoints: identification strategy, violation sensitivity, and external validity constraints.",
      "We then compare reviewer decisions across manuscripts with and without explicit boundary statements.",
    ],
    results: [
      "Manuscripts with explicit boundary conditions receive higher reviewer confidence in both methodology and interpretation.",
      "Editorial disagreement decreases when boundary statements include uncertainty and alternative explanations.",
    ],
    conclusion: [
      "Boundary conditions make causal claims safer without weakening intellectual ambition.",
      "Embedding boundary checklists into peer review can improve clarity for both economists and wider audiences.",
    ],
  },
  "peer-review-signal-2": {
    slug: "peer-review-signal-2",
    title: "A Comparative Review of Review Rubrics: Consistency and Bias",
    author: "K. Mensah",
    field: "Academic Governance",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    abstract: [
      "This paper compares review rubrics used in student research workflows. We examine how rubric structure affects consistency and mitigates reviewer bias.",
      "Using a mock dataset of editorial outcomes, we demonstrate rubric-driven improvements in transparency.",
    ],
    introduction: [
      "Peer review quality is shaped not only by reviewers but also by the structure of the rubric. Rubrics determine what counts as rigor and how evidence is weighted.",
      "We compare rubrics that emphasize narrative clarity versus methodological completeness and evaluate outcomes across categories.",
    ],
    methodology: [
      "We model reviewer scoring behavior as a function of rubric category weights and evidence checklists.",
      "Consistency is evaluated using mock calibration exercises aligned with manuscript revision cycles.",
    ],
    results: [
      "Rubrics that require explicit evidence mapping reduce inconsistency in methodological sections.",
      "Reviewer bias is less pronounced when rubrics separate narrative quality from identification strength.",
    ],
    conclusion: [
      "Rubric design can be treated as a governance tool for editorial quality.",
      "Future work should test whether these effects persist across disciplines and experience levels.",
    ],
  },
  "policy-communication-2": {
    slug: "policy-communication-2",
    title: "When Messages Backfire: Heterogeneous Effects of Policy Framing",
    author: "J. Ibrahim",
    field: "Policy",
    status: "Peer-reviewed",
    pdfUrl: DUMMY_PDF_URL,
    originalUrl: DUMMY_ORIGINAL_URL,
    abstract: [
      "We study how policy framing can backfire in heterogeneous populations. In this mock analysis, we emphasize the importance of uncertainty communication.",
      "The central finding is that messaging clarity interacts with baseline skepticism.",
    ],
    introduction: [
      "Policy messages do not land uniformly. Differences in baseline expectations and institutional context shape how framing affects interpretation.",
      "Student-led studies often lack a structured way to describe heterogeneity. This paper provides a template for that reporting.",
    ],
    methodology: [
      "We use a mock design that simulates heterogeneous responses based on baseline trust levels.",
      "The analysis includes sensitivity checks for omitted uncertainty information in messages.",
    ],
    results: [
      "Effects are positive for groups with higher baseline openness but weaker or negative for groups with sustained skepticism.",
      "Uncertainty omission amplifies backfire risk, suggesting reliability signals matter.",
    ],
    conclusion: [
      "Policy communication research should incorporate heterogeneity and uncertainty reporting from the outset.",
      "Peer-reviewed templates can reduce omission and improve comparability across studies.",
    ],
  },
};

function StatusBadge({ status }: { status: PaperStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1",
        "text-[11px] tracking-[0.22em] uppercase",
        "font-sans",
        "border-[#2F5E4E] text-[#2F5E4E] bg-[#F3F7F5]",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function Section({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: string[];
}) {
  return (
    <section>
      <h2 className="font-serif text-2xl tracking-tight text-[#1A1A1A]">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[16px] leading-relaxed text-[#4A4336]">
        {paragraphs.map((p, idx) => (
          <p key={`${title}-${idx}`}>{p}</p>
        ))}
      </div>
    </section>
  );
}

export default function ResearchPaperPage({
  params,
}: {
  params: { slug: string };
}) {
  const paper = papers[params.slug];

  if (!paper) {
    notFound();
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 md:py-20">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-[#7A7462] font-sans">
          Aponomics Research Lab
        </p>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight tracking-tight text-[#1A1A1A] mt-4">
          {paper.title}
        </h1>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-[#6B6B6B] font-sans">
            By{" "}
            <span className="font-medium text-[#433C30]">{paper.author}</span>
            {"  \u2022  "}
            <span>{paper.field}</span>
          </div>
          <StatusBadge status={paper.status} />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <a
            href={paper.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-sm border border-[#D6D0C4] bg-[#F7F3EB] px-6 py-3 text-sm font-medium text-[#0F5C4A] hover:opacity-80 transition cursor-pointer"
          >
            Download PDF
          </a>
          <a
            href={paper.originalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-sm border border-[#D6D0C4] bg-transparent px-6 py-3 text-sm font-medium text-[#1A1A1A] hover:opacity-80 transition cursor-pointer"
          >
            View Original
          </a>
        </div>
      </div>

      <div className="mt-12 pt-10 border-t border-[#D6D0C4] max-w-3xl">
        <div className="space-y-12">
          <Section title="Abstract" paragraphs={paper.abstract} />
          <Section
            title="Introduction"
            paragraphs={paper.introduction}
          />
          <Section
            title="Methodology"
            paragraphs={paper.methodology}
          />
          <Section title="Results" paragraphs={paper.results} />
          <Section title="Conclusion" paragraphs={paper.conclusion} />
        </div>
      </div>

      <div className="mt-14 text-sm text-[#6B6B6B] max-w-3xl">
        <p className="font-sans">
          Note: content is mock data for the research publishing foundation.
        </p>
      </div>
    </main>
  );
}

