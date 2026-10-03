"use client";
// One class: its students, subjects and teachers. Administrators assign a
// teacher to each subject and choose the homeroom teacher.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText } from "@/lib/data/store";
import { className, classSummary, studentSummary, studentsIn, subjectName, whoAmI } from "@/lib/domain/insights";
import { useI18n } from "@/lib/i18n";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { Avatar, Card, Empty, PageHeader, Stat, pct, scoreTone } from "@/components/ui";
import { AddPerson } from "@/components/admin/people-forms";

export default function ClassPage() {
  const { id } = useParams<{ id: string }>();
  const { data, store, reload } = useApp();
  const { t, locale } = useI18n();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const c = data.classes.find((x) => x.id === id);
  const summary = useMemo(() => (c ? classSummary(data, c.id) : null), [data, c]);
  const admin = data.me.role === "admin";
  const allowed = admin || whoAmI(data).teachingClasses.includes(id);
  if (!c || !summary || !allowed) return <Empty text={t("admin.noAccess")} />;
  const students = studentsIn(data, c.id);
  const cs = data.classSubjects.filter((x) => x.class_id === c.id).sort((a, b) => subjectName(data, a.subject_id).localeCompare(subjectName(data, b.subject_id)));
  const free = data.subjects.filter((s) => !cs.some((x) => x.subject_id === s.id));
  const run = async (fn: () => Promise<void>) => { try { await fn(); await reload(); toast(t("common.saved")); } catch (e) { toast(errorText(e), "error"); } };

  return (
    <>
      <Link href="/app/classes" className="muted mb-2 inline-flex text-sm hover:text-text">← {admin ? t("nav.classes") : t("nav.myClasses")}</Link>
      <PageHeader title={className(data, c.id)} subtitle={data.years.find((y) => y.id === c.academic_year_id)?.name}
        action={<div className="flex flex-wrap gap-2">
          <Link href={`/app/attendance?class=${c.id}`} className="btn btn-ghost btn-sm">{t("att.take")}</Link>
          {!admin && <Link href={`/app/assignments/new?class=${c.id}`} className="btn btn-primary btn-sm"><Icon name="plus" size={18} />{t("dash.newAssignment")}</Link>}
        </div>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="users" label={t("nav.students")} value={String(summary.students)} />
        <Stat icon="chart" label={t("dash.classAverage")} value={pct(summary.average)} tone="info" />
        <Stat icon="check" label={`${t("att.rate")} · ${t("dash.last30")}`} value={pct(summary.attendance)} />
        <Stat icon="alert" label={t("dash.attention")} value={String(summary.attention.length)} tone="warn" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("admin.subjectsTaught")}>
          {admin && (
            <div className="mb-3">
              <label className="label" htmlFor="homeroom">{t("admin.homeroom")}</label>
              <select id="homeroom" className="input" value={c.homeroom_teacher_id ?? ""} onChange={(e) => run(() => store.setHomeroom(c.id, e.target.value || null))}>
                <option value="">{t("admin.none")}</option>
                {data.teachers.map((te) => <option key={te.id} value={te.id}>{te.full_name}</option>)}
              </select>
            </div>
          )}
          {cs.length === 0 && <Empty text={t("common.empty")} icon="book" />}
          <ul className="divide-y divide-line">
            {cs.map((x) => {
              const label = subjectName(data, x.subject_id, locale);
              const teacher = data.teachers.find((te) => te.id === x.teacher_id);
              return (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="text-sm font-semibold">{label}</span>
                  {admin ? (
                    <select className="input !min-h-10 w-auto min-w-44 text-sm" aria-label={t("admin.assign", { subject: label })} value={x.teacher_id ?? ""}
                      onChange={(e) => run(() => store.assignTeacher(c.id, x.subject_id, e.target.value || null))}>
                      <option value="">{t("admin.unassigned")}</option>
                      {data.teachers.map((te) => <option key={te.id} value={te.id}>{te.full_name}</option>)}
                    </select>
                  ) : <span className="muted text-sm">{teacher?.full_name ?? t("admin.unassigned")}</span>}
                </li>
              );
            })}
          </ul>
          {admin && free.length > 0 && (
            <div className="mt-3 flex gap-2">
              <select className="input !min-h-10 text-sm" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} aria-label={t("admin.addSubject")}>
                <option value="">{t("admin.addSubject")}…</option>
                {free.map((s) => <option key={s.id} value={s.id}>{subjectName(data, s.id, locale)}</option>)}
              </select>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!newSubject} onClick={() => { const s = newSubject; setNewSubject(""); run(() => store.assignTeacher(c.id, s, null)); }}>{t("common.add")}</button>
            </div>
          )}
        </Card>
        <Card title={t("nav.students")} action={admin ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={16} />{t("admin.addStudent")}</button> : undefined}>
          {students.length === 0 ? <Empty text={t("common.empty")} icon="users" /> : (
            <ul className="divide-y divide-line">
              {students.map((s) => {
                const sum = studentSummary(data, s.id);
                return (
                  <li key={s.id}>
                    <Link href={`/app/students/${s.id}`} className="flex items-center gap-3 py-2 hover:opacity-80">
                      <Avatar name={s.full_name} size={32} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.full_name}</span>
                      {sum?.attention.attention && <Icon name="alert" size={16} className="text-warn" />}
                      <span className={`badge ${scoreTone(sum?.overall, data.school.passing_score)}`}>{pct(sum?.overall)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
      {adding && <AddPerson kind="student" defaultClass={c.id} onClose={() => setAdding(false)} />}
    </>
  );
}
