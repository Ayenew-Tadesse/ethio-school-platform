"use client";
// The real store: everything goes to Supabase as the signed-in person, with
// the public anon key. Row Level Security decides what comes back and what is
// allowed; triggers stamp late work and send notifications. Creating logins
// goes through the server (app/api/admin/people), which checks the caller.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Assessment, AssessmentKind, Dataset, Profile } from "../domain/types";
import { supabase } from "../supabase/client";
import { weightsProblem, type NewAssessment, type NewPerson, type Store } from "./store";

const safeName = (n: string) => n.replace(/[^\w.\- ]+/g, "_").slice(-80);
const rnd = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`);

export class SupabaseStore implements Store {
  mode = "supabase" as const;
  private sb: SupabaseClient = supabase();
  private me: Profile | null = null;

  // Any Supabase call: its data, or its error thrown (RLS refusals become friendly via errorText).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async must<T = unknown>(p: PromiseLike<{ data: any; error: { message: string } | null }>): Promise<T> {
    const { data, error } = await p;
    if (error) throw new Error(error.message);
    return data as T;
  }
  private get schoolId() { if (!this.me) throw new Error("Not signed in."); return this.me.school_id; }

  async load(): Promise<Dataset> {
    const { data: { user } } = await this.sb.auth.getUser();
    if (!user) throw new Error("Not signed in.");
    const all = <T,>(table: string, order?: string) => {
      const q = this.sb.from(table).select("*");
      return this.must<T[]>(order ? q.order(order, { ascending: false }) : q);
    };
    const me = await this.must<Profile>(this.sb.from("profiles").select("*").eq("id", user.id).single());
    this.me = me;
    const [school, years, terms, gradeLevels, subjects, weights, teachers, classes, students, parents, parentStudents, classSubjects,
      attendance, assessments, assessmentFiles, submissions, scores, resources, announcements, messages, notifications, people, classAverages] = await Promise.all([
      this.must<Dataset["school"]>(this.sb.from("schools").select("*").eq("id", me.school_id).single()),
      all<Dataset["years"][number]>("academic_years"), all<Dataset["terms"][number]>("terms"), all<Dataset["gradeLevels"][number]>("grade_levels"),
      all<Dataset["subjects"][number]>("subjects"), all<Dataset["weights"][number]>("grading_components"), all<Dataset["teachers"][number]>("teachers"),
      all<Dataset["classes"][number]>("classes"), all<Dataset["students"][number]>("students"), all<Dataset["parents"][number]>("parents"),
      all<Dataset["parentStudents"][number]>("parent_students"), all<Dataset["classSubjects"][number]>("class_subjects"),
      // Recent attendance is plenty for dashboards and rates (about one school year).
      this.must<Dataset["attendance"]>(this.sb.from("attendance").select("*").gte("date", new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10))),
      all<Assessment>("assessments", "created_at"), all<Dataset["assessmentFiles"][number]>("assessment_files"),
      all<Dataset["submissions"][number]>("submissions"), all<Dataset["scores"][number]>("scores"),
      all<Dataset["resources"][number]>("learning_resources", "created_at"), all<Dataset["announcements"][number]>("announcements", "published_at"),
      all<Dataset["messages"][number]>("messages", "created_at"),
      this.must<Dataset["notifications"]>(this.sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(200)),
      this.must<Dataset["people"]>(this.sb.rpc("my_people")),
      this.must<Dataset["classAverages"]>(this.sb.rpc("class_averages")),
    ]);
    return { school, me, years, terms, gradeLevels, subjects, weights, teachers, classes, students, parents, parentStudents, classSubjects,
      attendance, assessments, assessmentFiles, submissions, scores, resources, announcements, messages, notifications, people,
      classAverages: classAverages.map((c) => ({ ...c, average: Number(c.average) })) };
  }
  async signOut() { await this.sb.auth.signOut(); }

  async saveAttendance(classId: string, date: string, rows: { student_id: string; status: Dataset["attendance"][number]["status"]; note?: string | null }[]) {
    if (!rows.length) return;
    await this.must(this.sb.from("attendance").upsert(rows.map((r) => ({ school_id: this.schoolId, class_id: classId, student_id: r.student_id, date,
      status: r.status, note: r.note ?? null, recorded_by: this.me!.id })), { onConflict: "student_id,date" }));
  }

  private async upload(bucket: "materials" | "submissions", folder: string, file: File) {
    const path = `${folder}/${rnd()}-${safeName(file.name)}`;
    await this.must(this.sb.storage.from(bucket).upload(path, file, { contentType: file.type || undefined }));
    return { path, name: file.name, size: file.size };
  }

  async createAssessment(input: NewAssessment): Promise<Assessment> {
    if (!input.title.trim()) throw new Error("Add a title.");
    const { files, publish, ...rest } = input;
    const a = await this.must<Assessment>(this.sb.from("assessments").insert({
      ...rest, title: input.title.trim(), description: input.description.trim() || null, school_id: this.schoolId,
      takes_submissions: input.kind === "homework" || input.kind === "assignment", published: false,
    }).select().single());
    for (const f of files) {
      const k = await this.upload("materials", `${this.schoolId}/${a.id}`, f);
      await this.must(this.sb.from("assessment_files").insert({ assessment_id: a.id, path: k.path, name: k.name, size_bytes: k.size }));
    }
    if (publish) await this.publishAssessment(a.id);
    return a;
  }
  async publishAssessment(id: string) { await this.must(this.sb.from("assessments").update({ published: true }).eq("id", id).select("id").single()); }

  async grade(assessmentId: string, studentId: string, score: number, feedback: string | null) {
    await this.must(this.sb.from("scores").upsert({ assessment_id: assessmentId, student_id: studentId, score, feedback, released: true },
      { onConflict: "assessment_id,student_id" }).select("id").single());
  }

  async submit(assessmentId: string, body: string, fileList: File[]) {
    const me = await this.must<{ id: string }>(this.sb.from("students").select("id").eq("profile_id", this.me!.id).single());
    const kept = [];
    for (const f of fileList) kept.push(await this.upload("submissions", `${this.schoolId}/${assessmentId}/${me.id}`, f));
    const cur = await this.must<{ id: string; files: unknown[] } | null>(this.sb.from("submissions").select("id, files").eq("assessment_id", assessmentId).eq("student_id", me.id).maybeSingle());
    if (cur) await this.must(this.sb.from("submissions").update({ body, files: kept.length ? kept : cur.files }).eq("id", cur.id).select("id").single());
    else await this.must(this.sb.from("submissions").insert({ assessment_id: assessmentId, student_id: me.id, body, files: kept }));
  }

  async fileUrl(bucket: "materials" | "submissions", path: string) {
    const { data } = await this.sb.storage.from(bucket).createSignedUrl(path, 300);
    return data?.signedUrl ?? null;
  }

  async sendMessage(to: string, body: string, studentId?: string | null) {
    if (!body.trim()) throw new Error("Write a message first.");
    await this.must(this.sb.from("messages").insert({ school_id: this.schoolId, sender_id: this.me!.id, recipient_id: to, body: body.trim(), student_id: studentId ?? null }));
  }
  async markMessagesRead(from: string) {
    await this.must(this.sb.from("messages").update({ read_at: new Date().toISOString() }).eq("sender_id", from).eq("recipient_id", this.me!.id).is("read_at", null));
  }
  async markNotificationsRead(ids: string[]) {
    if (ids.length) await this.must(this.sb.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids));
  }
  async postAnnouncement(input: Parameters<Store["postAnnouncement"]>[0]) {
    await this.must(this.sb.from("announcements").insert({ ...input, class_id: input.audience === "class" ? input.class_id : null, school_id: this.schoolId, author_id: this.me!.id }));
  }
  async addResource(input: Parameters<Store["addResource"]>[0]) {
    const { file, ...rest } = input;
    const kept = file ? await this.upload("materials", `${this.schoolId}/library`, file) : null;
    await this.must(this.sb.from("learning_resources").insert({ ...rest, description: rest.description.trim() || null, topic: rest.topic.trim() || null,
      school_id: this.schoolId, file_path: kept?.path ?? null, uploaded_by: this.me!.id }));
  }

  // ---- administrators (RLS checks the permission; these just send the change)
  async updateSchool(patch: Parameters<Store["updateSchool"]>[0]) { await this.must(this.sb.from("schools").update(patch).eq("id", this.schoolId).select("id").single()); }
  async saveWeights(weights: Record<AssessmentKind, number>) {
    const problem = weightsProblem(weights);
    if (problem) throw new Error(problem);
    await this.must(this.sb.from("grading_components").upsert((Object.keys(weights) as AssessmentKind[]).map((kind) => ({ school_id: this.schoolId, kind, weight: weights[kind] }))));
  }
  async addSubject(name: string, name_am: string | null, code: string | null) {
    await this.must(this.sb.from("subjects").insert({ school_id: this.schoolId, name: name.trim(), name_am, code }));
  }
  async addClass(grade_level_id: string, section: string, homeroom_teacher_id: string | null) {
    const year = await this.must<{ id: string }>(this.sb.from("academic_years").select("id").eq("is_current", true).single());
    const c = await this.must<{ id: string }>(this.sb.from("classes").insert({ school_id: this.schoolId, academic_year_id: year.id, grade_level_id,
      section: section.trim().toUpperCase(), homeroom_teacher_id }).select("id").single());
    return c.id;
  }
  async assignTeacher(class_id: string, subject_id: string, teacher_id: string | null) {
    await this.must(this.sb.from("class_subjects").upsert({ school_id: this.schoolId, class_id, subject_id, teacher_id }, { onConflict: "class_id,subject_id" }));
  }
  async setHomeroom(class_id: string, teacher_id: string | null) {
    await this.must(this.sb.from("classes").update({ homeroom_teacher_id: teacher_id }).eq("id", class_id).select("id").single());
  }
  async addPerson(p: NewPerson) {
    const { data: { session } } = await this.sb.auth.getSession();
    const res = await fetch("/api/admin/people", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token ?? ""}` }, body: JSON.stringify(p) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || "Couldn't add this person.");
    return out as { id: string; tempPassword?: string };
  }
  async linkParent(parent_id: string, student_id: string, relationship: "mother" | "father" | "guardian" | "other") {
    await this.must(this.sb.from("parent_students").upsert({ parent_id, student_id, relationship }));
  }
  async moveStudent(student_id: string, class_id: string | null) {
    await this.must(this.sb.from("students").update({ class_id }).eq("id", student_id).select("id").single());
  }
}
