# Practice question batches

JSON batches of **original** AP® Microeconomics and AP® Macroeconomics multiple-choice questions.

```bash
npm run questions:check      # validate every batch here (no network)
npm run questions:import     # insert new questions into Supabase as drafts
```

Import always sets `status = 'draft'`. Questions reach students only after they are published in `/admin/practice`.
Re-running the import is safe: a question whose normalised stem already exists is skipped, and a stem that is a
near-duplicate (≥ 80% word-pair overlap, ignoring numbers) of any existing question is rejected.

## Content rules

- Every question is original: new scenarios, numbers, and wording. Never copy or lightly reword College Board
  released questions or any other site's questions, and never paste past-paper text into this folder.
- Past papers are a reference for style, difficulty, and topic coverage only.
- One unambiguous correct answer. Distractors should come from real misconceptions (shift vs. movement along a curve,
  price vs. marginal revenue, nominal vs. real, etc.), and be parallel in length and grammar.
- Avoid "all of the above" / "none of the above". Roman-numeral formats ("I and II only") are fine when the
  statements are in the stem.
- Use fictional names (a firm called Larkspur Bakery, Country Velor) rather than real brands or countries.

## File format

```jsonc
{
  "$schema": "./schema.json",
  "batch": "micro-unit-2-seed",          // free-text label
  "questions": [
    {
      "course": "micro",                 // "micro" | "macro"
      "unit": 2,                         // 1-6
      "topic": "Price elasticity of demand", // from the topic list in lib/practice/courses.ts
      "difficulty": 2,                   // 1 easy, 2 medium, 3 hard
      "stem": "…",
      "options": ["…", "…", "…", "…"],   // A-D, no letter prefixes
      "correct": "C",                    // "A" | "B" | "C" | "D"
      "explanation": "Why the correct answer is right (2-4 sentences).",
      "option_explanations": [           // one per option, A-D, including the correct one
        "Why A is wrong…",
        "Why B is wrong…",
        "Correct. …",
        "Why D is wrong…"
      ],
      "graph": { … },                    // optional, see below
      "image_url": "https://…",          // optional, https only
      "image_alt": "…",                  // required when graph or image_url is set
      "source_note": "original seed"     // optional, internal only
    }
  ]
}
```

## Graphs

`graph` is drawn as an SVG, so supply/demand and cost-curve questions don't need uploaded images.
Coordinates are in data units and both axes start at 0. Every coordinate must lie within `0..max`.

```jsonc
"graph": {
  "xAxis": { "label": "Quantity", "max": 10, "ticks": [{ "value": 4, "label": "Q1" }] },
  "yAxis": { "label": "Price ($)", "max": 10, "ticks": [{ "value": 6, "label": "P1" }] },
  "curves": [
    { "label": "S",  "points": [[1, 2], [9, 9]] },                      // straight line
    { "label": "D",  "points": [[1, 9], [9, 1]], "tone": "secondary" },
    { "label": "D2", "points": [[3, 9], [10, 2]], "dashed": true },     // shifted curve
    { "label": "MC", "points": [[1, 6], [3, 3], [5, 3.5], [8, 8]], "smooth": true } // smooth needs 3+ points
  ],
  "points":  [{ "x": 4, "y": 6, "label": "E", "guides": true }],       // guides = dashed lines to both axes
  "regions": [{ "label": "A", "points": [[0, 6], [4, 6], [0, 9]] }]    // shaded polygon with a letter label
}
```

- Curve labels are drawn just beyond the curve's **last** point, so order points so the label lands somewhere clear
  (for a downward-sloping demand curve, list the top-left point first).
- Labels are short (≤ 16 characters): `S`, `D1`, `MC`, `ATC`, `MR`, `SRAS`, `LRAS`.
- Tones: `primary` (default, dark green), `secondary` (ochre), `neutral` (grey).
- `image_alt` should describe the graph fully enough that a screen-reader user can answer the question.
