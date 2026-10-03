// What the screens can ask for and do. Two stores implement it:
//   SupabaseStore: the real thing (Row Level Security decides what you see);
//   DemoStore: the demo school kept in this browser, with the same rules (visibility.ts).
import type { AttendanceStatus, Assessment, AssessmentKind, Audience, Dataset, ResourceType, Role, School } from "../domain/types";

export type NewAssessment = {
  class_subject_id: string; kind: AssessmentKind; title: string; description: string; due_at: string | null;
  scheduled_on: string | null; max_score: number; publish: boolean; allow_resubmit: boolean; files: File[];
};
export type NewPerson = {
  role: Exclude<Role, "admin"> | "admin"; full_name: string; email: string | null; phone: string | null;
  class_id?: string | null; student_no?: string | null; gender?: "F" | "M" | null; child_ids?: string[];
};

export interface Store {
  mode: "demo" | "supabase";
  /** Everything the signed-in person may see. */
  load(): Promise<Dataset>;
  signOut(): Promise<void>;

  // Teachers
  saveAttendance(classId: string, date: string, rows: { student_id: string; status: AttendanceStatus; note?: string | null }[]): Promise<void>;
  createAssessment(input: NewAssessment): Promise<Assessment>;
  publishAssessment(id: string): Promise<void>;
  grade(assessmentId: string, studentId: string, score: number, feedback: string | null): Promise<void>;
  // Students
  submit(assessmentId: string, body: string, files: File[]): Promise<void>;
  // Everyone
  fileUrl(bucket: "materials" | "submissions", path: string): Promise<string | null>;
  sendMessage(toProfileId: string, body: string, studentId?: string | null): Promise<void>;
  markMessagesRead(fromProfileId: string): Promise<void>;
  markNotificationsRead(ids: string[]): Promise<void>;
  postAnnouncement(input: { title: string; body: string; audience: Audience; class_id: string | null; pinned: boolean }): Promise<void>;
  addResource(input: { title: string; description: string; subject_id: string | null; grade_level_id: string | null; topic: string;
    type: ResourceType; url: string | null; file: File | null }): Promise<void>;
  // Administrators
  updateSchool(patch: Partial<Pick<School, "name" | "city" | "region" | "phone" | "email" | "address" | "passing_score" | "attention_threshold" |
    "late_counts_as_present" | "attendance_edit_days" | "messaging">>): Promise<void>;
  saveWeights(weights: Record<AssessmentKind, number>): Promise<void>;
  addSubject(name: string, name_am: string | null, code: string | null): Promise<void>;
  addClass(grade_level_id: string, section: string, homeroom_teacher_id: string | null): Promise<string>;
  assignTeacher(class_id: string, subject_id: string, teacher_id: string | null): Promise<void>;
  setHomeroom(class_id: string, teacher_id: string | null): Promise<void>;
  addPerson(p: NewPerson): Promise<{ id: string; tempPassword?: string }>;
  linkParent(parent_id: string, student_id: string, relationship: "mother" | "father" | "guardian" | "other"): Promise<void>;
  moveStudent(student_id: string, class_id: string | null): Promise<void>;
}

/** Grading weights must be whole, non-negative and add up to 100. */
export function weightsProblem(weights: Record<AssessmentKind, number>): string | null {
  const v = Object.values(weights);
  if (v.some((x) => !Number.isFinite(x) || x < 0 || x > 100)) return "Each weight must be between 0 and 100.";
  const total = v.reduce((a, b) => a + b, 0);
  return Math.abs(total - 100) > 0.001 ? `The weights add up to ${total}%. They must add up to 100%.` : null;
}

/** A friendly message for any store error (database refusals, network, validation). */
export function errorText(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/row-level security|permission denied|42501/i.test(m)) return "You don't have permission to do that.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "You're offline or the server can't be reached. Please try again.";
  return m || "Something went wrong.";
}
