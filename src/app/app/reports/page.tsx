"use client";
// School reports for administrators: classes side by side, subject averages,
// and students requiring academic attention, each downloadable as CSV.
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/lib/data/app-context";
import { attendanceTrend, className, schoolStats, subjectName } from "@/lib/domain/insights";
import { mean } from "@/lib/domain/performance";
import { useI18n } from "@/lib/i18n";
import { Card, Columns, Empty, Meter, PageHeader, Stat, pct, scoreTone } from "@/components/ui";
import { useFmt } from "@/components/dash/shared";

function downloadCsv(name: string, rows: (string | number | null)[][]) {
  const cell = (v: string | number | null) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  // BOM so spreadsheet apps read Amharic names correctly.
  const blob = new Blob(["﻿" + rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const r1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);

export default function Reports() {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const f = useFmt();
  const s = useMemo(() => schoolStats(data), [data]);
  const trend = useMemo(() => attendanceTrend(data), [data]);
  const subjects = useMemo(() => data.subjects.map((sub) => {
    const avgs = data.classAverages.filter((c) => data.classSubjects.find((x) => x.id === c.class_subject_id)?.subject_id === sub.id).map((c) => c.average);
    return { id: sub.id, average: mean(avgs), classes: avgs.length };
  }).filter((x) => x.classes > 0).sort((a, b) => (b.average ?? 0) - (a.average ?? 0)), [data]);
  if (data.me.role !== "admin") return <Empty text={t("admin.noAccess")} />;
  const classes = [...s.classes].sort((a, b) => className(data, a.classId).localeCompare(className(data, b.classId), undefined, { numeric: true }));

  return (
    <>
      <PageHeader title={t("nav.reports")} subtitle={t("admin.reportsSub")} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat icon="users" label={t("dash.totalStudents")} value={String(s.students)} />
        <Stat icon="check" label={`${t("dash.attendanceRate")} · ${t("dash.last30")}`} value={pct(s.attendance)} />
        <Stat icon="task" label={t("dash.completion")} value={pct(s.completion)} tone="accent" />
        <Stat icon="chart" label={t("dash.avgPerformance")} value={pct(s.average)} tone="info" />
        <Stat icon="alert" label={t("dash.attention")} value={String(s.attention.length)} tone="warn" />
      </div>

      <Card title={t("admin.byClass")} className="mt-4" action={<button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadCsv("classes.csv", [
        [t("common.class"), t("nav.students"), t("dash.classAverage"), t("admin.attendance"), t("admin.completion"), t("dash.attention")],
        ...classes.map((c) => [className(data, c.classId), c.students, r1(c.average), r1(c.attendance), r1(c.completion), c.attention.length]),
      ])}>{t("admin.exportCsv")}</button>}>
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[34rem] text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="px-4 py-2 font-medium sm:px-5">{t("common.class")}</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">{t("nav.students")}</th>
              <th scope="col" className="px-2 py-2 font-medium">{t("dash.classAverage")}</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">{t("admin.attendance")}</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">{t("admin.completion")}</th>
              <th scope="col" className="px-4 py-2 text-right font-medium sm:px-5">{t("dash.attention")}</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {classes.map((c) => (
                <tr key={c.classId}>
                  <th scope="row" className="whitespace-nowrap px-4 py-2.5 text-left font-semibold sm:px-5"><Link href={`/app/classes/${c.classId}`} className="hover:underline">{className(data, c.classId)}</Link></th>
                  <td className="px-2 text-right tabular-nums">{c.students}</td>
                  <td className="px-2"><div className="flex items-center gap-2"><span className="w-12 tabular-nums">{pct(c.average)}</span><div className="w-24"><Meter value={c.average} label={className(data, c.classId)} /></div></div></td>
                  <td className="px-2 text-right tabular-nums">{pct(c.attendance)}</td>
                  <td className="px-2 text-right tabular-nums">{pct(c.completion)}</td>
                  <td className="px-4 text-right sm:px-5">{c.attention.length ? <span className="badge badge-warn">{c.attention.length}</span> : "0"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("admin.bySubject")}>
          {subjects.length === 0 ? <Empty text={t("common.noData")} /> : (
            <ul className="space-y-3">
              {subjects.map((x) => (
                <li key={x.id}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{subjectName(data, x.id, locale)}</span><span className="tabular-nums">{pct(x.average, 1)}</span></div>
                  <Meter value={x.average} label={subjectName(data, x.id, locale)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t("dash.attendanceTrend")}>
          <Columns label={t("dash.attendanceTrend")} data={trend.map((d) => ({ key: d.date, value: d.rate, title: `${f.day(d.date)}: ${d.rate.toFixed(0)}%` }))} />
          <div className="muted mt-2 flex justify-between text-xs"><span>{f.day(trend[0]?.date)}</span><span>{f.day(trend.at(-1)?.date)}</span></div>
        </Card>
      </div>

      <Card title={t("admin.attentionList")} className="mt-4" action={s.attention.length > 0 ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadCsv("academic-attention.csv", [
        [t("common.student"), t("common.class"), t("admin.overall"), t("admin.attendance"), t("admin.completion"), t("admin.reason")],
        ...s.attention.map((x) => [x.student.full_name, className(data, x.student.class_id), r1(x.overall), r1(x.attendance), r1(x.completion),
          x.attention.reason === "declining" ? t("dash.reasonDeclining", { trend: x.attention.trend ?? 0 }) : t("dash.reasonBelow", { threshold: data.school.attention_threshold })]),
      ])}>{t("admin.exportCsv")}</button> : undefined}>
        <p className="muted mb-3 text-xs">{t("admin.attentionNote")}</p>
        {s.attention.length === 0 ? <Empty text={t("dash.noAttention")} icon="check" /> : (
          <ul className="divide-y divide-line">
            {s.attention.map((x) => (
              <li key={x.student.id}>
                <Link href={`/app/students/${x.student.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 hover:opacity-80">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{x.student.full_name}</span>
                    <span className="muted block text-xs">{className(data, x.student.class_id)} · {x.attention.reason === "declining" ? t("dash.reasonDeclining", { trend: x.attention.trend ?? 0 }) : t("dash.reasonBelow", { threshold: data.school.attention_threshold })}</span>
                  </span>
                  <span className="muted text-xs">{t("admin.attendance")} {pct(x.attendance)}</span>
                  <span className={`badge ${scoreTone(x.overall, data.school.passing_score)}`}>{pct(x.overall, 1)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
