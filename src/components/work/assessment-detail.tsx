"use client";
// One piece of work or exam. Teachers: publish, see submissions, grade.
// Students: read it, hand it in, see the grade. Parents: their child's status.
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText } from "@/lib/data/store";
import { STATUS_TONE, assessmentPlace, canTeach, className, studentsIn, subjectName, whoAmI, workStatus } from "@/lib/domain/insights";
import type { Assessment, FileRef, Student } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n";
import { Icon } from "../icons";
import { useToast } from "../toast";
import { Avatar, Card, Empty, PageHeader } from "../ui";
import { useFmt } from "../dash/shared";
import { ChildPicker, useChild } from "../dash/parent";

function FileLink({ bucket, file }: { bucket: "materials" | "submissions"; file: FileRef }) {
  const { store } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const open = async () => {
    const url = await store.fileUrl(bucket, file.path);
    if (url) window.open(url, "_blank", "noopener"); else toast(t("work.fileGone"), "error");
  };
  return (
    <button type="button" onClick={open} className="flex max-w-full items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-left text-sm hover:bg-line">
      <Icon name="task" size={16} /><span className="truncate">{file.name}</span>
      {file.size != null && <span className="muted shrink-0 text-xs">{Math.max(1, Math.round(file.size / 1024))} KB</span>}
    </button>
  );
}

