"use client";
// The Assignments and Exams lists, shaped for each role: teachers see
// submission and grading progress; students and parents see status.
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { STATUS_TONE, assessmentPlace, canTeach, className, studentsIn, subjectName, whoAmI, workStatus } from "@/lib/domain/insights";
import type { Assessment, Student } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n";
import { Icon } from "../icons";
import { Empty, PageHeader } from "../ui";
import { useFmt } from "../dash/shared";
import { ChildPicker, useChild } from "../dash/parent";

type Mode = "work" | "exam";
const isWork = (a: Assessment) => a.takes_submissions;
const when = (a: Assessment) => a.due_at ?? (a.scheduled_on ? `${a.scheduled_on}T23:59:59` : a.created_at);

function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm ${value === t.id ? "bg-surface font-semibold shadow-sm" : "text-muted"}`}>
          {t.label}<span className="text-xs opacity-70">{t.count}</span>
        </button>
      ))}
    </div>
  );
}

function Row({ a, right, sub }: { a: Assessment; right: React.ReactNode; sub?: string }) {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const f = useFmt();
  const p = assessmentPlace(data, a);
  return (
    <li>
      <Link href={`/app/assignments/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 sm:px-5">
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${isWork(a) ? "bg-info-soft text-info" : "bg-accent-soft text-accent"}`}><Icon name={isWork(a) ? "task" : "exam"} size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{a.title}</span>
          <span className="muted block truncate text-xs">{t(`kind.${a.kind}`)} · {subjectName(data, p.subjectId, locale)} · {className(data, p.classId)}</span>
          <span className="muted block text-xs">{a.due_at ? t("work.due", { date: f.dateTime(a.due_at) }) : t("work.on", { date: f.day(a.scheduled_on) })}{sub ? ` · ${sub}` : ""}</span>
        </span>
        <span className="shrink-0">{right}</span>
      </Link>
    </li>
  );
}

function List({ items, render }: { items: Assessment[]; render: (a: Assessment) => React.ReactNode }) {
  const { t } = useI18n();
  if (!items.length) return <div className="card"><Empty text={t("work.nothing")} icon="calendar" /></div>;
  return <ul className="card divide-y divide-line overflow-hidden">{items.map(render)}</ul>;
}

function TeacherIndex({ mode }: { mode: Mode }) {
  const { data } = useApp();
  const { t } = useI18n();
  const me = whoAmI(data);
  const classes = data.me.role === "admin" ? data.classes.map((c) => c.id) : me.teachingClasses;
  const [cls, setCls] = useState("");
  const [tab, setTab] = useState<"open" | "past" | "drafts">("open");
  const now = new Date().toISOString();
  const mine = data.assessments.filter((a) => (mode === "work") === isWork(a) && canTeach(data, a) && (!cls || assessmentPlace(data, a).classId === cls));
  const groups = {
    open: mine.filter((a) => a.published && when(a) >= now).sort((x, y) => when(x).localeCompare(when(y))),
    past: mine.filter((a) => a.published && when(a) < now).sort((x, y) => when(y).localeCompare(when(x))),
    drafts: mine.filter((a) => !a.published),
  };
  return (
    <>
      <PageHeader title={t(mode === "work" ? "nav.assignments" : "nav.exams")}
        action={<Link href={mode === "work" ? "/app/assignments/new" : "/app/exams/new"} className="btn btn-primary btn-sm"><Icon name="plus" size={18} />{t(mode === "work" ? "work.newTitle" : "work.newExam")}</Link>} />
      {classes.length > 1 && (
        <select className="input mb-3 sm:max-w-xs" value={cls} onChange={(e) => setCls(e.target.value)} aria-label={t("common.class")}>
          <option value="">{t("work.allClasses")}</option>
          {classes.map((c) => <option key={c} value={c}>{className(data, c)}</option>)}
        </select>
      )}
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "open", label: mode === "work" ? t("work.open") : t("work.scheduled"), count: groups.open.length },
        { id: "past", label: t("work.past"), count: groups.past.length },
        { id: "drafts", label: t("work.drafts"), count: groups.drafts.length },
      ]} />
      <List items={groups[tab]} render={(a) => {
        const total = studentsIn(data, assessmentPlace(data, a).classId).length;
        const subs = data.submissions.filter((s) => s.assessment_id === a.id).length;
        const graded = data.scores.filter((s) => s.assessment_id === a.id).length;
        const toGrade = isWork(a) ? data.submissions.filter((s) => s.assessment_id === a.id && !data.scores.some((x) => x.assessment_id === a.id && x.student_id === s.student_id)).length : 0;
        return <Row key={a.id} a={a} sub={isWork(a) ? t("work.submittedCount", { n: subs, total }) : t("work.gradedCount", { n: graded, total })}
          right={!a.published ? <span className="badge badge-warn">{t("work.draft")}</span> : toGrade > 0 ? <span className="badge badge-info">{toGrade} {t("dash.toGrade").toLowerCase()}</span>
            : graded >= total && total > 0 ? <span className="badge badge-good">{t("work.graded")}</span> : null} />;
      }} />
    </>
  );
}

function LearnerList({ mode, student }: { mode: Mode; student: Student }) {
  const { data } = useApp();
  const { t } = useI18n();
  const [tab, setTab] = useState<"todo" | "done" | "graded">("todo");
  const items = data.assessments.filter((a) => a.published && (mode === "work") === isWork(a) && assessmentPlace(data, a).classId === student.class_id);
  const st = (a: Assessment) => workStatus(data, a, student.id);
  const groups = {
    todo: items.filter((a) => ["todo", "missing", "scheduled"].includes(st(a))).sort((x, y) => when(x).localeCompare(when(y))),
    done: items.filter((a) => ["submitted", "late", "absent_score"].includes(st(a))).sort((x, y) => when(y).localeCompare(when(x))),
    graded: items.filter((a) => st(a) === "graded").sort((x, y) => when(y).localeCompare(when(x))),
  };
  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "todo", label: mode === "work" ? t("work.toDo") : t("work.scheduled"), count: groups.todo.length },
        { id: "done", label: mode === "work" ? t("work.submitted") : t("work.past"), count: groups.done.length },
        { id: "graded", label: t("work.graded"), count: groups.graded.length },
      ]} />
      <List items={groups[tab]} render={(a) => {
        const s = st(a);
        const score = data.scores.find((x) => x.assessment_id === a.id && x.student_id === student.id && x.released);
        return <Row key={a.id} a={a} right={score ? <span className="badge badge-good">{Number(score.score)} / {Number(a.max_score)}</span> : <span className={`badge ${STATUS_TONE[s]}`}>{t(`work.${s}`)}</span>} />;
      }} />
    </>
  );
}

export function WorkIndex({ mode }: { mode: Mode }) {
  const { data } = useApp();
  const { t } = useI18n();
  const pick = useChild();
  if (data.me.role === "teacher" || data.me.role === "admin") return <TeacherIndex mode={mode} />;
  const title = t(mode === "work" ? "nav.assignments" : "nav.exams");
  if (data.me.role === "parent") {
    return (
      <>
        <PageHeader title={title} subtitle={pick.child?.full_name} />
        <ChildPicker {...pick} />
        {pick.child ? <LearnerList key={pick.child.id} mode={mode} student={pick.child} /> : <Empty text={t("dash.noChildren")} icon="child" />}
      </>
    );
  }
  const me = whoAmI(data).student;
  return <><PageHeader title={title} />{me ? <LearnerList mode={mode} student={me} /> : <Empty text={t("dash.notLinked")} />}</>;
}
