// The numbers the dashboards show, worked out from what one person may see
// (a Dataset). Pure functions: the same in the demo and with Supabase.
import type { Assessment, Dataset, Student } from "./types";
import { attendanceRate, breakdown, mean, needsAttention, weightsOf } from "./performance";

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export function className(d: Pick<Dataset, "classes" | "gradeLevels">, classId: string | null | undefined): string {
  const c = d.classes.find((x) => x.id === classId);
  if (!c) return "—";
  const g = d.gradeLevels.find((x) => x.id === c.grade_level_id);
  return `${g ? g.name : "Grade"} ${c.section}`.replace(/^Grade (\d+) /, "Grade $1");
}
export function subjectName(d: Pick<Dataset, "subjects">, subjectId: string | null | undefined, locale: "en" | "am" = "en") {
  const s = d.subjects.find((x) => x.id === subjectId);
  return s ? (locale === "am" && s.name_am ? s.name_am : s.name) : "—";
}
/** Class and subject of an assessment. */
export function assessmentPlace(d: Dataset, a: Assessment) {
  const cs = d.classSubjects.find((x) => x.id === a.class_subject_id);
  return { classId: cs?.class_id ?? null, subjectId: cs?.subject_id ?? null, teacherId: cs?.teacher_id ?? null };
}

export interface SubjectResult { subjectId: string; overall: number | null; classAverage: number | null; byKind: ReturnType<typeof breakdown>["byKind"] }
export interface StudentSummary {
  student: Student; overall: number | null; attendance: number | null; subjects: SubjectResult[];
  completion: number | null; attention: ReturnType<typeof needsAttention>; points: { at: string; pct: number }[];
}

const pointsOf = (d: Dataset, studentId: string, assessments = d.assessments) => {
  const byId = new Map(assessments.map((a) => [a.id, a]));
  return d.scores.filter((s) => s.student_id === studentId && s.released && byId.has(s.assessment_id)).map((s) => {
    const a = byId.get(s.assessment_id)!;
    return { at: a.due_at ?? a.scheduled_on ?? a.created_at, pct: (Number(s.score) / Number(a.max_score)) * 100 };
  });
};

/** Work a student was expected to hand in (published homework/assignments already due). */
function expectedWork(d: Dataset, classId: string | null) {
  const now = new Date().toISOString();
  return d.assessments.filter((a) => a.published && a.takes_submissions && a.due_at && a.due_at < now && assessmentPlace(d, a).classId === classId);
}

export function studentSummary(d: Dataset, studentId: string): StudentSummary | null {
  const student = d.students.find((s) => s.id === studentId);
  if (!student) return null;
  const w = weightsOf(d.weights);
  const mine = d.assessments.filter((a) => assessmentPlace(d, a).classId === student.class_id);
  const subjectIds = [...new Set(d.classSubjects.filter((cs) => cs.class_id === student.class_id).map((cs) => cs.subject_id))];
  const subjects = subjectIds.map((subjectId) => {
    const set = mine.filter((a) => assessmentPlace(d, a).subjectId === subjectId);
    const b = breakdown(set, d.scores, student.id, w);
    const cs = d.classSubjects.find((x) => x.class_id === student.class_id && x.subject_id === subjectId);
    const classAverage = d.classAverages.find((x) => x.class_subject_id === cs?.id)?.average ?? null;
    return { subjectId, overall: b.overall, classAverage, byKind: b.byKind };
  });
  const overall = mean(subjects.map((s) => s.overall));
  const att = attendanceRate(d.attendance.filter((a) => a.student_id === student.id), d.school.late_counts_as_present);
  const due = expectedWork(d, student.class_id);
  const done = due.filter((a) => d.submissions.some((s) => s.assessment_id === a.id && s.student_id === student.id)).length;
  const points = pointsOf(d, student.id, mine);
  return { student, overall, attendance: att, subjects, completion: due.length ? Math.round((done / due.length) * 100) : null,
    attention: needsAttention(points, overall, d.school.attention_threshold), points };
}

