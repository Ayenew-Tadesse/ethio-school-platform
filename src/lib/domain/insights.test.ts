import { describe, expect, it } from "vitest";
import { buildWorld } from "../demo/seed";
import { visibleTo } from "../data/visibility";
import { className, classSummary, schoolStats, studentSummary, upcoming, whoAmI } from "./insights";

const w = buildWorld();
const as = (email: string) => visibleTo(w, w.accounts.find((a) => a.email === email)!.profile_id);

describe("insights", () => {
  it("names classes like people say them", () => {
    expect(className(as("admin@example.com"), w.classes[0].id)).toBe("Grade 8A");
  });
  it("school numbers are in range and the demo has students needing attention", () => {
    const s = schoolStats(as("admin@example.com"));
    expect(s.students).toBe(30);
    expect(s.teachers).toBe(5);
    for (const v of [s.attendance, s.average, s.completion]) { expect(v).not.toBeNull(); expect(v!).toBeGreaterThanOrEqual(0); expect(v!).toBeLessThanOrEqual(100); }
    expect(s.attention.length).toBeGreaterThan(0);
    expect(s.attention.length).toBeLessThan(15);
  });
  it("a student's summary covers each subject of their class with a class average", () => {
    const d = as("student@example.com");
    const me = whoAmI(d).student!;
    const sum = studentSummary(d, me.id)!;
    expect(sum.subjects.length).toBeGreaterThan(3);
    expect(sum.subjects.every((x) => x.overall != null && x.classAverage != null)).toBe(true);
  });
  it("a parent sees summaries for their children only", () => {
    const d = as("parent@example.com");
    const kids = whoAmI(d).children;
    expect(kids.length).toBe(2);
    for (const k of kids) expect(studentSummary(d, k.id)).not.toBeNull();
  });
  it("a teacher's class summary and upcoming work", () => {
    const d = as("teacher@example.com");
    const me = whoAmI(d);
    expect(me.teachingClasses.length).toBeGreaterThan(0);
    expect(classSummary(d, me.teachingClasses[0]).students).toBeGreaterThan(0);
    expect(upcoming(d, new Set(me.teachingClasses)).length).toBeGreaterThan(0);
  });
});
