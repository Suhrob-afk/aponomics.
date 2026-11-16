// Course structure for the practice section. Unit titles follow the public
// course outline; topic names are generic economics terms used to group
// questions for stats ("weakest topics") and to keep imports consistent.

export type CourseId = "micro" | "macro";

export type Unit = {
  number: number;
  title: string;
  topics: string[];
};

export type Course = {
  id: CourseId;
  title: string;
  shortTitle: string;
  units: Unit[];
  /** Questions per unit in a 60-question mock (sums to 60). Mirrors the SQL in practice_create_session. */
  mockBlueprint: number[];
};

export const MOCK_QUESTION_COUNT = 60;
export const MOCK_TIME_LIMIT_SECONDS = 70 * 60;
/** Used to scale the timer when the bank cannot fill a full mock yet. */
export const SECONDS_PER_MOCK_QUESTION = MOCK_TIME_LIMIT_SECONDS / MOCK_QUESTION_COUNT;
export const MAX_PRACTICE_QUESTIONS = 60;

export const COURSES: Record<CourseId, Course> = {
  micro: {
    id: "micro",
    title: "AP® Microeconomics",
    shortTitle: "Microeconomics",
    mockBlueprint: [8, 14, 14, 11, 7, 6],
    units: [
      {
        number: 1,
        title: "Basic Economic Concepts",
        topics: [
          "Scarcity",
          "Resource allocation and economic systems",
          "Production possibilities curve",
          "Comparative advantage and trade",
          "Cost-benefit analysis",
          "Marginal analysis and consumer choice",
        ],
      },
      {
        number: 2,
        title: "Supply and Demand",
        topics: [
          "Demand",
          "Supply",
          "Price elasticity of demand",
          "Price elasticity of supply",
          "Other elasticities",
          "Market equilibrium and surplus",
          "Changes in equilibrium",
          "Government intervention in markets",
          "International trade and public policy",
        ],
      },
      {
        number: 3,
        title: "Production, Cost, and the Perfect Competition Model",
        topics: [
          "The production function",
          "Short-run production costs",
          "Long-run production costs",
          "Types of profit",
          "Profit maximization",
          "Short-run shutdown and long-run entry and exit",
          "Perfect competition",
        ],
      },
      {
        number: 4,
        title: "Imperfect Competition",
        topics: [
          "Introduction to imperfect competition",
          "Monopoly",
          "Price discrimination",
          "Monopolistic competition",
          "Oligopoly and game theory",
        ],
      },
      {
        number: 5,
        title: "Factor Markets",
        topics: [
          "Introduction to factor markets",
          "Changes in factor demand and supply",
          "Profit-maximizing behavior in factor markets",
          "Monopsony",
        ],
      },
      {
        number: 6,
        title: "Market Failure and the Role of Government",
        topics: [
          "Socially efficient and inefficient outcomes",
          "Externalities",
          "Public and private goods",
          "Government intervention in different market structures",
          "Inequality",
        ],
      },
    ],
  },
  macro: {
    id: "macro",
    title: "AP® Macroeconomics",
    shortTitle: "Macroeconomics",
    mockBlueprint: [4, 9, 13, 12, 15, 7],
    units: [
      {
        number: 1,
        title: "Basic Economic Concepts",
        topics: [
          "Scarcity",
          "Opportunity cost and the production possibilities curve",
          "Comparative advantage and gains from trade",
          "Demand",
          "Supply",
          "Market equilibrium and changes in equilibrium",
        ],
      },
      {
        number: 2,
        title: "Economic Indicators and the Business Cycle",
        topics: [
          "The circular flow and GDP",
          "Limitations of GDP",
          "Unemployment",
          "Price indices and inflation",
          "Costs of inflation",
          "Real vs. nominal GDP",
          "Business cycles",
        ],
      },
      {
        number: 3,
        title: "National Income and Price Determination",
        topics: [
          "Aggregate demand",
          "Multipliers",
          "Short-run aggregate supply",
          "Long-run aggregate supply",
          "Equilibrium in the AD-AS model",
          "Short-run changes in the AD-AS model",
          "Long-run self-adjustment",
          "Fiscal policy",
          "Automatic stabilizers",
        ],
      },
      {
        number: 4,
        title: "Financial Sector",
        topics: [
          "Financial assets",
          "Nominal vs. real interest rates",
          "Money: definition, measurement, and functions",
          "Banking and the expansion of the money supply",
          "The money market",
          "Monetary policy",
          "The loanable funds market",
        ],
      },
      {
        number: 5,
        title: "Long-Run Consequences of Stabilization Policies",
        topics: [
          "Fiscal and monetary policy in the short run",
          "The Phillips curve",
          "Money growth and inflation",
          "Government deficits and the national debt",
          "Crowding out",
          "Economic growth",
          "Public policy and economic growth",
        ],
      },
      {
        number: 6,
        title: "Open Economy: International Trade and Finance",
        topics: [
          "Balance of payments accounts",
          "Exchange rates",
          "The foreign exchange market",
          "Policy effects on the foreign exchange market",
          "Exchange rates and net exports",
          "Real interest rates and international capital flows",
        ],
      },
    ],
  },
};

export const COURSE_IDS: CourseId[] = ["micro", "macro"];

export function isCourseId(value: unknown): value is CourseId {
  return value === "micro" || value === "macro";
}

export function getUnit(course: CourseId, unit: number): Unit | undefined {
  return COURSES[course].units.find((u) => u.number === unit);
}

export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
export type OptionLetter = (typeof OPTION_LETTERS)[number];
