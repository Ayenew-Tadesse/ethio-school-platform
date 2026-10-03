"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/lib/data/app-context";
import { studentSummary, subjectName, upcoming, whoAmI, type StudentSummary } from "@/lib/domain/insights";
import type { Dataset, Student } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n";
import { Card, Empty, Meter, PageHeader, Stat, pct, scoreTone } from "../ui";
import { Announcements, AssessmentList, SeeAll, useFmt } from "./shared";

/** Subject results with the class average marker (students and parents). */
export function SubjectPerformance({ summary }: { summary: StudentSummary }) {
  const { data } = useApp();
  const { t, locale } = useI18n();
  if (!summary.subjects.length) return <Empty text={t("common.noData")} />;
  return (
    <>
      <ul className="space-y-3">
        {summary.subjects.map((s) => (
          <li key={s.subjectId}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-semibold">{subjectName(data, s.subjectId, locale)}</span>
              <span className="tabular-nums">{pct(s.overall)} <span className="muted text-xs">({t("dash.classAvgShort")} {pct(s.classAverage)})</span></span>
            </div>
            <Meter value={s.overall} compare={s.classAverage} label={subjectName(data, s.subjectId, locale)} />
          </li>
        ))}
      </ul>
      <p className="muted mt-3 text-xs">{t("dash.markerHint")}</p>
    </>
  );
}

/** Latest released grades for one student, with teacher feedback. */
export function RecentGrades({ d, student, limit = 5 }: { d: Dataset; student: Student; limit?: number }) {
  const { t, locale } = useI18n();
  const f = useFmt();
  const list = d.scores.filter((s) => s.student_id === student.id && s.released)
    .map((s) => ({ s, a: d.assessments.find((a) => a.id === s.assessment_id)! })).filter((x) => x.a)
    .sort((x, y) => y.s.graded_at.localeCompare(x.s.graded_at)).slice(0, limit);
  if (!list.length) return <Empty text={t("dash.noGrades")} icon="grade" />;
  return (
    <ul className="divide-y divide-line">
      {list.map(({ s, a }) => {
        const p = (Number(s.score) / Number(a.max_score)) * 100;
        const cs = d.classSubjects.find((c) => c.id === a.class_subject_id);
        return (
          <li key={s.id} className="py-2.5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{a.title}</div>
                <div className="muted truncate text-xs">{t(`kind.${a.kind}`)} · {subjectName(d, cs?.subject_id, locale)} · {f.day(s.graded_at)}</div>
              </div>
              <span className={`badge ${scoreTone(p, d.school.passing_score)}`}>{Number(s.score)} / {Number(a.max_score)}</span>
            </div>
            {s.feedback && <p className="mt-1.5 rounded-lg bg-surface-2 px-3 py-2 text-sm">“{s.feedback}”</p>}
          </li>
        );
      })}
    </ul>
  );
}

export function StudentDashboard() {
  const { data } = useApp();
  const { t } = useI18n();
  const me = whoAmI(data).student;
  const sum = useMemo(() => (me ? studentSummary(data, me.id) : null), [data, me]);
  if (!me || !sum) return <Empty text={t("dash.notLinked")} />;
  const mine = new Set([me.class_id ?? ""]);
  const now = new Date().toISOString();
  const todo = upcoming(data, mine, ["homework", "assignment"]).filter((a) => !data.submissions.some((s) => s.assessment_id === a.id && s.student_id === me.id));
  const overdue = data.assessments.filter((a) => a.published && a.takes_submissions && a.due_at && a.due_at < now && !data.submissions.some((s) => s.assessment_id === a.id && s.student_id === me.id)
    && data.classSubjects.find((c) => c.id === a.class_subject_id)?.class_id === me.class_id);
  const exams = upcoming(data, mine, ["quiz", "midterm", "final"]);
  return (
    <>
      <PageHeader title={t("dash.hello", { name: me.full_name.split(" ")[0] })} subtitle={t("dash.studentSub")} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="chart" label={t("dash.myAverage")} value={pct(sum.overall)} />
        <Stat icon="check" label={t("att.rate")} value={pct(sum.attendance)} tone="info" />
        <Stat icon="task" label={t("dash.toDo")} value={String(todo.length)} tone="accent" />
        <Stat icon="alert" label={t("dash.overdue")} value={String(overdue.length)} tone="warn" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title={t("dash.upcomingWork")} className="lg:col-span-2" action={<SeeAll href="/app/assignments" />}>
          <AssessmentList items={[...overdue, ...todo].slice(0, 6)} empty={t("dash.nothingDue")} showClass={false} />
        </Card>
        <Card title={t("dash.upcomingExams")} action={<SeeAll href="/app/exams" />}>
          <AssessmentList items={exams.slice(0, 4)} empty={t("dash.noUpcoming")} showClass={false} />
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("dash.subjectPerformance")} action={<SeeAll href="/app/grades" />}><SubjectPerformance summary={sum} /></Card>
        <Card title={t("dash.recentGrades")} action={<Link href="/app/grades" className="text-sm font-semibold text-brand hover:underline">{t("common.seeAll")}</Link>}>
          <RecentGrades d={data} student={me} />
        </Card>
      </div>
      <div className="mt-4"><Card title={t("dash.recentAnnouncements")} action={<SeeAll href="/app/announcements" />}><Announcements /></Card></div>
    </>
  );
}
