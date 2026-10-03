// What one person may see in the demo school: the same rules as the database's
// Row Level Security (supabase/migrations/…_security.sql), in code. Tests keep
// the two in step (visibility.test.ts mirrors tests/db/security.test.sql).
import type { Dataset, Profile } from "../domain/types";
import type { World } from "../demo/seed";

export function visibleTo(w: World, profileId: string): Dataset {
  const me = w.profiles.find((p) => p.id === profileId) as Profile;
  if (!me) throw new Error("Unknown account");
  const isAdmin = me.role === "admin";
  const myTeacher = w.teachers.find((t) => t.profile_id === me.id)?.id;
  const myStudent = w.students.find((s) => s.profile_id === me.id)?.id;
  const myParent = w.parents.find((p) => p.profile_id === me.id)?.id;
  const myChildren = new Set(w.parentStudents.filter((l) => l.parent_id === myParent).map((l) => l.student_id));
  const taughtClasses = new Set([
    ...w.classSubjects.filter((cs) => cs.teacher_id && cs.teacher_id === myTeacher).map((cs) => cs.class_id),
    ...w.classes.filter((c) => c.homeroom_teacher_id && c.homeroom_teacher_id === myTeacher).map((c) => c.id),
  ]);
  const myCs = new Set(w.classSubjects.filter((cs) => cs.teacher_id && cs.teacher_id === myTeacher).map((cs) => cs.id));
  const canSeeStudent = (id: string) => {
    const s = w.students.find((x) => x.id === id);
    return !!s && (isAdmin || s.id === myStudent || myChildren.has(s.id) || (!!s.class_id && taughtClasses.has(s.class_id)));
  };
  const myClasses = new Set(w.students.filter((s) => s.id === myStudent || myChildren.has(s.id)).map((s) => s.class_id).filter(Boolean) as string[]);
  const csClass = new Map(w.classSubjects.map((cs) => [cs.id, cs.class_id]));
  const assessments = w.assessments.filter((a) => isAdmin || myCs.has(a.class_subject_id) || (a.published && myClasses.has(csClass.get(a.class_subject_id)!)));
  const aIds = new Set(assessments.map((a) => a.id));
  const students = w.students.filter((s) => canSeeStudent(s.id));
  const sIds = new Set(students.map((s) => s.id));
  const parentStudents = me.role === "student" ? [] : w.parentStudents.filter((l) => sIds.has(l.student_id));
  const parentIds = new Set(parentStudents.map((l) => l.parent_id));
  const parents = w.parents.filter((p) => isAdmin || p.id === myParent || (me.role === "teacher" && parentIds.has(p.id)));
  const role = me.role;
  const announcements = w.announcements.filter((a) => isAdmin || a.author_id === me.id || a.audience === "everyone" || a.audience === `${role}s`
    || (a.audience === "class" && a.class_id != null && (myClasses.has(a.class_id) || taughtClasses.has(a.class_id))));
  const messages = w.messages.filter((m) => m.sender_id === me.id || m.recipient_id === me.id);
  // Names you can see: teachers (whole school), visible students and parents, admins, anyone you've messaged.
  const nameOf = new Map<string, { id: string; full_name: string; role: Profile["role"] }>();
  const add = (pid: string | null) => { const p = w.profiles.find((x) => x.id === pid); if (p) nameOf.set(p.id, { id: p.id, full_name: p.full_name, role: p.role }); };
  w.teachers.forEach((t) => add(t.profile_id));
  students.forEach((s) => add(s.profile_id));
  parents.forEach((p) => add(p.profile_id));
  w.profiles.filter((p) => p.role === "admin").forEach((p) => add(p.id));
  messages.forEach((m) => { add(m.sender_id); add(m.recipient_id); });
  return {
    school: w.school, me, years: w.years, terms: w.terms, gradeLevels: w.gradeLevels, subjects: w.subjects, weights: w.weights,
    teachers: w.teachers, classes: w.classes, classSubjects: w.classSubjects, students, parents, parentStudents,
    attendance: w.attendance.filter((a) => sIds.has(a.student_id)),
    assessments,
    assessmentFiles: (w.assessmentFiles ?? []).filter((f) => aIds.has(f.assessment_id)),
    submissions: w.submissions.filter((s) => aIds.has(s.assessment_id) && (isAdmin || myCs.has(w.assessments.find((a) => a.id === s.assessment_id)!.class_subject_id) || s.student_id === myStudent || myChildren.has(s.student_id))),
    scores: w.scores.filter((s) => aIds.has(s.assessment_id) && (isAdmin || myCs.has(w.assessments.find((a) => a.id === s.assessment_id)!.class_subject_id)
      || (s.released && (s.student_id === myStudent || myChildren.has(s.student_id))))),
    resources: w.resources, announcements, messages,
    notifications: w.notifications.filter((n) => n.user_id === me.id),
    people: [...nameOf.values()],
  };
}
