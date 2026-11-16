// Structured graph spec for graph-based questions. Stored in
// practice_questions.graph and rendered as SVG by components/practice/GraphView.
// Coordinates are in data units; both axes start at 0.

export type GraphTick = { value: number; label: string };

export type GraphAxis = {
  label: string;
  max: number;
  ticks?: GraphTick[];
};

export type GraphTone = "primary" | "secondary" | "neutral";

export type GraphCurve = {
  label: string;
  points: [number, number][];
  /** Draw a smooth curve through the points (needs 3+ points). */
  smooth?: boolean;
  dashed?: boolean;
  tone?: GraphTone;
};

export type GraphPoint = {
  x: number;
  y: number;
  label?: string;
  /** Draw dashed guide lines from the point to both axes. */
  guides?: boolean;
};

export type GraphRegion = {
  label: string;
  points: [number, number][];
};

export type GraphSpec = {
  xAxis: GraphAxis;
  yAxis: GraphAxis;
  curves: GraphCurve[];
  points?: GraphPoint[];
  regions?: GraphRegion[];
};

const MAX_LABEL = 16;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkLabel(v: unknown, path: string, errors: string[], required = true) {
  if (v === undefined && !required) return;
  if (typeof v !== "string" || v.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
  } else if (v.length > MAX_LABEL) {
    errors.push(`${path} must be at most ${MAX_LABEL} characters`);
  }
}

function checkAxis(v: unknown, path: string, errors: string[]): number | null {
  if (!isRecord(v)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (typeof v.label !== "string" || v.label.trim().length === 0 || v.label.length > 40) {
    errors.push(`${path}.label must be a non-empty string (max 40 chars)`);
  }
  if (!isFiniteNumber(v.max) || v.max <= 0) {
    errors.push(`${path}.max must be a positive number`);
    return null;
  }
  if (v.ticks !== undefined) {
    if (!Array.isArray(v.ticks)) {
      errors.push(`${path}.ticks must be an array`);
    } else {
      v.ticks.forEach((t, i) => {
        if (!isRecord(t) || !isFiniteNumber(t.value) || t.value < 0 || t.value > (v.max as number)) {
          errors.push(`${path}.ticks[${i}].value must be a number between 0 and ${v.max}`);
        }
        if (isRecord(t)) checkLabel(t.label, `${path}.ticks[${i}].label`, errors);
      });
    }
  }
  return v.max;
}

function checkPoints(
  v: unknown,
  path: string,
  errors: string[],
  xMax: number | null,
  yMax: number | null,
  min: number,
) {
  if (!Array.isArray(v) || v.length < min) {
    errors.push(`${path} must be an array of at least ${min} [x, y] pairs`);
    return;
  }
  v.forEach((p, i) => {
    if (!Array.isArray(p) || p.length !== 2 || !isFiniteNumber(p[0]) || !isFiniteNumber(p[1])) {
      errors.push(`${path}[${i}] must be an [x, y] pair of numbers`);
      return;
    }
    checkInRange(p[0], p[1], `${path}[${i}]`, errors, xMax, yMax);
  });
}

function checkInRange(
  x: number,
  y: number,
  path: string,
  errors: string[],
  xMax: number | null,
  yMax: number | null,
) {
  if (x < 0 || (xMax !== null && x > xMax) || y < 0 || (yMax !== null && y > yMax)) {
    errors.push(`${path} (${x}, ${y}) is outside the axes`);
  }
}

/** Returns a list of problems; empty means the spec is valid. */
export function validateGraph(v: unknown, path = "graph"): string[] {
  const errors: string[] = [];
  if (!isRecord(v)) return [`${path} must be an object`];

  const allowed = new Set(["xAxis", "yAxis", "curves", "points", "regions"]);
  for (const key of Object.keys(v)) {
    if (!allowed.has(key)) errors.push(`${path}.${key} is not a recognised field`);
  }

  const xMax = checkAxis(v.xAxis, `${path}.xAxis`, errors);
  const yMax = checkAxis(v.yAxis, `${path}.yAxis`, errors);

  if (!Array.isArray(v.curves) || v.curves.length === 0) {
    errors.push(`${path}.curves must be a non-empty array`);
  } else {
    v.curves.forEach((c, i) => {
      const cp = `${path}.curves[${i}]`;
      if (!isRecord(c)) {
        errors.push(`${cp} must be an object`);
        return;
      }
      checkLabel(c.label, `${cp}.label`, errors);
      checkPoints(c.points, `${cp}.points`, errors, xMax, yMax, c.smooth ? 3 : 2);
      if (c.tone !== undefined && !["primary", "secondary", "neutral"].includes(c.tone as string)) {
        errors.push(`${cp}.tone must be primary, secondary, or neutral`);
      }
    });
  }

  if (v.points !== undefined) {
    if (!Array.isArray(v.points)) {
      errors.push(`${path}.points must be an array`);
    } else {
      v.points.forEach((p, i) => {
        const pp = `${path}.points[${i}]`;
        if (!isRecord(p) || !isFiniteNumber(p.x) || !isFiniteNumber(p.y)) {
          errors.push(`${pp} must have numeric x and y`);
          return;
        }
        checkInRange(p.x, p.y, pp, errors, xMax, yMax);
        checkLabel(p.label, `${pp}.label`, errors, false);
      });
    }
  }

  if (v.regions !== undefined) {
    if (!Array.isArray(v.regions)) {
      errors.push(`${path}.regions must be an array`);
    } else {
      v.regions.forEach((r, i) => {
        const rp = `${path}.regions[${i}]`;
        if (!isRecord(r)) {
          errors.push(`${rp} must be an object`);
          return;
        }
        checkLabel(r.label, `${rp}.label`, errors);
        checkPoints(r.points, `${rp}.points`, errors, xMax, yMax, 3);
      });
    }
  }

  return errors;
}
