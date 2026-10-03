// The demo school in this browser: shared by every demo account (so a teacher's
// homework reaches the student, and the grade reaches the parent), saved in
// localStorage, with the database's rules applied in code. Clearly a demo:
// nothing leaves the browser; "Reset demo data" starts over.
import type { Assessment, AssessmentKind, Dataset, Notification, Profile } from "../domain/types";
import { DEMO_PASSWORD, buildWorld, type World } from "../demo/seed";
import { visibleTo } from "./visibility";
import { weightsProblem, type NewAssessment, type NewPerson, type Store } from "./store";

const KEY = "esp_demo_world_v1";
const ACCOUNT = "esp_demo_account";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

export function loadWorld(): World {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const w = JSON.parse(raw) as World; w.assessmentFiles ??= []; return w; }
  } catch { /* fresh */ }
  const w = buildWorld();
  saveWorld(w);
  return w;
}
function saveWorld(w: World) { try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* storage full or blocked: this visit only */ } }
export function resetDemo() { try { localStorage.removeItem(KEY); } catch { /* nothing to reset */ } }
export const demoAccount = () => { try { return localStorage.getItem(ACCOUNT); } catch { return null; } };
export const setDemoAccount = (profileId: string | null) => {
  try { if (profileId) localStorage.setItem(ACCOUNT, profileId); else localStorage.removeItem(ACCOUNT); } catch { /* this visit only */ }
};
// Files in the demo stay in memory for this visit (shown as links while the tab is open).
const files = new Map<string, string>();
const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const keep = (file: File) => { const path = `demo/${uid()}/${file.name}`; files.set(path, URL.createObjectURL(file)); return { path, name: file.name, size: file.size }; };

export class DemoStore implements Store {
  mode = "demo" as const;
  constructor(private profileId: string) {}
  private w = loadWorld();
  private get me(): Profile {
    const p = this.w.profiles.find((x) => x.id === this.profileId);
    if (!p) throw new Error("This demo account no longer exists. Reset the demo.");
    return p;
  }
  private commit() { saveWorld(this.w); }
  private deny(): never { throw new Error("You don't have permission to do that."); }
  private notify(user: string | null | undefined, kind: string, title: string, body: string | null, link: string) {
    if (!user) return;
    const n: Notification = { id: uid(), school_id: this.w.school.id, user_id: user, kind, title, body, link, read_at: null, created_at: nowIso() };
    this.w.notifications.push(n);
  }
  private myTeacher() { return this.w.teachers.find((t) => t.profile_id === this.me.id); }
  private teachesCs(csId: string) { const t = this.myTeacher(); return !!t && this.w.classSubjects.some((cs) => cs.id === csId && cs.teacher_id === t.id); }
  private teachesClass(classId: string) {
    const t = this.myTeacher();
    return !!t && (this.w.classSubjects.some((cs) => cs.class_id === classId && cs.teacher_id === t.id) || this.w.classes.some((c) => c.id === classId && c.homeroom_teacher_id === t.id));
  }
  private isAdmin() { return this.me.role === "admin"; }

  async load(): Promise<Dataset> { this.w = loadWorld(); return visibleTo(this.w, this.profileId); }
  async signOut() { setDemoAccount(null); }

  async saveAttendance(classId: string, date: string, rows: { student_id: string; status: Dataset["attendance"][number]["status"]; note?: string | null }[]) {
    const edit = this.w.school.attendance_edit_days;
    const limit = new Date(Date.now() - edit * 86400000).toISOString().slice(0, 10);
    if (!this.isAdmin() && (!this.teachesClass(classId) || date < limit)) this.deny();
    if (date > today()) throw new Error("Attendance can't be recorded for a future date.");
    for (const r of rows) {
      const st = this.w.students.find((s) => s.id === r.student_id);
      if (!st || st.class_id !== classId) continue;
      const cur = this.w.attendance.find((a) => a.student_id === r.student_id && a.date === date);
      const wasAbsent = cur?.status === "absent";
      if (cur) { cur.status = r.status; cur.note = r.note ?? null; }
      else this.w.attendance.push({ id: uid(), school_id: this.w.school.id, class_id: classId, student_id: r.student_id, date, status: r.status, note: r.note ?? null });
      if (r.status === "absent" && !wasAbsent) for (const l of this.w.parentStudents.filter((x) => x.student_id === st.id)) {
        const pa = this.w.parents.find((p) => p.id === l.parent_id);
        this.notify(pa?.profile_id, "absent", `${st.full_name} was absent`, date, "/app/attendance");
      }
    }
    this.commit();
  }

