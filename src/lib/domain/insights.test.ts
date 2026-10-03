import { describe, expect, it } from "vitest";
import { buildWorld } from "../demo/seed";
import { visibleTo } from "../data/visibility";
import { className, classSummary, contacts, schoolStats, studentSummary, upcoming, whoAmI } from "./insights";
import { DemoStore } from "../data/demo-store";

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
  it("a student gets the real class average without seeing classmates' grades", () => {
    const d = as("student@example.com");
    const me = whoAmI(d).student!;
    expect(d.scores.every((s) => s.student_id === me.id)).toBe(true);
    const admin = as("admin@example.com");
    const sum = studentSummary(d, me.id)!;
    for (const sub of sum.subjects) {
      const cs = d.classSubjects.find((c) => c.class_id === me.class_id && c.subject_id === sub.subjectId)!;
      expect(sub.classAverage).toBe(admin.classAverages.find((c) => c.class_subject_id === cs.id)!.average);
    }
    expect(sum.subjects.some((s) => s.classAverage !== s.overall)).toBe(true);
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
  it("who may start a conversation matches the demo store's (and database's) rules", () => {
    const mem = new Map<string, string>();
    globalThis.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, get length() { return mem.size; } } as Storage;
    mem.set("esp_demo_world_v1", JSON.stringify(w));
    for (const email of ["admin@example.com", "teacher@example.com", "selam.teacher@example.com", "student@example.com", "parent@example.com"]) {
      const d = as(email);
      const store = new DemoStore(d.me.id);
      const allowed = new Set(contacts(d).map((p) => p.id));
      for (const p of d.people) if (p.id !== d.me.id) expect(allowed.has(p.id), `${email} → ${p.full_name}`).toBe(store.canMessage(p.id));
    }
    const student = as("student@example.com");
    expect(contacts(student).every((p) => p.role === "teacher" || student.messages.some((m) => m.sender_id === p.id))).toBe(true);
  });
});
