"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/lib/data/app-context";
import { assessmentPlace, className, classSummary, subjectName, todayIso, upcoming, whoAmI } from "@/lib/domain/insights";
import { useI18n } from "@/lib/i18n";
import { Icon } from "../icons";
import { Avatar, Card, Empty, Meter, PageHeader, Stat, pct } from "../ui";
import { Announcements, AssessmentList, SeeAll } from "./shared";

export function TeacherDashboard() {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const me = useMemo(() => whoAmI(data), [data]);
  const classes = useMemo(() => me.teachingClasses.map((c) => classSummary(data, c)), [data, me]);
  const myCs = new Set(me.teachingCs.map((cs) => cs.id));
  const toGrade = data.submissions.filter((s) => {
    const a = data.assessments.find((x) => x.id === s.assessment_id);
    return a && myCs.has(a.class_subject_id) && !data.scores.some((sc) => sc.assessment_id === a.id && sc.student_id === s.student_id);
  });
  const today = todayIso();
  const takenToday = new Set(data.attendance.filter((a) => a.date === today).map((a) => a.class_id));
  const attention = classes.flatMap((c) => c.attention).filter((x, i, all) => all.findIndex((y) => y.student.id === x.student.id) === i);
  const next = upcoming(data, new Set(me.teachingClasses)).filter((a) => myCs.has(a.class_subject_id)).slice(0, 5);
  const studentCount = data.students.filter((s) => s.class_id && me.teachingClasses.includes(s.class_id)).length;

  return (
    <>
      <PageHeader title={t("dash.hello", { name: data.me.full_name.split(" ")[0] })} subtitle={t("dash.teacherSub")}
        action={<Link href="/app/assignments/new" className="btn btn-primary btn-sm"><Icon name="plus" size={18} />{t("dash.newAssignment")}</Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="classes" label={t("dash.myClasses")} value={String(me.teachingClasses.length)} />
        <Stat icon="users" label={t("dash.myStudents")} value={String(studentCount)} tone="info" />
        <Stat icon="task" label={t("dash.toGrade")} value={String(toGrade.length)} tone="accent" />
        <Stat icon="alert" label={t("dash.attention")} value={String(attention.length)} tone="warn" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title={t("dash.todayClasses")} className="lg:col-span-2">
          {me.teachingClasses.length === 0 ? <Empty text={t("dash.noClasses")} /> : (
            <ul className="divide-y divide-line">
              {me.teachingClasses.map((c) => (
                <li key={c} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon name="classes" size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{className(data, c)}</div>
                    <div className="muted text-xs">{me.teachingCs.filter((cs) => cs.class_id === c).map((cs) => subjectName(data, cs.subject_id, locale)).join(", ") || t("dash.homeroom")}</div>
                    <div className={`text-xs ${takenToday.has(c) ? "text-good" : "text-warn"}`}>{takenToday.has(c) ? t("dash.attendanceDone") : t("dash.attendanceNotYet")}</div>
                  </div>
                  <Link href={`/app/attendance?class=${c}`} className={`btn btn-sm shrink-0 ${takenToday.has(c) ? "btn-ghost" : "btn-primary"}`}>{t("nav.attendance")}</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t("dash.toGrade")} action={<SeeAll href="/app/grades" />} tour="to-grade">
          {toGrade.length === 0 ? <Empty text={t("dash.allGraded")} icon="check" /> : (
            <ul className="divide-y divide-line">
              {toGrade.slice(0, 5).map((s) => {
                const a = data.assessments.find((x) => x.id === s.assessment_id)!;
                const st = data.students.find((x) => x.id === s.student_id);
                return (
                  <li key={s.id}>
                    <Link href={`/app/assignments/${a.id}`} className="flex items-center gap-3 py-2 hover:opacity-80">
                      <Avatar name={st?.full_name ?? "?"} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{st?.full_name}</span>
                        <span className="muted block truncate text-xs">{a.title} · {className(data, assessmentPlace(data, a).classId)}</span>
                      </span>
                      {s.is_late && <span className="badge badge-warn">{t("dash.late")}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title={t("dash.classAverages")}>
          <ul className="space-y-3">
            {classes.map((c) => (
              <li key={c.classId}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{className(data, c.classId)}</span><span className="muted">{pct(c.average)}</span></div>
                <Meter value={c.average} label={className(data, c.classId)} />
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t("dash.attention")}>
          {attention.length === 0 ? <Empty text={t("dash.noAttention")} icon="check" /> : (
            <ul className="divide-y divide-line">
              {attention.slice(0, 6).map((x) => (
                <li key={x.student.id} className="flex items-center gap-3 py-2">
                  <Avatar name={x.student.full_name} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/app/students/${x.student.id}`} className="block truncate text-sm font-semibold hover:underline">{x.student.full_name}</Link>
                    <span className="muted text-xs">{className(data, x.student.class_id)}</span>
                  </div>
                  <span className="badge badge-bad">{pct(x.overall)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t("dash.upcomingWork")} action={<SeeAll href="/app/assignments" />}>
          <AssessmentList items={next} empty={t("dash.noUpcoming")} />
        </Card>
      </div>
      <div className="mt-4"><Card title={t("dash.recentAnnouncements")} action={<SeeAll href="/app/announcements" />}><Announcements /></Card></div>
    </>
  );
}
