import { beforeEach, describe, expect, it } from "vitest";
import { DemoStore, loadWorld, resetDemo } from "./demo-store";

// A tiny localStorage for Node (the demo store keeps its school there).
const mem = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, get length() { return mem.size; },
} as Storage;

const acc = (email: string) => loadWorld().accounts.find((a) => a.email === email)!.profile_id;
const as = (email: string) => new DemoStore(acc(email));

describe("demo store: the homework story", () => {
  beforeEach(() => { mem.clear(); resetDemo(); });

  it("teacher posts homework → student submits → teacher grades → student and parent see it", async () => {
    const teacher = as("teacher@example.com"), student = as("student@example.com"), parent = as("parent@example.com");
    const t = await teacher.load();
    const liya = (await student.load()).students.find((s) => s.profile_id === acc("student@example.com"))!;
    const cs = t.classSubjects.find((c) => c.class_id === liya.class_id && t.teachers.find((x) => x.id === c.teacher_id)?.profile_id === t.me.id)!;
    const due = new Date(Date.now() + 3 * 86400000).toISOString();
    const hw = await teacher.createAssessment({ class_subject_id: cs.id, kind: "homework", title: "Fractions practice", description: "Pages 12–13",
      due_at: due, scheduled_on: null, max_score: 10, publish: true, allow_resubmit: false, files: [] });

    const s1 = await student.load();
    expect(s1.assessments.some((a) => a.id === hw.id)).toBe(true);
    expect(s1.notifications.some((n) => n.kind === "new_assessment" && n.title.includes("Fractions practice"))).toBe(true);

    await student.submit(hw.id, "My answers", []);
    expect((await teacher.load()).submissions.some((s) => s.assessment_id === hw.id && s.student_id === liya.id && !s.is_late)).toBe(true);

    await teacher.grade(hw.id, liya.id, 9, "Well done");
    const s2 = await student.load();
    expect(s2.scores.find((s) => s.assessment_id === hw.id)?.score).toBe(9);
    expect(s2.notifications.some((n) => n.kind === "grade_released")).toBe(true);
    const p = await parent.load();
    expect(p.scores.some((s) => s.assessment_id === hw.id && s.student_id === liya.id)).toBe(true);
    await expect(student.submit(hw.id, "again", [])).rejects.toThrow(/graded/);
  });

  it("refuses what the database would refuse", async () => {
    const student = as("student@example.com"), selam = as("selam.teacher@example.com"), teacher = as("teacher@example.com");
    const w = loadWorld();
    const c5B = w.classes[2].id;
    await expect(selam.saveAttendance(c5B, new Date().toISOString().slice(0, 10), [])).rejects.toThrow(/permission/);
    await expect(student.addSubject("Chess", null, null)).rejects.toThrow(/permission/);
    const otherCs = w.classSubjects.find((cs) => w.teachers.find((t) => t.id === cs.teacher_id)?.profile_id !== acc("teacher@example.com"))!;
    await expect(teacher.createAssessment({ class_subject_id: otherCs.id, kind: "quiz", title: "x", description: "", due_at: null,
      scheduled_on: null, max_score: 10, publish: false, allow_resubmit: false, files: [] })).rejects.toThrow(/permission/);
    const hw = w.assessments.find((a) => a.published && a.takes_submissions)!;
    await expect(teacher.grade(hw.id, w.students[0].id, 999, null)).rejects.toThrow();
  });

  it("a parent can message their child's teacher but not an unrelated student", async () => {
    const parent = as("parent@example.com");
    await parent.sendMessage(acc("teacher@example.com"), "Hello teacher");
    const other = loadWorld().profiles.find((p) => p.role === "student" && p.id !== acc("student@example.com"))!;
    await expect(parent.sendMessage(other.id, "hi")).rejects.toThrow(/doesn't allow/);
  });

  it("an admin can build the school: class, subject teacher, person", async () => {
    const admin = as("admin@example.com");
    const d = await admin.load();
    const g8 = d.gradeLevels.find((g) => g.level === 8)!;
    const classId = await admin.addClass(g8.id, "c", null);
    await admin.assignTeacher(classId, d.subjects[0].id, d.teachers[0].id);
    const { id, tempPassword } = await admin.addPerson({ role: "student", full_name: "Test Student", email: "new.student@example.com", phone: null, class_id: classId });
    const d2 = await admin.load();
    expect(d2.classes.find((c) => c.id === classId)?.section).toBe("C");
    expect(d2.students.find((s) => s.id === id)?.class_id).toBe(classId);
    expect(tempPassword).toBeTruthy();
    await expect(admin.addClass(g8.id, "C", null)).rejects.toThrow(/already exists/);
  });
});