  async createAssessment(input: NewAssessment): Promise<Assessment> {
    if (!this.teachesCs(input.class_subject_id) && !this.isAdmin()) this.deny();
    if (!input.title.trim()) throw new Error("Add a title.");
    if (!(input.max_score > 0)) throw new Error("The maximum score must be more than 0.");
    const day = (input.due_at ?? input.scheduled_on ?? today()).slice(0, 10);
    const term = this.w.terms.find((t) => day >= t.starts_on && day <= t.ends_on) ?? this.w.terms[0];
    const a: Assessment = {
      id: uid(), school_id: this.w.school.id, class_subject_id: input.class_subject_id, term_id: term?.id ?? null, kind: input.kind,
      title: input.title.trim(), description: input.description.trim() || null, due_at: input.due_at, scheduled_on: input.scheduled_on,
      max_score: input.max_score, published: false, published_at: null, takes_submissions: input.kind === "homework" || input.kind === "assignment",
      allow_resubmit: input.allow_resubmit, created_at: nowIso(),
    };
    this.w.assessments.push(a);
    for (const f of input.files) { const k = keep(f); this.w.assessmentFiles.push({ id: uid(), assessment_id: a.id, path: k.path, name: k.name, size_bytes: k.size }); }
    this.commit();
    if (input.publish) await this.publishAssessment(a.id);
    return a;
  }

  async publishAssessment(id: string) {
    const a = this.w.assessments.find((x) => x.id === id);
    if (!a) throw new Error("Not found.");
    if (!this.teachesCs(a.class_subject_id) && !this.isAdmin()) this.deny();
    if (a.published) return;
    a.published = true; a.published_at = nowIso();
    const cs = this.w.classSubjects.find((c) => c.id === a.class_subject_id)!;
    const subject = this.w.subjects.find((s) => s.id === cs.subject_id)?.name ?? "";
    for (const st of this.w.students.filter((s) => s.class_id === cs.class_id)) {
      this.notify(st.profile_id, "new_assessment", `${subject}: ${a.title}`, null, `/app/assignments/${a.id}`);
      for (const l of this.w.parentStudents.filter((x) => x.student_id === st.id))
        this.notify(this.w.parents.find((p) => p.id === l.parent_id)?.profile_id, "new_assessment", `${subject}: ${a.title}`, st.full_name, `/app/assignments/${a.id}`);
    }
    this.commit();
  }

  async grade(assessmentId: string, studentId: string, score: number, feedback: string | null) {
    const a = this.w.assessments.find((x) => x.id === assessmentId);
    if (!a) throw new Error("Not found.");
    if (!this.teachesCs(a.class_subject_id) && !this.isAdmin()) this.deny();
    if (!(score >= 0) || score > a.max_score) throw new Error(`The score must be between 0 and ${a.max_score}.`);
    const st = this.w.students.find((s) => s.id === studentId)!;
    const cur = this.w.scores.find((s) => s.assessment_id === assessmentId && s.student_id === studentId);
    if (cur) Object.assign(cur, { score, feedback, graded_at: nowIso(), released: true });
    else this.w.scores.push({ id: uid(), assessment_id: assessmentId, student_id: studentId, score, feedback, released: true, graded_at: nowIso() });
    this.notify(st.profile_id, "grade_released", `New grade: ${a.title}`, `${score} / ${a.max_score}`, "/app/grades");
    for (const l of this.w.parentStudents.filter((x) => x.student_id === st.id))
      this.notify(this.w.parents.find((p) => p.id === l.parent_id)?.profile_id, "grade_released", `${st.full_name}: ${a.title}`, `${score} / ${a.max_score}`, "/app/grades");
    this.commit();
  }

