"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { className, studentSummary, upcoming, whoAmI } from "@/lib/domain/insights";
import { useI18n } from "@/lib/i18n";
import { Avatar, Card, Empty, PageHeader, Stat, pct } from "../ui";
import { Announcements, AssessmentList, SeeAll, useFmt } from "./shared";
import { RecentGrades, SubjectPerformance } from "./student";

/** Choose which child to look at (remembered for this visit). */
export function useChild() {
  const { data } = useApp();
  const kids = useMemo(() => whoAmI(data).children, [data]);
  const [id, setId] = useState<string | null>(() => { try { return sessionStorage.getItem("esp_child"); } catch { return null; } });
  const child = kids.find((k) => k.id === id) ?? kids[0] ?? null;
  const choose = (v: string) => { setId(v); try { sessionStorage.setItem("esp_child", v); } catch { /* this view only */ } };
  return { kids, child, choose };
}
export function ChildPicker({ kids, child, choose }: ReturnType<typeof useChild>) {
  const { data } = useApp();
  const { t } = useI18n();
  if (kids.length < 2) return null;
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("nav.myChildren")}>
      {kids.map((k) => (
        <button key={k.id} type="button" role="tab" aria-selected={child?.id === k.id} onClick={() => choose(k.id)}
          className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${child?.id === k.id ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line bg-surface"}`}>
          <Avatar name={k.full_name} size={26} />{k.full_name.split(" ")[0]} <span className="muted text-xs">{className(data, k.class_id)}</span>
        </button>
      ))}
    </div>
  );
}

export function ParentDashboard() {
  const { data } = useApp();
  const { t } = useI18n();
  const f = useFmt();
  const pick = useChild();
  const { child } = pick;
  const sum = useMemo(() => (child ? studentSummary(data, child.id) : null), [data, child]);
  if (!child || !sum) return <><PageHeader title={t("dash.hello", { name: data.me.full_name.split(" ")[0] })} /><Empty text={t("dash.noChildren")} icon="child" /></>;
  const absences = data.attendance.filter((a) => a.student_id === child.id && a.status !== "present").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const work = upcoming(data, new Set([child.class_id ?? ""])).slice(0, 5);
  return (
    <>
      <PageHeader title={t("dash.hello", { name: data.me.full_name.split(" ")[0] })} subtitle={t("dash.parentSub", { name: child.full_name, cls: className(data, child.class_id) })} />
      <ChildPicker {...pick} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="chart" label={t("dash.overall")} value={pct(sum.overall)} />
        <Stat icon="check" label={t("att.rate")} value={pct(sum.attendance)} tone="info" />
        <Stat icon="task" label={t("dash.homeworkCompletion")} value={pct(sum.completion)} tone="accent" />
        <Stat icon="calendar" label={t("dash.upcomingCount")} value={String(work.length)} tone="info" />
      </div>
      {sum.attention.attention && (
        <div className="mt-4 rounded-xl border border-warn/30 bg-warn-soft p-4 text-sm" role="note">
          <strong>{t("dash.attentionParentTitle")}</strong>{" "}
          {sum.attention.reason === "declining" ? t("dash.reasonDeclining", { trend: sum.attention.trend ?? 0 }) : t("dash.reasonBelow", { threshold: data.school.attention_threshold })}.{" "}
          {t("dash.attentionParentHint")}
        </div>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("dash.subjectPerformance")} action={<SeeAll href="/app/grades" />}><SubjectPerformance summary={sum} /></Card>
        <Card title={t("dash.teacherFeedback")} action={<SeeAll href="/app/grades" />}><RecentGrades d={data} student={child} limit={4} /></Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title={t("dash.upcomingWork")} className="lg:col-span-2" action={<SeeAll href="/app/assignments" />}>
          <AssessmentList items={work} empty={t("dash.noUpcoming")} showClass={false} />
        </Card>
        <Card title={t("dash.recentAbsences")} action={<SeeAll href="/app/attendance" />}>
          {absences.length === 0 ? <Empty text={t("dash.perfectAttendance")} icon="check" /> : (
            <ul className="divide-y divide-line">
              {absences.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{f.day(a.date)}</span>
                  <span className={`badge ${a.status === "absent" ? "badge-bad" : a.status === "late" ? "badge-warn" : "badge-info"}`}>{t(`att.${a.status}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="mt-4"><Card title={t("dash.recentAnnouncements")} action={<SeeAll href="/app/announcements" />}><Announcements /></Card></div>
    </>
  );
}
