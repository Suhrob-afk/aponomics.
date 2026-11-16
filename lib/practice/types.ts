import type { CourseId } from "./courses.ts";
import type { GraphSpec } from "./graph.ts";

export type QuestionType = "mcq";
export type QuestionStatus = "draft" | "published";
export type SessionMode = "practice" | "mock" | "review";

/** Columns students can read. The answer key is never in this shape. */
export type PublicQuestion = {
  id: string;
  course: CourseId;
  unit: number;
  topic: string;
  question_type: QuestionType;
  stem: string;
  options: string[];
  difficulty: number;
  image_url: string | null;
  image_alt: string | null;
  graph: GraphSpec | null;
};

export const PUBLIC_QUESTION_COLUMNS =
  "id, course, unit, topic, question_type, stem, options, difficulty, image_url, image_alt, graph";

/** Full row, only returned to admins via practice_admin_list(). */
export type AdminQuestion = PublicQuestion & {
  correct_index: number;
  explanation: string;
  option_explanations: string[];
  status: QuestionStatus;
  source_note: string | null;
  stem_hash: string;
  created_at: string;
  updated_at: string;
};

export type AnswerKey = {
  question_id: string;
  correct_index: number;
  explanation: string;
  option_explanations: string[];
};

/** The shape of one question in a content/questions/*.json batch. */
export type ImportQuestion = {
  course: CourseId;
  unit: number;
  topic: string;
  difficulty: 1 | 2 | 3;
  stem: string;
  options: [string, string, string, string];
  correct: "A" | "B" | "C" | "D";
  explanation: string;
  option_explanations: [string, string, string, string];
  graph?: GraphSpec;
  image_url?: string;
  image_alt?: string;
  source_note?: string;
};

export type ImportBatch = {
  batch?: string;
  questions: ImportQuestion[];
};
