import { describe, expect, it } from "vitest";
import { buildWorld } from "./seed";

describe("the demo school", () => {
  const w = buildWorld("2026-03-10");
  it("has the people the brief asks for", () => {
    expect(w.profiles.filter((p) => p.role === "admin")).toHaveLength(1);
    expect(w.teachers).toHaveLength(5);
    expect(w.students).toHaveLength(30);
    expect(w.parents).toHaveLength(20);
    expect(w.accounts.map((a) => a.email)).toEqual(expect.arrayContaining(["admin@example.com", "teacher@example.com", "student@example.com", "parent@example.com"]));
  });
  it("is the same every time for the same day", () => {
    expect(JSON.stringify(buildWorld("2026-03-10"))).toBe(JSON.stringify(w));
  });
  it("links every student to a parent, and the demo parent to two children", () => {
    for (const s of w.students) expect(w.parentStudents.some((l) => l.student_id === s.id)).toBe(true);
    const parent = w.parents.find((p) => p.email === "parent@example.com")!;
    expect(w.parentStudents.filter((l) => l.parent_id === parent.id)).toHaveLength(2);
  });
  it("keeps the database's rules: one attendance per student per day, scores within the maximum, ids unique", () => {
    const keys = new Set(w.attendance.map((a) => a.student_id + a.date));
    expect(keys.size).toBe(w.attendance.length);
    const max = new Map(w.assessments.map((a) => [a.id, a.max_score]));
    for (const s of w.scores) expect(s.score).toBeLessThanOrEqual(max.get(s.assessment_id)!);
    const all = [w.profiles, w.students, w.parents, w.assessments, w.scores, w.attendance].flat().map((x) => x.id);
    expect(new Set(all).size).toBe(all.length);
  });
  it("has upcoming work open for the demo student", () => {
    expect(w.assessments.some((a) => a.due_at && a.due_at > "2026-03-10" && a.takes_submissions)).toBe(true);
  });
});