function Header({ a }: { a: Assessment }) {
  const { data, store, reload } = useApp();
  const { t, locale } = useI18n();
  const toast = useToast();
  const f = useFmt();
  const p = assessmentPlace(data, a);
  const files = data.assessmentFiles.filter((x) => x.assessment_id === a.id);
  const [busy, setBusy] = useState(false);
  const publish = async () => {
    setBusy(true);
    try { await store.publishAssessment(a.id); await reload(); toast(t("work.published")); } catch (e) { toast(errorText(e), "error"); } finally { setBusy(false); }
  };
  return (
    <>
      <Link href={a.takes_submissions ? "/app/assignments" : "/app/exams"} className="muted mb-2 inline-flex items-center gap-1 text-sm hover:text-text">← {t(a.takes_submissions ? "nav.assignments" : "nav.exams")}</Link>
      <PageHeader title={a.title}
        subtitle={`${t(`kind.${a.kind}`)} · ${subjectName(data, p.subjectId, locale)} · ${className(data, p.classId)}`}
        action={!a.published && canTeach(data, a) ? <button type="button" className="btn btn-primary" disabled={busy} onClick={publish}>{t("work.publish")}</button> : undefined} />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {!a.published && <span className="badge badge-warn">{t("work.draft")} · {t("work.publishHint")}</span>}
        <span className="badge badge-muted">{a.due_at ? t("work.due", { date: f.dateTime(a.due_at) }) : t("work.on", { date: f.day(a.scheduled_on) })}</span>
        <span className="badge badge-muted">{t("work.maxScore")}: {Number(a.max_score)}</span>
      </div>
      {(a.description || files.length > 0) && (
        <Card className="mb-4">
          {a.description && <p className="whitespace-pre-line text-[.95rem]">{a.description}</p>}
          {files.length > 0 && (
            <div className={a.description ? "mt-4" : ""}>
              <h3 className="mb-2 text-sm font-semibold">{t("work.attachments")}</h3>
              <div className="flex flex-wrap gap-2">{files.map((x) => <FileLink key={x.id} bucket="materials" file={{ path: x.path, name: x.name, size: x.size_bytes ?? undefined }} />)}</div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

/** Teacher's grading sheet: everyone in the class, their submission, a score and feedback. */
function GradeSheet({ a }: { a: Assessment }) {
  const { data, store, reload } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const f = useFmt();
  const students = studentsIn(data, assessmentPlace(data, a).classId);
  const current = useMemo(() => new Map(data.scores.filter((s) => s.assessment_id === a.id).map((s) => [s.student_id, s])), [data, a.id]);
  const [draft, setDraft] = useState<Record<string, { score: string; feedback: string }>>(() =>
    Object.fromEntries(students.map((s) => [s.id, { score: current.has(s.id) ? String(Number(current.get(s.id)!.score)) : "", feedback: current.get(s.id)?.feedback ?? "" }])));
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const max = Number(a.max_score);
  const changed = students.filter((s) => {
    const d = draft[s.id], c = current.get(s.id);
    return d && d.score.trim() !== "" && (Number(d.score) !== Number(c?.score ?? NaN) || (d.feedback.trim() || null) !== (c?.feedback ?? null));
  });
  const invalid = changed.filter((s) => { const v = Number(draft[s.id].score); return !(v >= 0 && v <= max); });
  const subs = data.submissions.filter((s) => s.assessment_id === a.id);

  const save = async () => {
    if (invalid.length) return toast(t("work.scoreInvalid", { max }), "error");
    setSaving(true);
    try {
      for (const s of changed) await store.grade(a.id, s.id, Number(draft[s.id].score), draft[s.id].feedback.trim() || null);
      await reload();
      toast(t("work.savedGrades"));
    } catch (e) { toast(errorText(e), "error"); } finally { setSaving(false); }
  };

  return (
    <Card title={t("work.gradeSheet")} action={<span className="muted text-xs">
      {a.takes_submissions && `${t("work.submittedCount", { n: subs.length, total: students.length })} · `}{t("work.gradedCount", { n: current.size, total: students.length })}</span>}>
      <ul className="-mx-4 divide-y divide-line sm:-mx-5">
        {students.map((s) => {
          const sub = subs.find((x) => x.student_id === s.id);
          const st = workStatus(data, a, s.id);
          const d = draft[s.id] ?? { score: "", feedback: "" };
          const bad = d.score.trim() !== "" && !(Number(d.score) >= 0 && Number(d.score) <= max);
          return (
            <li key={s.id} className="px-4 py-3 sm:px-5" data-student={s.full_name}>
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={s.full_name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{s.full_name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className={`badge ${STATUS_TONE[st]}`}>{t(`work.${st}`)}</span>
                    {sub && <span className="muted">{t("work.submittedAt", { date: f.dateTime(sub.submitted_at) })}{sub.attempt > 1 ? ` · ${t("work.attempt", { n: sub.attempt })}` : ""}</span>}
                    {sub && <button type="button" className="font-semibold text-brand" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? t("work.hideAnswer") : t("work.viewAnswer")}</button>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" inputMode="decimal" step="0.5" min={0} max={max} aria-label={`${t("common.score")}: ${s.full_name}`} aria-invalid={bad}
                    className={`input !min-h-10 w-20 text-right tabular-nums ${bad ? "!border-bad" : ""}`} value={d.score}
                    onChange={(e) => setDraft({ ...draft, [s.id]: { ...d, score: e.target.value } })} />
                  <span className="muted text-sm">/ {max}</span>
                </div>
              </div>
              {open === s.id && sub && (
                <div className="mt-3 space-y-2 rounded-xl bg-surface-2 p-3 text-sm">
                  {sub.body && <p className="whitespace-pre-line">{sub.body}</p>}
                  {sub.files.length > 0 && <div className="flex flex-wrap gap-2">{sub.files.map((x) => <FileLink key={x.path} bucket="submissions" file={x} />)}</div>}
                </div>
              )}
              {(open === s.id || d.score.trim() !== "") && (
                <input className="input mt-2 !min-h-10 text-sm" placeholder={t("work.feedbackPh")} aria-label={`${t("work.feedback")}: ${s.full_name}`} value={d.feedback}
                  maxLength={3000} onChange={(e) => setDraft({ ...draft, [s.id]: { ...d, feedback: e.target.value } })} />
              )}
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-20 mt-3 flex justify-end lg:bottom-4">
        <button type="button" className="btn btn-primary shadow-lg" disabled={saving || changed.length === 0} onClick={save}>
          {saving ? t("common.saving") : `${t("work.saveAll")}${changed.length ? ` (${changed.length})` : ""}`}
        </button>
      </div>
    </Card>
  );
}

/** A grade and feedback, if released. */
function GradeBox({ a, student }: { a: Assessment; student: Student }) {
  const { data } = useApp();
  const { t } = useI18n();
  const s = data.scores.find((x) => x.assessment_id === a.id && x.student_id === student.id && x.released);
  if (!s) return null;
  const p = (Number(s.score) / Number(a.max_score)) * 100;
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{t("work.yourGrade")}</span>
        <span className={`text-2xl font-bold tabular-nums ${p >= 75 ? "text-good" : p >= data.school.passing_score ? "text-warn" : "text-bad"}`}>{Number(s.score)} / {Number(a.max_score)}</span>
      </div>
      {s.feedback && <p className="mt-2 text-sm"><span className="muted">{t("work.feedback")}:</span> “{s.feedback}”</p>}
    </div>
  );
}

/** The student's own submission. */
function MyWork({ a, student }: { a: Assessment; student: Student }) {
  const { data, store, reload } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const f = useFmt();
  const sub = data.submissions.find((s) => s.assessment_id === a.id && s.student_id === student.id);
  const graded = data.scores.some((s) => s.assessment_id === a.id && s.student_id === student.id);
  const status = workStatus(data, a, student.id);
  const canSubmit = a.published && a.takes_submissions && (!graded || a.allow_resubmit);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && !files.length) return;
    setBusy(true);
    try { await store.submit(a.id, body.trim(), files); setBody(""); setFiles([]); await reload(); toast(t("work.submittedOk")); }
    catch (err) { toast(errorText(err), "error"); } finally { setBusy(false); }
  };
  return (
    <Card title={t("work.yourWork")} action={<span className={`badge ${STATUS_TONE[status]}`}>{t(`work.${status}`)}</span>}>
      <div className="space-y-4">
        <GradeBox a={a} student={student} />
        {!a.takes_submissions && <p className="muted text-sm">{t("work.notOpen")}</p>}
        {sub && (
          <div className="rounded-xl bg-surface-2 p-3 text-sm">
            <p className="muted mb-1 text-xs">{t("work.submittedAt", { date: f.dateTime(sub.submitted_at) })}{sub.attempt > 1 ? ` · ${t("work.attempt", { n: sub.attempt })}` : ""}</p>
            {sub.body && <p className="whitespace-pre-line">{sub.body}</p>}
            {sub.files.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{sub.files.map((x) => <FileLink key={x.path} bucket="submissions" file={x} />)}</div>}
          </div>
        )}
        {a.takes_submissions && !canSubmit && graded && <p className="muted text-sm">{t("work.closed")}</p>}
        {canSubmit && (
          <form onSubmit={send} className="space-y-3">
            <label className="sr-only" htmlFor="answer">{t("work.yourWork")}</label>
            <textarea id="answer" className="input min-h-32" placeholder={t("work.answerPh")} value={body} maxLength={10000} onChange={(e) => setBody(e.target.value)} />
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line p-3 text-sm hover:bg-surface-2">
              <Icon name="upload" /><span><span className="font-semibold text-brand">{t("work.addFiles")}</span><span className="muted block text-xs">{t("work.attachHint")}</span></span>
              <input type="file" multiple className="sr-only" onChange={(e) => setFiles([...files, ...[...(e.target.files ?? [])].filter((x) => x.size <= 20 * 1024 * 1024)])} />
            </label>
            {files.length > 0 && <ul className="space-y-1">{files.map((x, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-sm"><span className="truncate">{x.name}</span>
                <button type="button" className="text-muted" aria-label={`${t("common.delete")} ${x.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><Icon name="x" size={16} /></button></li>
            ))}</ul>}
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={busy || (!body.trim() && !files.length)}>{busy ? t("common.saving") : sub ? t("work.resubmit") : t("work.submit")}</button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}

function ParentPanel({ a }: { a: Assessment }) {
  const { data } = useApp();
  const { t } = useI18n();
  const pick = useChild();
  const inClass = pick.kids.filter((k) => k.class_id === assessmentPlace(data, a).classId);
  const child = inClass.find((k) => k.id === pick.child?.id) ?? inClass[0];
  if (!child) return <Empty text={t("work.nothing")} />;
  const status = workStatus(data, a, child.id);
  const sub = data.submissions.find((s) => s.assessment_id === a.id && s.student_id === child.id);
  return (
    <>
      {inClass.length > 1 && <ChildPicker {...pick} kids={inClass} />}
      <Card title={t("work.childWork", { name: child.full_name.split(" ")[0] })} action={<span className={`badge ${STATUS_TONE[status]}`}>{t(`work.${status}`)}</span>}>
        <div className="space-y-3">
          <GradeBox a={a} student={child} />
          {sub && <p className="muted text-sm">{t("work.submittedAt", { date: new Date(sub.submitted_at).toLocaleString() })}</p>}
        </div>
      </Card>
    </>
  );
}

export function AssessmentDetail({ id }: { id: string }) {
  const { data } = useApp();
  const { t } = useI18n();
  const a = data.assessments.find((x) => x.id === id);
  if (!a) return <Empty text={t("work.notFound")} />;
  const me = whoAmI(data);
  return (
    <>
      <Header a={a} />
      {canTeach(data, a) ? <GradeSheet key={a.id} a={a} />
        : me.student ? <MyWork a={a} student={me.student} />
        : data.me.role === "parent" ? <ParentPanel a={a} /> : null}
    </>
  );
}