export interface ClassSummary { classId: string; students: number; average: number | null; attendance: number | null; completion: number | null; attention: StudentSummary[] }
export function classSummary(d: Dataset, classId: string): ClassSummary {
  const sums = d.students.filter((s) => s.class_id === classId).map((s) => studentSummary(d, s.id)!).filter(Boolean);
  return {
    classId, students: sums.length, average: mean(sums.map((s) => s.overall)),
    attendance: attendanceRate(d.attendance.filter((a) => a.class_id === classId && a.date >= daysAgo(30)), d.school.late_counts_as_present),
    completion: mean(sums.map((s) => s.completion)), attention: sums.filter((s) => s.attention.attention),
  };
}

export interface SchoolStats {
  students: number; teachers: number; attendance: number | null; completion: number | null; average: number | null;
  attention: StudentSummary[]; classes: ClassSummary[]; attendanceToday: { present: number; absent: number; late: number; recorded: number };
}
export function schoolStats(d: Dataset): SchoolStats {
  const classes = d.classes.map((c) => classSummary(d, c.id));
  const all = d.students.map((s) => studentSummary(d, s.id)!).filter(Boolean);
  const today = d.attendance.filter((a) => a.date === todayIso());
  return {
    students: d.students.length, teachers: d.teachers.length,
    attendance: attendanceRate(d.attendance.filter((a) => a.date >= daysAgo(30)), d.school.late_counts_as_present),
    completion: mean(all.map((s) => s.completion)), average: mean(all.map((s) => s.overall)),
    attention: all.filter((s) => s.attention.attention).sort((a, b) => (a.overall ?? 0) - (b.overall ?? 0)), classes,
    attendanceToday: { present: today.filter((a) => a.status === "present").length, absent: today.filter((a) => a.status === "absent").length,
      late: today.filter((a) => a.status === "late").length, recorded: today.length },
  };
}

/** Attendance per school day (last n days with records): rate 0–100. */
export function attendanceTrend(d: Dataset, studentIds?: Set<string>, days = 30) {
  const rows = d.attendance.filter((a) => a.date >= daysAgo(days) && (!studentIds || studentIds.has(a.student_id)));
  const byDay = new Map<string, typeof rows>();
  for (const r of rows) byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => ({ date, rate: attendanceRate(list, d.school.late_counts_as_present) ?? 0 }));
}

/** Upcoming work (published, due or scheduled from today), soonest first. */
export function upcoming(d: Dataset, classIds?: Set<string>, kinds?: Assessment["kind"][]) {
  const today = todayIso();
  return d.assessments
    .filter((a) => a.published && (a.due_at ?? a.scheduled_on ?? "") >= today && (!kinds || kinds.includes(a.kind))
      && (!classIds || classIds.has(assessmentPlace(d, a).classId ?? "")))
    .sort((a, b) => (a.due_at ?? a.scheduled_on ?? "").localeCompare(b.due_at ?? b.scheduled_on ?? ""));
}

/** The signed-in person's own student / teacher / parent row and the classes they relate to. */
export function whoAmI(d: Dataset) {
  const teacher = d.teachers.find((t) => t.profile_id === d.me.id) ?? null;
  const student = d.students.find((s) => s.profile_id === d.me.id) ?? null;
  const parent = d.parents.find((p) => p.profile_id === d.me.id) ?? null;
  const children = parent ? d.students.filter((s) => d.parentStudents.some((l) => l.parent_id === parent.id && l.student_id === s.id)) : [];
  const teachingCs = teacher ? d.classSubjects.filter((cs) => cs.teacher_id === teacher.id) : [];
  const teachingClasses = teacher ? [...new Set([...teachingCs.map((cs) => cs.class_id), ...d.classes.filter((c) => c.homeroom_teacher_id === teacher.id).map((c) => c.id)])] : [];
  return { teacher, student, parent, children, teachingCs, teachingClasses };
}