  async submit(assessmentId: string, body: string, fileList: File[]) {
    const st = this.w.students.find((s) => s.profile_id === this.me.id);
    const a = this.w.assessments.find((x) => x.id === assessmentId);
    if (!st || !a) this.deny();
    const cs = this.w.classSubjects.find((c) => c.id === a.class_subject_id)!;
    if (!a.published || !a.takes_submissions || cs.class_id !== st.class_id) throw new Error("This work is not open for submissions.");
    const graded = this.w.scores.some((s) => s.assessment_id === a.id && s.student_id === st.id);
    const cur = this.w.submissions.find((s) => s.assessment_id === a.id && s.student_id === st.id);
    if (cur && graded && !a.allow_resubmit) throw new Error("This work has been graded and can't be resubmitted.");
    const late = !!a.due_at && nowIso() > a.due_at;
    const kept = fileList.map(keep);
    if (cur) Object.assign(cur, { body, files: kept.length ? kept : cur.files, attempt: cur.attempt + 1, submitted_at: nowIso(), is_late: late });
    else this.w.submissions.push({ id: uid(), assessment_id: a.id, student_id: st.id, body, files: kept, attempt: 1, submitted_at: nowIso(), is_late: late });
    const teacher = this.w.teachers.find((t) => t.id === cs.teacher_id);
    this.notify(teacher?.profile_id, "submission", `${st.full_name} submitted ${a.title}`, late ? "Late" : null, `/app/assignments/${a.id}`);
    this.commit();
  }

  async fileUrl(_bucket: "materials" | "submissions", path: string) {
    const kept = files.get(path);
    if (kept) return kept;
    // Library items that come with the demo school: a short sample page stands in for the real file.
    const r = this.w.resources.find((x) => x.file_path === path);
    if (!r) return null;
    const html = `<!doctype html><meta charset="utf-8"><title>${esc(r.title)}</title><body style="font:16px/1.6 system-ui;max-width:40rem;margin:3rem auto;padding:0 1rem">`
      + `<p style="color:#5b6a62">Sample document · demo school</p><h1>${esc(r.title)}</h1><p>${esc(r.description ?? "")}</p>`
      + `<p style="color:#5b6a62">In a real school this is the file the teacher uploaded.</p></body>`;
    return URL.createObjectURL(new Blob([html], { type: "text/html" }));
  }

  async sendMessage(to: string, body: string, studentId?: string | null) {
    const text = body.trim();
    if (!text) throw new Error("Write a message first.");
    if (!this.canMessage(to)) throw new Error("Your school doesn't allow messaging this person.");
    this.w.messages.push({ id: uid(), school_id: this.w.school.id, sender_id: this.me.id, recipient_id: to, student_id: studentId ?? null, body: text, read_at: null, created_at: nowIso() });
    this.notify(to, "message", `New message from ${this.me.full_name}`, text.slice(0, 120), "/app/messages");
    this.commit();
  }
  /** The school's messaging rules (same as private.can_message in the database). */
  canMessage(to: string): boolean {
    const me = this.me, them = this.w.profiles.find((p) => p.id === to);
    if (!them || them.id === me.id) return false;
    if (this.w.messages.some((m) => m.sender_id === to && m.recipient_id === me.id)) return true;
    if (me.role === "admin") return true;
    if (them.role === "admin") return me.role === "teacher" || me.role === "parent";
    const rules = this.w.school.messaging;
    const t = (pid: string) => this.w.teachers.find((x) => x.profile_id === pid);
    const childClasses = (parentPid: string) => {
      const pa = this.w.parents.find((p) => p.profile_id === parentPid);
      return this.w.parentStudents.filter((l) => l.parent_id === pa?.id).map((l) => this.w.students.find((s) => s.id === l.student_id)?.class_id);
    };
    const classesOf = (teacherPid: string) => {
      const te = t(teacherPid);
      return new Set([...this.w.classSubjects.filter((cs) => cs.teacher_id === te?.id).map((cs) => cs.class_id), ...this.w.classes.filter((c) => c.homeroom_teacher_id === te?.id).map((c) => c.id)]);
    };
    if (me.role === "parent" && them.role === "teacher") return rules.parent_teacher && childClasses(me.id).some((c) => c && classesOf(them.id).has(c));
    if (me.role === "teacher" && them.role === "parent") return rules.teacher_parent && childClasses(them.id).some((c) => c && classesOf(me.id).has(c));
    if (me.role === "teacher" && them.role === "student") { const c = this.w.students.find((s) => s.profile_id === them.id)?.class_id; return rules.teacher_student && !!c && classesOf(me.id).has(c); }
    if (me.role === "student" && them.role === "teacher") { const c = this.w.students.find((s) => s.profile_id === me.id)?.class_id; return rules.student_teacher && !!c && classesOf(them.id).has(c); }
    return false;
  }
  async markMessagesRead(from: string) {
    for (const m of this.w.messages) if (m.sender_id === from && m.recipient_id === this.me.id && !m.read_at) m.read_at = nowIso();
    this.commit();
  }
  async markNotificationsRead(ids: string[]) {
    for (const n of this.w.notifications) if (ids.includes(n.id) && n.user_id === this.me.id) n.read_at = nowIso();
    this.commit();
  }

