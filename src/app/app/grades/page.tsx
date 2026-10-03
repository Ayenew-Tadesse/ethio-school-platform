"use client";
// Grades. Teachers: a gradebook per class and subject (weighted overall).
// Students and parents: results by subject, with every grade and the weights.
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { assessmentPlace, className, studentSummary, studentsIn, subjectName, whoAmI } from "@/lib/domain/insights";
import { breakdown, weightsOf } from "@/lib/domain/performance";
import { ASSESSMENT_KINDS, type Student } from "@/lib/domain/types";

import { useI18n } from "@/lib/i18n";
import { Card, Empty, Meter, PageHeader, Stat, pct, scoreTone } from "@/components/ui";
import { ChildPicker, useChild } from "@/components/dash/parent";
import { useFmt } from "@/components/dash/shared";

function Weights() {
  const { data } = useApp();
  const { t } = useI18n();
  const w = weightsOf(data.weights);
  return (
    <p className="muted text-xs">
      {t("gradesPage.weights")}: {ASSESSMENT_KINDS.filter((k) => w[k] > 0).map((k) => `${t(`kind.${k}`)} ${w[k]}%`).join(" · ")}
    </p>
  );
}

function Gradebook() {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const me = whoAmI(data);
  const options = data.me.role === "admin" ? data.classSubjects : me.teachingCs;
  const [csId, setCsId] = useState(options[0]?.id ?? "");
  const cs = options.find((o) => o.id === csId);
  const w = weightsOf(data.weights);
  const items = useMemo(() => data.assessments.filter((a) => a.class_subject_id === csId && a.published)
    .sort((x, y) => (x.due_at ?? x.scheduled_on ?? "").localeCompare(y.due_at ?? y.scheduled_on ?? "")), [data, csId]);
  if (!cs) return <><PageHeader title={t("nav.grades")} /><Empty text={t("dash.noClasses")} /></>;
  const students = studentsIn(data, cs.class_id);
  const scoreOf = (aId: string, sId: string) => data.scores.find((s) => s.assessment_id === aId && s.student_id === sId);
  const ungraded = items.filter((a) => data.submissions.some((s) => s.assessment_id === a.id && !scoreOf(a.id, s.student_id)));
  return (
    <>
      <PageHeader title={t("gradesPage.gradebook")} subtitle={`${className(data, cs.class_id)} · ${subjectName(data, cs.subject_id, locale)}`} />
      <select className="input mb-4 sm:max-w-sm" value={csId} onChange={(e) => setCsId(e.target.value)} aria-label={t("work.classSubject")}>
        {options.map((o) => <option key={o.id} value={o.id}>{className(data, o.class_id)} · {subjectName(data, o.subject_id, locale)}</option>)}
      </select>
      {ungraded.length > 0 && (
        <div className="mb-4 rounded-xl bg-info-soft p-3 text-sm text-info">
          {t("dash.toGrade")}: {ungraded.map((a, i) => <span key={a.id}>{i > 0 && ", "}<Link href={`/app/assignments/${a.id}`} className="font-semibold underline">{a.title}</Link></span>)}
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="sticky left-0 z-10 bg-surface px-4 py-3 font-semibold">{t("gradesPage.student")}</th>
              {items.map((a) => (
                <th key={a.id} scope="col" className="px-2 py-3 text-center font-medium">
                  <Link href={`/app/assignments/${a.id}`} className="block max-w-28 hover:underline" title={a.title}>
                    <span className="muted block text-[11px] uppercase tracking-wide">{t(`kind.${a.kind}`)}</span>
                    <span className="block truncate">{a.title}</span>
                    <span className="muted block text-[11px]">/ {Number(a.max_score)}</span>
                  </Link>
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right font-semibold">{t("gradesPage.overallWeighted")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {students.map((s) => {
              const b = breakdown(items, data.scores, s.id, w);
              return (
                <tr key={s.id}>
                  <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-2.5 text-left font-medium"><Link href={`/app/students/${s.id}`} className="hover:underline">{s.full_name}</Link></th>
                  {items.map((a) => {
                    const sc = scoreOf(a.id, s.id);
                    return <td key={a.id} className="px-2 py-2.5 text-center tabular-nums">{sc ? Number(sc.score) : <span className="muted">—</span>}</td>;
                  })}
                  <td className="px-4 py-2.5 text-right"><span className={`badge ${scoreTone(b.overall, data.school.passing_score)}`}>{pct(b.overall, 1)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3"><Weights /></div>
    </>
  );
}

function Results({ student }: { student: Student }) {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const f = useFmt();
  const sum = useMemo(() => studentSummary(data, student.id), [data, student.id]);
  if (!sum) return <Empty text={t("common.noData")} />;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="chart" label={t("dash.overall")} value={pct(sum.overall, 1)} />
        <Stat icon="check" label={t("att.rate")} value={pct(sum.attendance)} tone="info" />
        <Stat icon="task" label={t("dash.homeworkCompletion")} value={pct(sum.completion)} tone="accent" />
        <Stat icon="grade" label={t("gradesPage.allScores")} value={String(data.scores.filter((s) => s.student_id === student.id && s.released).length)} tone="info" />
      </div>
      <div className="mt-2"><Weights /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {sum.subjects.map((sub) => {
          const graded = data.assessments.filter((a) => assessmentPlace(data, a).classId === student.class_id && assessmentPlace(data, a).subjectId === sub.subjectId)
            .map((a) => ({ a, s: data.scores.find((x) => x.assessment_id === a.id && x.student_id === student.id && x.released) }))
            .filter((x) => x.s).sort((x, y) => y.s!.graded_at.localeCompare(x.s!.graded_at));
          return (
            <Card key={sub.subjectId} title={subjectName(data, sub.subjectId, locale)}
              action={<span className={`badge ${scoreTone(sub.overall, data.school.passing_score)}`}>{pct(sub.overall, 1)}</span>}>
              <Meter value={sub.overall} compare={sub.classAverage} label={subjectName(data, sub.subjectId, locale)} />
              <p className="muted mt-1.5 text-xs">{t("dash.classAverage")}: {pct(sub.classAverage, 1)}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ASSESSMENT_KINDS.filter((k) => sub.byKind[k] != null).map((k) => <span key={k} className="badge badge-muted">{t(`kind.${k}`)} {pct(sub.byKind[k])}</span>)}
              </div>
              {graded.length === 0 ? <p className="muted mt-3 text-sm">{t("gradesPage.noScores")}</p> : (
                <ul className="mt-3 divide-y divide-line border-t border-line">
                  {graded.map(({ a, s }) => (
                    <li key={a.id}>
                      <Link href={`/app/assignments/${a.id}`} className="flex items-center gap-3 py-2 text-sm hover:opacity-80">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{a.title}</span>
                          <span className="muted block text-xs">{t(`kind.${a.kind}`)} · {f.day(s!.graded_at)}{s!.feedback ? ` · “${s!.feedback}”` : ""}</span>
                        </span>
                        <span className="shrink-0 tabular-nums font-semibold">{Number(s!.score)} / {Number(a.max_score)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

export default function Grades() {
  const { data } = useApp();
  const { t } = useI18n();
  const pick = useChild();
  if (data.me.role === "teacher" || data.me.role === "admin") return <Gradebook />;
  if (data.me.role === "parent") {
    return (
      <>
        <PageHeader title={t("nav.grades")} subtitle={pick.child?.full_name} />
        <ChildPicker {...pick} />
        {pick.child ? <Results key={pick.child.id} student={pick.child} /> : <Empty text={t("dash.noChildren")} icon="child" />}
      </>
    );
  }
  const me = whoAmI(data).student;
  return <><PageHeader title={t("nav.grades")} />{me ? <Results student={me} /> : <Empty text={t("dash.notLinked")} />}</>;
}
