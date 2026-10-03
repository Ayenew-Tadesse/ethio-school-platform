// The platform's data, shaped like the database rows (snake_case kept so the
// Supabase store and the demo store return the same objects).

export type Role = "admin" | "teacher" | "student" | "parent";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type AssessmentKind = "homework" | "assignment" | "quiz" | "midterm" | "final";
export type ResourceType = "pdf" | "document" | "video" | "presentation" | "practice_test" | "study_guide" | "textbook";
export type Audience = "everyone" | "teachers" | "students" | "parents" | "class";

export const ASSESSMENT_KINDS: AssessmentKind[] = ["homework", "assignment", "quiz", "midterm", "final"];
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];
export const RESOURCE_TYPES: ResourceType[] = ["pdf", "document", "video", "presentation", "practice_test", "study_guide", "textbook"];

export interface School {
  id: string; name: string; city: string | null; region: string | null; phone: string | null; email: string | null; address: string | null;
  default_language: "en" | "am"; passing_score: number; attention_threshold: number; late_counts_as_present: boolean;
  attendance_edit_days: number;
  messaging: { parent_teacher: boolean; teacher_parent: boolean; teacher_student: boolean; student_teacher: boolean };
}
export interface Profile {
  id: string; school_id: string; role: Role; full_name: string; phone: string | null; preferred_language: "en" | "am";
  is_owner: boolean; admin_permissions: Record<string, boolean>;
}
export interface AcademicYear { id: string; school_id: string; name: string; starts_on: string; ends_on: string; is_current: boolean }
export interface Term { id: string; school_id: string; academic_year_id: string; name: string; ordinal: number; starts_on: string; ends_on: string }
export interface GradeLevel { id: string; school_id: string; level: number; name: string }
export interface Subject { id: string; school_id: string; name: string; name_am: string | null; code: string | null }
export interface GradingComponent { school_id: string; kind: AssessmentKind; weight: number }
export interface Teacher { id: string; school_id: string; profile_id: string | null; full_name: string; email: string | null; phone: string | null; staff_no: string | null }
export interface ClassRow { id: string; school_id: string; academic_year_id: string; grade_level_id: string; section: string; homeroom_teacher_id: string | null }
export interface Student {
  id: string; school_id: string; profile_id: string | null; class_id: string | null; full_name: string;
  student_no: string | null; gender: "F" | "M" | null; date_of_birth: string | null;
}
export interface Parent { id: string; school_id: string; profile_id: string | null; full_name: string; phone: string | null; email: string | null }
export interface ParentStudent { parent_id: string; student_id: string; relationship: "mother" | "father" | "guardian" | "other" }
export interface ClassSubject { id: string; school_id: string; class_id: string; subject_id: string; teacher_id: string | null }
export interface Attendance {
  id: string; school_id: string; class_id: string; student_id: string; date: string; status: AttendanceStatus; note: string | null;
}
export interface Assessment {
  id: string; school_id: string; class_subject_id: string; term_id: string | null; kind: AssessmentKind; title: string;
  description: string | null; due_at: string | null; scheduled_on: string | null; max_score: number; published: boolean;
  published_at: string | null; takes_submissions: boolean; allow_resubmit: boolean; created_at: string;
}
export interface FileRef { path: string; name: string; size?: number }
export interface AssessmentFile { id: string; assessment_id: string; path: string; name: string; size_bytes: number | null }
export interface Submission {
  id: string; assessment_id: string; student_id: string; body: string | null; files: FileRef[]; attempt: number; submitted_at: string; is_late: boolean;
}
export interface Score {
  id: string; assessment_id: string; student_id: string; score: number; feedback: string | null; released: boolean; graded_at: string;
}
export interface Resource {
  id: string; school_id: string; title: string; description: string | null; subject_id: string | null; grade_level_id: string | null;
  academic_year_id: string | null; topic: string | null; type: ResourceType; file_path: string | null; url: string | null;
  uploaded_by: string | null; created_at: string;
}
export interface Announcement {
  id: string; school_id: string; title: string; body: string; audience: Audience; class_id: string | null; author_id: string | null;
  pinned: boolean; published_at: string;
}
export interface Message {
  id: string; school_id: string; sender_id: string; recipient_id: string; student_id: string | null; body: string; read_at: string | null; created_at: string;
}
export interface Notification {
  id: string; school_id: string; user_id: string; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string;
}

/** Everything one signed-in person may see (what the store loads; RLS decides in Supabase). */
export interface Dataset {
  school: School; me: Profile;
  years: AcademicYear[]; terms: Term[]; gradeLevels: GradeLevel[]; subjects: Subject[]; weights: GradingComponent[];
  teachers: Teacher[]; classes: ClassRow[]; students: Student[]; parents: Parent[]; parentStudents: ParentStudent[];
  classSubjects: ClassSubject[]; attendance: Attendance[]; assessments: Assessment[]; assessmentFiles: AssessmentFile[]; submissions: Submission[]; scores: Score[];
  resources: Resource[]; announcements: Announcement[]; messages: Message[]; notifications: Notification[];
  /** Class averages (aggregates only, classes you belong to; none for fewer than 5 graded students). */
  classAverages: { class_subject_id: string; average: number }[];
  /** Names of people you can see (profile id → name and role), for messages and authors. */
  people: { id: string; full_name: string; role: Role }[];
}
