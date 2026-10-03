import { describe, expect, it } from "vitest";
import { attendanceRate, breakdown, DEFAULT_WEIGHTS, mean, needsAttention, weightsOf } from "./performance";
import type { Assessment, Attendance, Score } from "./types";

const a = (id: string, kind: Assessment["kind"], max = 100): Assessment => ({
  id, kind, max_score: max, school_id: "s", class_subject_id: "cs", term_id: null, title: id, description: null, due_at: null,
  scheduled_on: null, published: true, published_at: null, takes_submissions: true, allow_resubmit: false, created_at: "2026-01-01",
});
const sc = (assessment_id: string, score: number, student_id = "st", released = true): Score =>
  ({ id: assessment_id + student_id, assessment_id, student_id, score, feedback: null, released, graded_at: "2026-01-01" });

describe("breakdown", () => {
  it("averages each kind as a percentage and weights them", () => {
    const as = [a("h1", "homework", 10), a("h2", "homework", 20), a("q1", "quiz", 50), a("f", "final")];
    const b = breakdown(as, [sc("h1", 10), sc("h2", 10), sc("q1", 40), sc("f", 70)], "st", DEFAULT_WEIGHTS);
    expect(b.byKind).toEqual({ homework: 75, assignment: null, quiz: 80, midterm: null, final: 70 });
    // weights 10 / 20 / 30 of the kinds present: (75*10 + 80*20 + 70*30) / 60
    expect(b.overall).toBe(74.2);
    expect(b.count).toBe(4);
  });
  it("ignores unreleased scores and other students", () => {
    const b = breakdown([a("q", "quiz")], [sc("q", 90, "st", false), sc("q", 20, "other")], "st", DEFAULT_WEIGHTS);
    expect(b.overall).toBeNull();
    expect(b.count).toBe(0);
  });
  it("uses the school's own weights", () => {
    const w = weightsOf([{ school_id: "s", kind: "quiz", weight: 0 }]);
    const b = breakdown([a("q", "quiz"), a("m", "midterm")], [sc("q", 100), sc("m", 50)], "st", w);
    expect(b.overall).toBe(50); // quizzes count for nothing at this school
  });
});

describe("attendance and attention", () => {
  const day = (status: Attendance["status"]): Attendance => ({ id: Math.random() + "", school_id: "s", class_id: "c", student_id: "st", date: "2026-01-01", status, note: null });
  it("counts present, excused and (when the school says so) late", () => {
    const rows = [day("present"), day("late"), day("absent"), day("excused")];
    expect(attendanceRate(rows, true)).toBe(75);
    expect(attendanceRate(rows, false)).toBe(50);
    expect(attendanceRate([], true)).toBeNull();
  });
  it("flags below-threshold and declining students, with neutral reasons", () => {
    expect(needsAttention([], 42, 50).reason).toBe("below_threshold");
    const falling = [90, 85, 60, 55].map((pct, i) => ({ at: `2026-01-0${i + 1}`, pct }));
    expect(needsAttention(falling, 72, 50)).toEqual({ attention: true, reason: "declining", trend: -30 });
    expect(needsAttention(falling.map((p) => ({ ...p, pct: 80 })), 80, 50).attention).toBe(false);
    expect(mean([1, null, 3])).toBe(2);
  });
});
