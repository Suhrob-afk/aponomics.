/**
 * Validate question batches and import them into practice_questions as drafts.
 *
 *   npm run questions:check                          # validate content/questions (no network)
 *   npm run questions:import                         # validate, then insert new questions as drafts
 *   npm run questions:import -- path/to/batch.json   # specific files or folders
 *
 * Flags:
 *   --dry-run          validate only (what questions:check does)
 *   --allow-similar    import even if a stem is a near-duplicate of an existing one
 *   --threshold=0.8    near-duplicate similarity threshold (0-1)
 *
 * Import needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from
 * .env.local by the npm script). The service-role key is only used here, never
 * by the app. Re-running is safe: questions whose stem hash already exists are skipped.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { OPTION_LETTERS } from "../lib/practice/courses.ts";
import {
  NEAR_DUPLICATE_THRESHOLD,
  findNearDuplicate,
  indexStems,
  normalizeStem,
} from "../lib/practice/similarity.ts";
import type { ImportQuestion } from "../lib/practice/types.ts";
import { extractQuestions, toQuestionRow, validateQuestion } from "../lib/practice/validate.ts";

type Loaded = { file: string; index: number; question: ImportQuestion; hash: string };

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const dryRun = flags.has("--dry-run");
const allowSimilar = flags.has("--allow-similar");
const thresholdArg = args.find((a) => a.startsWith("--threshold="));
const threshold = thresholdArg ? Number(thresholdArg.split("=")[1]) : NEAR_DUPLICATE_THRESHOLD;
const targets = args.filter((a) => !a.startsWith("--"));
if (targets.length === 0) targets.push("content/questions");

if (!(threshold > 0 && threshold <= 1)) fail("--threshold must be between 0 and 1");

function fail(message: string): never {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function stemHash(stem: string): string {
  return createHash("md5").update(normalizeStem(stem.trim())).digest("hex");
}

function collectFiles(target: string): string[] {
  const full = path.resolve(target);
  const stat = statSync(full, { throwIfNoEntry: false });
  if (!stat) fail(`Not found: ${target}`);
  if (stat.isFile()) return [full];
  return readdirSync(full)
    .filter((f) => f.endsWith(".json") && f !== "schema.json")
    .sort()
    .map((f) => path.join(full, f));
}

const files = [...new Set(targets.flatMap(collectFiles))];
if (files.length === 0) fail("No question files found.");

// ---- 1. Validate every question -------------------------------------------
const loaded: Loaded[] = [];
let errorCount = 0;
let warningCount = 0;

for (const file of files) {
  const rel = path.relative(process.cwd(), file);
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`✖ ${rel}: invalid JSON (${(e as Error).message})`);
    errorCount++;
    continue;
  }
  const questions = extractQuestions(json);
  if (!questions) {
    console.error(`✖ ${rel}: expected { "questions": [...] } or an array`);
    errorCount++;
    continue;
  }

  const letters = { A: 0, B: 0, C: 0, D: 0 };
  questions.forEach((q, index) => {
    const { errors, warnings } = validateQuestion(q);
    const where = `${rel} #${index + 1}`;
    for (const e of errors) console.error(`✖ ${where}: ${e}`);
    for (const w of warnings) console.warn(`⚠ ${where}: ${w}`);
    errorCount += errors.length;
    warningCount += warnings.length;
    if (errors.length === 0) {
      const question = q as ImportQuestion;
      letters[question.correct]++;
      loaded.push({ file: rel, index, question, hash: stemHash(question.stem) });
    }
  });

  const total = Object.values(letters).reduce((a, b) => a + b, 0);
  const skew = OPTION_LETTERS.find((l) => total >= 8 && letters[l] / total > 0.4);
  if (skew) {
    console.warn(`⚠ ${rel}: ${letters[skew]}/${total} answers are "${skew}" — consider balancing answer positions`);
    warningCount++;
  }
  console.log(
    `• ${rel}: ${questions.length} question(s), answers A${letters.A} B${letters.B} C${letters.C} D${letters.D}`,
  );
}

// ---- 2. Duplicates within the files being imported ------------------------
const seenHash = new Map<string, Loaded>();
const accepted: Loaded[] = [];
const acceptedIndex: ReturnType<typeof indexStems<Loaded>> = [];
for (const item of loaded) {
  const where = `${item.file} #${item.index + 1}`;
  const twin = seenHash.get(item.hash);
  if (twin) {
    console.error(`✖ ${where}: same stem as ${twin.file} #${twin.index + 1}`);
    errorCount++;
    continue;
  }
  const near = findNearDuplicate(item.question.stem, acceptedIndex, threshold);
  if (near && !allowSimilar) {
    console.error(
      `✖ ${where}: near-duplicate (${Math.round(near.similarity * 100)}%) of ${near.item.file} #${near.item.index + 1}`,
    );
    errorCount++;
    continue;
  }
  seenHash.set(item.hash, item);
  accepted.push(item);
  acceptedIndex.push(...indexStems([item], (a) => a.question.stem));
}

console.log(
  `\n${loaded.length} valid question(s) in ${files.length} file(s); ${errorCount} error(s), ${warningCount} warning(s).`,
);
if (errorCount > 0) fail("Fix the errors above before importing.");
if (dryRun) {
  console.log("✔ Dry run: nothing was written.");
  process.exit(0);
}

// ---- 3. Compare with the bank and insert drafts ---------------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  fail("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to import.");
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

type ExistingRow = { id: string; stem: string; stem_hash: string; status: string };
const existing: ExistingRow[] = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("practice_questions")
    .select("id, stem, stem_hash, status")
    .order("created_at", { ascending: true })
    .range(from, from + 999);
  if (error) fail(`Could not read practice_questions: ${error.message}`);
  existing.push(...(data as ExistingRow[]));
  if (!data || data.length < 1000) break;
}

const existingHashes = new Set(existing.map((r) => r.stem_hash));
const existingIndex = indexStems(existing, (r) => r.stem);
const toInsert: Loaded[] = [];
let skipped = 0;
let rejected = 0;

for (const item of accepted) {
  const where = `${item.file} #${item.index + 1}`;
  if (existingHashes.has(item.hash)) {
    skipped++;
    continue;
  }
  const near = findNearDuplicate(item.question.stem, existingIndex, threshold);
  if (near && !allowSimilar) {
    console.error(
      `✖ ${where}: near-duplicate (${Math.round(near.similarity * 100)}%) of existing question ${near.item.id} (${near.item.status})`,
    );
    rejected++;
    continue;
  }
  toInsert.push(item);
}

let inserted = 0;
for (let i = 0; i < toInsert.length; i += 100) {
  const chunk = toInsert.slice(i, i + 100).map((item) => toQuestionRow(item.question));
  const { error, count } = await supabase
    .from("practice_questions")
    .upsert(chunk, { onConflict: "stem_hash", ignoreDuplicates: true, count: "exact" });
  if (error) fail(`Insert failed: ${error.message}`);
  inserted += count ?? chunk.length;
}

console.log(
  `\n✔ Imported ${inserted} new draft question(s). Skipped ${skipped} already in the bank. Rejected ${rejected} near-duplicate(s).`,
);
if (rejected > 0) {
  console.log("  Rewrite the rejected stems, or re-run with --allow-similar if they are genuinely different questions.");
  process.exit(1);
}
