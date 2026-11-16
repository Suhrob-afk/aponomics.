// Validation for question batches (content/questions/*.json), shared by
// scripts/import-questions.ts and the admin bulk import.

import { COURSES, OPTION_LETTERS, getUnit, isCourseId } from "./courses.ts";
import { validateGraph } from "./graph.ts";
import type { ImportQuestion } from "./types.ts";

export type QuestionIssues = { errors: string[]; warnings: string[] };

const ALLOWED_KEYS = new Set([
  "course",
  "unit",
  "topic",
  "difficulty",
  "stem",
  "options",
  "correct",
  "explanation",
  "option_explanations",
  "graph",
  "image_url",
  "image_alt",
  "source_note",
]);

function nonEmpty(v: unknown, min = 1): v is string {
  return typeof v === "string" && v.trim().length >= min;
}

function stringArray4(v: unknown): v is [string, string, string, string] {
  return Array.isArray(v) && v.length === 4 && v.every((s) => nonEmpty(s));
}

export function validateQuestion(q: unknown): QuestionIssues {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof q !== "object" || q === null || Array.isArray(q)) {
    return { errors: ["question must be an object"], warnings };
  }
  const r = q as Record<string, unknown>;

  for (const key of Object.keys(r)) {
    if (!ALLOWED_KEYS.has(key)) {
      errors.push(
        key === "status" || key === "correct_index"
          ? `"${key}" is not allowed in imports (status is always draft; use "correct": "A".."D")`
          : `unknown field "${key}"`,
      );
    }
  }

  if (!isCourseId(r.course)) errors.push(`course must be "micro" or "macro"`);
  if (typeof r.unit !== "number" || !Number.isInteger(r.unit) || r.unit < 1 || r.unit > 6) {
    errors.push("unit must be an integer from 1 to 6");
  }
  if (!nonEmpty(r.topic)) {
    errors.push("topic is required");
  } else if (isCourseId(r.course) && typeof r.unit === "number") {
    const unit = getUnit(r.course, r.unit);
    if (unit && !unit.topics.includes(r.topic as string)) {
      warnings.push(
        `topic "${r.topic}" is not in the ${COURSES[r.course].shortTitle} unit ${r.unit} topic list`,
      );
    }
  }
  if (r.difficulty !== 1 && r.difficulty !== 2 && r.difficulty !== 3) {
    errors.push("difficulty must be 1, 2, or 3");
  }

  if (!nonEmpty(r.stem, 15)) errors.push("stem must be at least 15 characters");
  if (!stringArray4(r.options)) {
    errors.push("options must be an array of exactly 4 non-empty strings");
  } else {
    const normalized = r.options.map((o) => o.trim().toLowerCase());
    if (new Set(normalized).size !== 4) errors.push("options must all be different");
    r.options.forEach((o, i) => {
      if (/^\s*\(?[A-Da-d][).:]\s/.test(o)) {
        errors.push(`option ${OPTION_LETTERS[i]} should not start with its own letter`);
      }
      if (/\b(all|none) of the above\b/i.test(o)) {
        warnings.push(`option ${OPTION_LETTERS[i]} uses "all/none of the above"`);
      }
    });
  }
  if (typeof r.correct !== "string" || !OPTION_LETTERS.includes(r.correct as never)) {
    errors.push(`correct must be one of "A", "B", "C", "D"`);
  }
  if (!nonEmpty(r.explanation, 20)) errors.push("explanation must be at least 20 characters");
  if (!stringArray4(r.option_explanations)) {
    errors.push("option_explanations must be an array of exactly 4 non-empty strings (A-D)");
  }

  if (r.graph !== undefined) errors.push(...validateGraph(r.graph));
  if (r.image_url !== undefined) {
    if (typeof r.image_url !== "string" || !/^https:\/\//.test(r.image_url)) {
      errors.push("image_url must be an https URL");
    }
  }
  if ((r.graph !== undefined || r.image_url !== undefined) && !nonEmpty(r.image_alt, 10)) {
    errors.push("image_alt (a text description of the graph or image) is required when graph or image_url is set");
  }
  if (r.source_note !== undefined && typeof r.source_note !== "string") {
    errors.push("source_note must be a string");
  }

  return { errors, warnings };
}

/** Converts a validated import question into a practice_questions insert row (always draft). */
export function toQuestionRow(q: ImportQuestion) {
  return {
    course: q.course,
    unit: q.unit,
    topic: q.topic.trim(),
    question_type: "mcq" as const,
    stem: q.stem.trim(),
    options: q.options.map((o) => o.trim()),
    correct_index: OPTION_LETTERS.indexOf(q.correct),
    explanation: q.explanation.trim(),
    option_explanations: q.option_explanations.map((o) => o.trim()),
    difficulty: q.difficulty,
    image_url: q.image_url ?? null,
    image_alt: q.image_alt?.trim() ?? null,
    graph: q.graph ?? null,
    status: "draft" as const,
    source_note: q.source_note?.trim() ?? null,
  };
}

export type QuestionRow = ReturnType<typeof toQuestionRow>;

/** Accepts either { questions: [...] } or a bare array. */
export function extractQuestions(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (typeof json === "object" && json !== null && Array.isArray((json as { questions?: unknown }).questions)) {
    return (json as { questions: unknown[] }).questions;
  }
  return null;
}
