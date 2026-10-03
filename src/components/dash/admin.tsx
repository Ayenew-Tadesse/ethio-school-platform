"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/lib/data/app-context";
import { attendanceTrend, className, schoolStats, upcoming } from "@/lib/domain/insights";
import { useI18n } from "@/lib/i18n";
import { Avatar, Card, Columns, Empty, Meter, PageHeader, Stat, pct } from "../ui";
import { Announcements, AssessmentList, SeeAll, useFmt } from "./shared";

export function AdminDashboard() {
  const { data } = useApp();
  const { t } = useI18n();
  const f = useFmt();
  const s = useMemo(() => schoolStats(data), [data]);
  const trend = useMemo(() => attendanceTrend(data), [data]);
  const exams = upcoming(data, undefined, ["quiz", "midterm", "final"]).slice(0, 5);
  const today = s.attendanceToday;
  return (
    <>
      <PageHeader title={t("dash.hello", { name: data.me.full_name.split(" ")[0] })} subtitle={`${data.school.name} · ${data.years.find((y) => y.is_current)?.name ?? ""}`}
        action={<Link href="/app/reports" className="btn btn-ghost btn-sm">{t("nav.reports")}</Link>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat icon="users" label={t("dash.totalStudents")} value={String(s.students)} />
        <Stat icon="teacher" label={t("dash.totalTeachers")} value={String(s.teachers)} tone="info" />
        <Stat icon="check" label={t("dash.attendanceRate")} value={pct(s.attendance)} hint={t("dash.last30")} />
        <Stat icon="task" label={t("dash.completion")} value={pct(s.completion)} tone="accent" />
        <Stat icon="chart" label={t("dash.avgPerformance")} value={pct(s.average)} tone="info" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title={t("dash.attendanceTrend")} className="lg:col-span-2"
          action={<span className="muted text-xs">{today.recorded ? t("dash.todayCounts", { present: today.present, absent: today.absent, late: today.late }) : t("dash.notTakenToday")}</span>}>
          <Columns label={t("dash.attendanceTrend")} data={trend.map((d) => ({ key: d.date, value: d.rate, title: `${f.day(d.date)}: ${d.rate.toFixed(0)}%` }))} />
          <div className="muted mt-2 flex justify-between text-xs"><span>{f.day(trend[0]?.date)}</span><span>{f.day(trend.at(-1)?.date)}</span></div>
        </Card>
        <Card title={t("dash.attention")} action={<span className="badge badge-warn">{s.attention.length}</span>}>
          {s.attention.length === 0 ? <Empty text={t("dash.noAttention")} icon="check" /> : (
            <ul className="divide-y divide-line">
              {s.attention.slice(0, 6).map((x) => (
                <li key={x.student.id} className="flex items-center gap-3 py-2">
                  <Avatar name={x.student.full_name} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/app/students/${x.student.id}`} className="block truncate text-sm font-semibold hover:underline">{x.student.full_name}</Link>
                    <span className="muted block truncate text-xs">
                      {className(data, x.student.class_id)} · {x.attention.reason === "declining" ? t("dash.reasonDeclining", { trend: x.attention.trend ?? 0 }) : t("dash.reasonBelow", { threshold: data.school.attention_threshold })}
                    </span>
                  </div>
                  <span className="badge badge-bad">{pct(x.overall)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title={t("dash.classComparison")} className="lg:col-span-2">
          <ul className="space-y-3">
            {s.classes.map((c) => (
              <li key={c.classId}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <Link href={`/app/classes/${c.classId}`} className="font-semibold hover:underline">{className(data, c.classId)}</Link>
                  <span className="muted text-xs">{t("dash.classLine", { n: c.students, avg: pct(c.average), att: pct(c.attendance) })}</span>
                </div>
                <Meter value={c.average} label={className(data, c.classId)} />
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t("dash.upcomingExams")} action={<SeeAll href="/app/exams" />}>
          <AssessmentList items={exams} empty={t("dash.noUpcoming")} href={() => "/app/exams"} />
        </Card>
      </div>
      <div className="mt-4">
        <Card title={t("dash.recentAnnouncements")} action={<SeeAll href="/app/announcements" />}><Announcements /></Card>
      </div>
    </>
  );
}
