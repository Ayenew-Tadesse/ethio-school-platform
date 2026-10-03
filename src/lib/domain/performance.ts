// The performance calculation: transparent and configurable, no hidden score.
//   For each assessment kind (homework, assignment, quiz, midterm, final):
//     the average of the student's released scores as a percentage of each maximum.
//   Overall = the weighted average of the kinds that have scores, using the
//     school's weights (re-scaled to the kinds present, so a missing final
//     doesn't count as zero mid-term).
import type { Assessment, AssessmentKind, Attendance, GradingComponent, Score } from "./types";
import { ASSESSMENT_KINDS } from "./types";

export const DEFAULT_WEIGHTS: Record<AssessmentKind, number> = { homework: 10, assignment: 20, quiz: 20, midterm: 20, final: 30 };

export function weightsOf(rows: GradingComponent[]): Record<AssessmentKind, number> {
  const w = { ...DEFAULT_WEIGHTS };
  for (const r of rows) w[r.kind] = Number(r.weight);
  return w;
}

export interface Breakdown {
  /** 0–100 per kind, or null when there's no released score of that kind. */
  byKind: Record<AssessmentKind, number | null>;
  /** 0–100, or null when there's nothing to calculate from. */
  overall: number | null;
  /** How many scores went into it. */
  count: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** One student's score for a set of assessments (e.g. one subject), from released scores. */
export function breakdown(assessments: Assessment[], scores: Score[], studentId: string, weights: Record<AssessmentKind, number>): Breakdown {
  const byId = new Map(assessments.map((a) => [a.id, a]));
  const sums = new Map<AssessmentKind, { pct: number; n: number }>();
  let count = 0;
  for (const s of scores) {
    const a = byId.get(s.assessment_id);
    if (!a || s.student_id !== studentId || !s.released || !(a.max_score > 0)) continue;
    const cur = sums.get(a.kind) ?? { pct: 0, n: 0 };
    cur.pct += (Number(s.score) / Number(a.max_score)) * 100;
    cur.n += 1;
    sums.set(a.kind, cur);
    count++;
  }
  const byKind = Object.fromEntries(ASSESSMENT_KINDS.map((k) => {
    const v = sums.get(k);
    return [k, v ? round1(v.pct / v.n) : null];
  })) as Record<AssessmentKind, number | null>;
  let total = 0, weight = 0;
  for (const k of ASSESSMENT_KINDS) {
    const v = byKind[k];
    if (v == null || !(weights[k] > 0)) continue;
    total += v * weights[k];
    weight += weights[k];
  }
  return { byKind, overall: weight > 0 ? round1(total / weight) : null, count };
}

/** Attendance rate (0–100): present (and late, if the school counts it) over recorded days. */
export function attendanceRate(rows: Attendance[], lateCountsAsPresent: boolean): number | null {
  if (!rows.length) return null;
  const ok = rows.filter((r) => r.status === "present" || r.status === "excused" || (lateCountsAsPresent && r.status === "late")).length;
  return round1((ok / rows.length) * 100);
}

/** Average of numbers, ignoring nulls (null when there are none). */
export function mean(values: (number | null | undefined)[]): number | null {
  const v = values.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? round1(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/**
 * Students requiring academic attention: overall below the school's threshold,
 * or dropping by at least `drop` points between their earlier and later scores.
 * Neutral academic signals only (no diagnoses).
 */
export function needsAttention(points: { at: string; pct: number }[], overall: number | null, threshold: number, drop = 15):
  { attention: boolean; reason: "below_threshold" | "declining" | null; trend: number | null } {
  const sorted = [...points].sort((a, b) => a.at.localeCompare(b.at));
  let trend: number | null = null;
  if (sorted.length >= 4) {
    const half = Math.floor(sorted.length / 2);
    trend = round1((mean(sorted.slice(half).map((p) => p.pct)) ?? 0) - (mean(sorted.slice(0, half).map((p) => p.pct)) ?? 0));
  }
  if (overall != null && overall < threshold) return { attention: true, reason: "below_threshold", trend };
  if (trend != null && trend <= -drop) return { attention: true, reason: "declining", trend };
  return { attention: false, reason: null, trend };
}