  async postAnnouncement(input: { title: string; body: string; audience: Dataset["announcements"][number]["audience"]; class_id: string | null; pinned: boolean }) {
    if (!input.title.trim() || !input.body.trim()) throw new Error("Add a title and a message.");
    if (!this.isAdmin() && !(input.audience === "class" && input.class_id && this.teachesClass(input.class_id))) this.deny();
    const a = { id: uid(), school_id: this.w.school.id, title: input.title.trim(), body: input.body.trim(), audience: input.audience,
      class_id: input.audience === "class" ? input.class_id : null, author_id: this.me.id, pinned: input.pinned, published_at: nowIso() };
    this.w.announcements.unshift(a);
    for (const p of this.w.profiles) {
      if (p.id === this.me.id) continue;
      const inClass = a.class_id && (this.w.students.some((s) => s.profile_id === p.id && s.class_id === a.class_id)
        || this.w.parents.some((pa) => pa.profile_id === p.id && this.w.parentStudents.some((l) => l.parent_id === pa.id && this.w.students.find((s) => s.id === l.student_id)?.class_id === a.class_id)));
      if (a.audience === "everyone" || a.audience === `${p.role}s` || (a.audience === "class" && inClass)) this.notify(p.id, "announcement", a.title, null, "/app/announcements");
    }
    this.commit();
  }

  async addResource(input: Parameters<Store["addResource"]>[0]) {
    if (this.me.role !== "teacher" && !this.isAdmin()) this.deny();
    if (!input.title.trim()) throw new Error("Add a title.");
    if (!input.file && !input.url) throw new Error("Attach a file or add a link.");
    const kept = input.file ? keep(input.file) : null;
    this.w.resources.unshift({ id: uid(), school_id: this.w.school.id, title: input.title.trim(), description: input.description.trim() || null,
      subject_id: input.subject_id, grade_level_id: input.grade_level_id, academic_year_id: this.w.years.find((y) => y.is_current)?.id ?? null,
      topic: input.topic.trim() || null, type: input.type, file_path: kept?.path ?? null, url: input.url, uploaded_by: this.me.id, created_at: nowIso() });
    this.commit();
  }

