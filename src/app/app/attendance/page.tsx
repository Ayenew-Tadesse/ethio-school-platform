"use client";
// Attendance: teachers (and administrators) take it per class and day;
// students and parents see the record and the rate.
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText } from "@/lib/data/store";
import { attendanceRate } from "@/lib/domain/performance";
import { className, daysAgo, studentsIn, todayIso, whoAmI } from "@/lib/domain/insights";
import type { AttendanceStatus, Student } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/toast";
import { Avatar, Card, Empty, PageHeader, Stat, pct } from "@/components/ui";
import { ChildPicker, useChild } from "@/components/dash/parent";
import { useFmt } from "@/components/dash/shared";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];
const TONE: Record<AttendanceStatus, string> = {
  present: "bg-good text-white border-good", absent: "bg-bad text-white border-bad", late: "bg-accent text-white border-accent", excused: "bg-info text-white border-info",
};
const DOT: Record<AttendanceStatus, string> = { present: "bg-good", absent: "bg-bad", late: "bg-accent", excused: "bg-info" };

function Sheet({ classId, date }: { classId: string; date: string }) {
  const { data, store, reload } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const students = studentsIn(data, classId);
  const existing = useMemo(() => new Map(data.attendance.filter((a) => a.class_id === classId && a.date === date).map((a) => [a.student_id, a])), [data, classId, date]);
  const [rows, setRows] = useState<Record<string, { status: AttendanceStatus | null; note: string }>>(() =>
    Object.fromEntries(students.map((s) => [s.id, { status: existing.get(s.id)?.status ?? null, note: existing.get(s.id)?.note ?? "" }])));
  const [saving, setSaving] = useState(false);
  const dirty = students.some((s) => (rows[s.id]?.status ?? null) !== (existing.get(s.id)?.status ?? null) || (rows[s.id]?.note ?? "") !== (existing.get(s.id)?.note ?? ""));
  const limit = daysAgo(data.school.attendance_edit_days);
  const locked = data.me.role !== "admin" && date < limit;
  const set = (id: string, patch: Partial<{ status: AttendanceStatus; note: string }>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  const counts = Object.fromEntries(STATUSES.map((st) => [st, students.filter((s) => rows[s.id]?.status === st).length])) as Record<AttendanceStatus, number>;

  const save = async () => {
    setSaving(true);
    try {
      await store.saveAttendance(classId, date, students.filter((s) => rows[s.id]?.status).map((s) => ({ student_id: s.id, status: rows[s.id].status!, note: rows[s.id].note.trim() || null })));
      await reload();
      toast(t("attPage.saved"));
    } catch (e) { toast(errorText(e), "error"); } finally { setSaving(false); }
  };

  if (!students.length) return <Empty text={t("common.empty")} icon="users" />;
  return (
    <>
      {locked && <p className="mb-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">{t("attPage.locked")}</p>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="muted text-sm">{t("attPage.summary", counts)}</p>
        {!locked && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows((r) => Object.fromEntries(students.map((s) => [s.id, { ...r[s.id], status: "present" }])))}>
            {t("attPage.markAll")}
          </button>
        )}
      </div>
      <ul className="card divide-y divide-line">
        {students.map((s) => {
          const row = rows[s.id] ?? { status: null, note: "" };
          return (
            <li key={s.id} className="p-3 sm:flex sm:items-center sm:gap-3" data-student={s.full_name}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={s.full_name} size={34} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{s.full_name}</div>
                  {row.status && row.status !== "present" && (
                    <input className="mt-1 w-full max-w-60 rounded-md border border-line bg-surface px-2 py-1 text-xs" placeholder={t("attPage.notePh")} aria-label={`${t("attPage.note")}: ${s.full_name}`}
                      value={row.note} disabled={locked} onChange={(e) => set(s.id, { note: e.target.value })} />
                  )}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5 sm:mt-0 sm:w-[22rem]" role="radiogroup" aria-label={s.full_name}>
                {STATUSES.map((st) => (
                  <button key={st} type="button" role="radio" aria-checked={row.status === st} disabled={locked} onClick={() => set(s.id, { status: st })}
                    className={`min-h-10 rounded-lg border px-1 text-xs font-semibold transition ${row.status === st ? TONE[st] : "border-line bg-surface hover:bg-surface-2"}`}>
                    {t(`att.${st}`)}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {!locked && (
        <div className="sticky bottom-20 z-10 mt-4 flex items-center justify-end gap-3 lg:bottom-4">
          {dirty && <span className="muted rounded-lg bg-surface px-2 py-1 text-xs">{t("attPage.unsaved")}</span>}
          <button type="button" className="btn btn-primary shadow-lg" disabled={saving || !dirty} onClick={save}>{saving ? t("common.saving") : t("attPage.save")}</button>
        </div>
      )}
    </>
  );
}

function Taker() {
  const { data } = useApp();
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const me = whoAmI(data);
  const classes = data.me.role === "admin" ? data.classes.map((c) => c.id) : me.teachingClasses;
  const classId = classes.includes(params.get("class") ?? "") ? params.get("class")! : classes[0];
  const [date, setDate] = useState(todayIso());
  if (!classId) return <><PageHeader title={t("nav.attendance")} /><Empty text={t("attPage.noClasses")} icon="classes" /></>;
  const min = data.me.role === "admin" ? undefined : daysAgo(data.school.attendance_edit_days);
  return (
    <>
      <PageHeader title={t("att.take")} subtitle={t("att.editWindow", { days: data.school.attendance_edit_days })} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <div>
          <label className="label" htmlFor="att-class">{t("attPage.classLabel")}</label>
          <select id="att-class" className="input" value={classId} onChange={(e) => router.replace(`/app/attendance?class=${e.target.value}`)}>
            {classes.map((c) => <option key={c} value={c}>{className(data, c)}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="att-date">{t("attPage.dateLabel")}</label>
          <input id="att-date" type="date" className="input" value={date} max={todayIso()} min={min} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
      </div>
      <Sheet key={`${classId}|${date}`} classId={classId} date={date} />
    </>
  );
}

function History({ student }: { student: Student }) {
  const { data } = useApp();
  const { t } = useI18n();
  const f = useFmt();
  const rows = data.attendance.filter((a) => a.student_id === student.id).sort((a, b) => b.date.localeCompare(a.date));
  const recent = rows.filter((a) => a.date >= daysAgo(30));
  const count = (st: AttendanceStatus) => recent.filter((a) => a.status === st).length;
  const off = rows.filter((a) => a.status !== "present").slice(0, 15);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="check" label={`${t("att.rate")} · ${t("attPage.rate30")}`} value={pct(attendanceRate(recent, data.school.late_counts_as_present))} />
        <Stat icon="x" label={t("attPage.absentDays")} value={String(count("absent"))} tone="warn" />
        <Stat icon="calendar" label={t("attPage.lateDays")} value={String(count("late"))} tone="accent" />
        <Stat icon="shield" label={t("attPage.excusedDays")} value={String(count("excused"))} tone="info" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("attPage.rate30")}>
          <div className="grid grid-cols-10 gap-1.5" role="img" aria-label={t("attPage.legend")}>
            {[...recent].reverse().map((a) => <span key={a.id} title={`${f.day(a.date)}: ${t(`att.${a.status}`)}`} className={`aspect-square rounded ${DOT[a.status]}`} />)}
          </div>
          <div className="muted mt-3 flex flex-wrap gap-3 text-xs">
            {STATUSES.map((st) => <span key={st} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-sm ${DOT[st]}`} />{t(`att.${st}`)}</span>)}
          </div>
        </Card>
        <Card title={t("dash.recentAbsences")}>
          {off.length === 0 ? <Empty text={t("dash.perfectAttendance")} icon="check" /> : (
            <ul className="divide-y divide-line">
              {off.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>{f.day(a.date)}{a.note && <span className="muted"> · {a.note}</span>}</span>
                  <span className={`badge ${a.status === "absent" ? "badge-bad" : a.status === "late" ? "badge-warn" : "badge-info"}`}>{t(`att.${a.status}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function ParentView() {
  const { t } = useI18n();
  const pick = useChild();
  return (
    <>
      <PageHeader title={t("nav.attendance")} subtitle={pick.child?.full_name} />
      <ChildPicker {...pick} />
      {pick.child ? <History student={pick.child} /> : <Empty text={t("dash.noChildren")} icon="child" />}
    </>
  );
}

function Attendance() {
  const { data } = useApp();
  const { t } = useI18n();
  const role = data.me.role;
  if (role === "teacher" || role === "admin") return <Taker />;
  if (role === "parent") return <ParentView />;
  const me = whoAmI(data).student;
  return <><PageHeader title={t("attPage.history")} />{me ? <History student={me} /> : <Empty text={t("dash.notLinked")} />}</>;
}

export default function AttendancePage() {
  return <Suspense><Attendance /></Suspense>;
}