/** Where one student stands on one piece of work. */
export type WorkStatus = "graded" | "submitted" | "late" | "missing" | "todo" | "scheduled" | "absent_score";
export function workStatus(d: Dataset, a: Assessment, studentId: string): WorkStatus {
  const score = d.scores.find((s) => s.assessment_id === a.id && s.student_id === studentId && (s.released || d.me.role === "teacher" || d.me.role === "admin"));
  if (score) return "graded";
  if (!a.takes_submissions) return (a.scheduled_on ?? "") >= todayIso() ? "scheduled" : "absent_score";
  const sub = d.submissions.find((s) => s.assessment_id === a.id && s.student_id === studentId);
  if (sub) return sub.is_late ? "late" : "submitted";
  return a.due_at && a.due_at < new Date().toISOString() ? "missing" : "todo";
}
export const STATUS_TONE: Record<WorkStatus, string> = {
  graded: "badge-good", submitted: "badge-info", late: "badge-warn", missing: "badge-bad", todo: "badge-muted", scheduled: "badge-muted", absent_score: "badge-muted",
};
export const studentsIn = (d: Dataset, classId: string | null | undefined) =>
  d.students.filter((s) => s.class_id === classId).sort((a, b) => a.full_name.localeCompare(b.full_name));
/** Assessments the signed-in person can act on as a teacher (their class-subjects; all for admins). */
export function canTeach(d: Dataset, a: Assessment) {
  if (d.me.role === "admin") return true;
  const t = d.teachers.find((x) => x.profile_id === d.me.id);
  return !!t && d.classSubjects.some((cs) => cs.id === a.class_subject_id && cs.teacher_id === t.id);
}

/**
 * People the signed-in person may start a conversation with, by the school's
 * messaging rules (the same as private.can_message in the database, which has
 * the final say). Anyone who has written to you can always be answered.
 */
export function contacts(d: Dataset): Dataset["people"] {
  const me = d.me, rules = d.school.messaging;
  const who = whoAmI(d);
  const classesOfTeacher = (profileId: string) => {
    const t = d.teachers.find((x) => x.profile_id === profileId);
    if (!t) return new Set<string>();
    return new Set([...d.classSubjects.filter((cs) => cs.teacher_id === t.id).map((cs) => cs.class_id), ...d.classes.filter((c) => c.homeroom_teacher_id === t.id).map((c) => c.id)]);
  };
  const childClassesOfParent = (profileId: string) => {
    const p = d.parents.find((x) => x.profile_id === profileId);
    return d.parentStudents.filter((l) => l.parent_id === p?.id).map((l) => d.students.find((s) => s.id === l.student_id)?.class_id).filter(Boolean) as string[];
  };
  const mine = new Set(who.teachingClasses);
  const repliers = new Set(d.messages.filter((m) => m.recipient_id === me.id).map((m) => m.sender_id));
  return d.people.filter((p) => {
    if (p.id === me.id) return false;
    if (repliers.has(p.id) || me.role === "admin") return true;
    if (p.role === "admin") return me.role === "teacher" || me.role === "parent";
    if (me.role === "parent" && p.role === "teacher") { const c = classesOfTeacher(p.id); return rules.parent_teacher && who.children.some((k) => k.class_id && c.has(k.class_id)); }
    if (me.role === "teacher" && p.role === "parent") return rules.teacher_parent && childClassesOfParent(p.id).some((c) => mine.has(c));
    if (me.role === "teacher" && p.role === "student") { const c = d.students.find((s) => s.profile_id === p.id)?.class_id; return rules.teacher_student && !!c && mine.has(c); }
    if (me.role === "student" && p.role === "teacher") return rules.student_teacher && !!who.student?.class_id && classesOfTeacher(p.id).has(who.student.class_id);
    return false;
  }).sort((a, b) => a.full_name.localeCompare(b.full_name));
}