  // ---- administrators
  private admin() { if (!this.isAdmin()) this.deny(); }
  async updateSchool(patch: Parameters<Store["updateSchool"]>[0]) { this.admin(); Object.assign(this.w.school, patch); this.commit(); }
  async saveWeights(weights: Record<AssessmentKind, number>) {
    this.admin();
    const problem = weightsProblem(weights);
    if (problem) throw new Error(problem);
    this.w.weights = (Object.keys(weights) as AssessmentKind[]).map((kind) => ({ school_id: this.w.school.id, kind, weight: Number(weights[kind]) }));
    this.commit();
  }
  async addSubject(name: string, name_am: string | null, code: string | null) {
    this.admin();
    if (!name.trim()) throw new Error("Add the subject's name.");
    if (this.w.subjects.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())) throw new Error("That subject already exists.");
    this.w.subjects.push({ id: uid(), school_id: this.w.school.id, name: name.trim(), name_am, code });
    this.commit();
  }
  async addClass(grade_level_id: string, section: string, homeroom_teacher_id: string | null) {
    this.admin();
    const sec = section.trim().toUpperCase();
    if (!/^[A-Z]{1,3}$/.test(sec)) throw new Error("A section is one to three letters, e.g. A.");
    const year = this.w.years.find((y) => y.is_current)!;
    if (this.w.classes.some((c) => c.grade_level_id === grade_level_id && c.section === sec && c.academic_year_id === year.id)) throw new Error("That class already exists.");
    const c = { id: uid(), school_id: this.w.school.id, academic_year_id: year.id, grade_level_id, section: sec, homeroom_teacher_id };
    this.w.classes.push(c);
    this.commit();
    return c.id;
  }
  async assignTeacher(class_id: string, subject_id: string, teacher_id: string | null) {
    this.admin();
    const cur = this.w.classSubjects.find((cs) => cs.class_id === class_id && cs.subject_id === subject_id);
    if (cur) cur.teacher_id = teacher_id;
    else this.w.classSubjects.push({ id: uid(), school_id: this.w.school.id, class_id, subject_id, teacher_id });
    this.commit();
  }
  async setHomeroom(class_id: string, teacher_id: string | null) {
    this.admin();
    const c = this.w.classes.find((x) => x.id === class_id);
    if (c) c.homeroom_teacher_id = teacher_id;
    this.commit();
  }
  async addPerson(p: NewPerson) {
    this.admin();
    if (!p.full_name.trim()) throw new Error("Add the person's name.");
    if (p.role === "admin" && !this.me.is_owner) throw new Error("Only the school owner can add administrators.");
    if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) throw new Error("That email address doesn't look right.");
    if (p.email && this.w.accounts.some((a) => a.email === p.email!.toLowerCase())) throw new Error("Someone with that email already has a login.");
    const S = this.w.school.id;
    const profile = p.email ? { id: uid(), school_id: S, role: p.role, full_name: p.full_name.trim(), phone: p.phone, preferred_language: "en" as const, is_owner: false, admin_permissions: {} } : null;
    if (profile) this.w.profiles.push(profile);
    let id = profile?.id ?? uid();
    if (p.role === "teacher") { id = uid(); this.w.teachers.push({ id, school_id: S, profile_id: profile?.id ?? null, full_name: p.full_name.trim(), email: p.email, phone: p.phone, staff_no: null }); }
    if (p.role === "student") { id = uid(); this.w.students.push({ id, school_id: S, profile_id: profile?.id ?? null, class_id: p.class_id ?? null, full_name: p.full_name.trim(), student_no: p.student_no ?? null, gender: p.gender ?? null, date_of_birth: null }); }
    if (p.role === "parent") {
      id = uid();
      this.w.parents.push({ id, school_id: S, profile_id: profile?.id ?? null, full_name: p.full_name.trim(), phone: p.phone, email: p.email });
      for (const c of p.child_ids ?? []) this.w.parentStudents.push({ parent_id: id, student_id: c, relationship: "guardian" });
    }
    if (profile && p.email) this.w.accounts.push({ email: p.email.toLowerCase(), profile_id: profile.id, role: p.role, label: p.full_name });
    this.commit();
    return { id, tempPassword: profile ? DEMO_PASSWORD : undefined };
  }
  async linkParent(parent_id: string, student_id: string, relationship: "mother" | "father" | "guardian" | "other") {
    this.admin();
    if (!this.w.parentStudents.some((l) => l.parent_id === parent_id && l.student_id === student_id)) this.w.parentStudents.push({ parent_id, student_id, relationship });
    this.commit();
  }
  async moveStudent(student_id: string, class_id: string | null) {
    this.admin();
    const s = this.w.students.find((x) => x.id === student_id);
    if (s) s.class_id = class_id;
    this.commit();
  }
}
