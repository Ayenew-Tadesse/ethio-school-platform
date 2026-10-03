"use client";
// One student's profile: results, attendance, recent grades and, for staff,
// their parents. Administrators can move the student to another class.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText } from "@/lib/data/store";
import { className, studentSummary } from "@/lib/domain/insights";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/toast";
import { Avatar, Card, Empty, Stat, pct } from "@/components/ui";
import { RecentGrades, SubjectPerformance } from "@/components/dash/student";

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const { data, store, reload } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const sum = useMemo(() => studentSummary(data, id), [data, id]);
  if (!sum) return <Empty text={t("admin.noAccess")} />;
  const s = sum.student;
  const staff = data.me.role === "admin" || data.me.role === "teacher";
  const parents = data.parentStudents.filter((l) => l.student_id === s.id).map((l) => ({ l, p: data.parents.find((p) => p.id === l.parent_id) })).filter((x) => x.p);
  const move = async (classId: string) => {
    try { await store.moveStudent(s.id, classId || null); await reload(); toast(t("admin.moved", { name: s.full_name, cls: className(data, classId) })); }
    catch (e) { toast(errorText(e), "error"); }
  };
  return (
    <>
      {staff && <Link href="/app/students" className="muted mb-2 inline-flex text-sm hover:text-text">← {t("nav.students")}</Link>}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Avatar name={s.full_name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{s.full_name}</h1>
          <p className="muted text-sm">{className(data, s.class_id)}{s.student_no ? ` · ${s.student_no}` : ""}</p>
        </div>
        {data.me.role === "admin" && (
          <div>
            <label className="label" htmlFor="move">{t("admin.moveTo")}</label>
            <select id="move" className="input" value={s.class_id ?? ""} onChange={(e) => move(e.target.value)}>
              <option value="">{t("admin.noClass")}</option>
              {data.classes.map((c) => <option key={c.id} value={c.id}>{className(data, c.id)}</option>)}
            </select>
          </div>
        )}
      </div>
      {sum.attention.attention && staff && (
        <p className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          <strong>{t("dash.attention")}:</strong> {sum.attention.reason === "declining" ? t("dash.reasonDeclining", { trend: sum.attention.trend ?? 0 }) : t("dash.reasonBelow", { threshold: data.school.attention_threshold })}. {t("admin.attentionNote")}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="chart" label={t("dash.overall")} value={pct(sum.overall, 1)} />
        <Stat icon="check" label={t("att.rate")} value={pct(sum.attendance)} tone="info" />
        <Stat icon="task" label={t("dash.homeworkCompletion")} value={pct(sum.completion)} tone="accent" />
        <Stat icon="grade" label={t("gradesPage.allScores")} value={String(data.scores.filter((x) => x.student_id === s.id).length)} tone="info" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("dash.subjectPerformance")}><SubjectPerformance summary={sum} /></Card>
        <Card title={t("dash.recentGrades")}><RecentGrades d={data} student={s} limit={6} /></Card>
      </div>
      {staff && (
        <div className="mt-4">
          <Card title={t("admin.contact")}>
            {parents.length === 0 ? <Empty text={t("admin.noParents")} icon="child" /> : (
              <ul className="divide-y divide-line">
                {parents.map(({ l, p }) => (
                  <li key={p!.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={p!.full_name} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{p!.full_name}</div>
                      <div className="muted text-xs">{t(`admin.${l.relationship}`)}{p!.phone ? ` · ${p!.phone}` : ""}</div>
                    </div>
                    {p!.profile_id && <Link href={`/app/messages?to=${p!.profile_id}`} className="btn btn-ghost btn-sm">{t("nav.messages")}</Link>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
