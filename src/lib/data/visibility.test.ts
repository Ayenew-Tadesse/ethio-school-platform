import { describe, expect, it } from "vitest";
import { buildWorld } from "../demo/seed";
import { visibleTo } from "./visibility";

const w = buildWorld("2026-03-10");
const acc = (email: string) => w.accounts.find((a) => a.email === email)!.profile_id;

describe("demo visibility mirrors the database rules", () => {
  it("a student sees only themself, their class's published work and their own scores", () => {
    const d = visibleTo(w, acc("student@example.com"));
    expect(d.students.map((s) => s.full_name)).toEqual(["Liya Getachew"]);
    expect(d.scores.every((s) => s.student_id === d.students[0].id)).toBe(true);
    expect(d.assessments.every((a) => a.published)).toBe(true);
    expect(d.parents).toHaveLength(0);
  });
  it("a parent sees exactly their two children", () => {
    const d = visibleTo(w, acc("parent@example.com"));
    expect(d.students.map((s) => s.full_name).sort()).toEqual(["Liya Getachew", "Natnael Getachew"]);
    expect(new Set(d.attendance.map((a) => a.student_id)).size).toBe(2);
  });
  it("a teacher sees only the classes they teach", () => {
    const d = visibleTo(w, acc("teacher@example.com"));
    const classes = new Set(d.students.map((s) => s.class_id));
    const taught = new Set([...w.classSubjects.filter((cs) => cs.teacher_id === w.teachers[0].id).map((cs) => cs.class_id), w.classes[0].id as string]);
    for (const c of classes) expect(taught.has(c as string)).toBe(true);
  });
  it("a teacher who doesn't teach a class sees none of its students", () => {
    const d = visibleTo(w, acc("selam.teacher@example.com")); // Social Studies + ICT: not in Grade 5B
    const c5B = w.classes[2].id;
    expect(d.students.some((s) => s.class_id === c5B)).toBe(false);
    expect(d.students.length).toBe(w.students.filter((s) => s.class_id !== c5B).length);
  });
  it("the administrator sees the whole school; only your own notifications and messages", () => {
    const d = visibleTo(w, acc("admin@example.com"));
    expect(d.students).toHaveLength(30);
    expect(d.notifications.every((n) => n.user_id === d.me.id)).toBe(true);
    const p = visibleTo(w, acc("parent@example.com"));
    expect(p.messages.every((m) => m.sender_id === p.me.id || m.recipient_id === p.me.id)).toBe(true);
  });
  it("announcements follow their audience", () => {
    const st = visibleTo(w, acc("student@example.com")).announcements.map((a) => a.audience);
    expect(st).not.toContain("parents");
    expect(st).not.toContain("teachers");
  });
});
