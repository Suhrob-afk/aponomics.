// Duplicate and near-duplicate detection for question stems. Runs in Node
// (import script) and the browser (admin import), so no Node-only APIs.

/**
 * Same normalisation the database uses for practice_questions.stem_hash:
 * md5(btrim(regexp_replace(lower(stem), '[^a-z0-9]+', ' ', 'g')))
 */
export function normalizeStem(stem: string): string {
  return stem.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(stem: string): string[] {
  // Numbers are collapsed so "a price of $5" and "a price of $7" compare as the same wording.
  return normalizeStem(stem)
    .split(" ")
    .filter(Boolean)
    .map((t) => (/^\d+$/.test(t) ? "#" : t));
}

/** Word bigrams of the normalised stem (single words for very short stems). */
export function stemShingles(stem: string): Set<string> {
  const t = tokens(stem);
  if (t.length < 6) return new Set(t);
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(`${t[i]} ${t[i + 1]}`);
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const s of a) if (b.has(s)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Similarity (0..1) of two stems, ignoring case, punctuation, and specific numbers. */
export function stemSimilarity(a: string, b: string): number {
  return jaccard(stemShingles(a), stemShingles(b));
}

export const NEAR_DUPLICATE_THRESHOLD = 0.8;

export type StemEntry<T> = { item: T; shingles: Set<string> };
export type SimilarMatch<T> = { item: T; similarity: number };

export function indexStems<T>(items: T[], getStem: (item: T) => string): StemEntry<T>[] {
  return items.map((item) => ({ item, shingles: stemShingles(getStem(item)) }));
}

/** Most similar indexed stem at or above the threshold, if any. */
export function findNearDuplicate<T>(
  stem: string,
  index: StemEntry<T>[],
  threshold = NEAR_DUPLICATE_THRESHOLD,
): SimilarMatch<T> | null {
  const target = stemShingles(stem);
  let best: SimilarMatch<T> | null = null;
  for (const entry of index) {
    const s = jaccard(target, entry.shingles);
    if (s >= threshold && (!best || s > best.similarity)) best = { item: entry.item, similarity: s };
  }
  return best;
}
