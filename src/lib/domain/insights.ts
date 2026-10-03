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
  const classmates = d.students.filter((s) => s.class_id === student.class_id);
  const subjectIds = [...new Set(d.classSubjects.filter((cs) => cs.class_id === student.class_id).map((cs) => cs.subject_id))];
  const subjects = subjectIds.map((subjectId) => {
    const set = mine.filter((a) => assessmentPlace(d, a).subjectId === subjectId);
    const b = breakdown(set, d.scores, student.id, w);
    const classAverage = mean(classmates.map((c) => breakdown(set, d.scores, c.id, w).overall));
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
