"use client";
// Students (and their parents). Administrators add and organise; teachers
// see the students in the classes they teach.
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText } from "@/lib/data/store";
import { className, studentSummary } from "@/lib/domain/insights";
import { useI18n } from "@/lib/i18n";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { Avatar, Empty, PageHeader, pct, scoreTone } from "@/components/ui";
import { AddPerson } from "@/components/admin/people-forms";

function StudentsList() {
  const { data } = useApp();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("");
  const rows = useMemo(() => data.students
    .filter((s) => (!cls || (cls === "none" ? !s.class_id : s.class_id === cls)) && `${s.full_name} ${s.student_no ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
    .map((s) => ({ s, sum: studentSummary(data, s.id) })), [data, q, cls]);
  return (
    <>
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_14rem]">
        <input className="input" placeholder={t("admin.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("admin.search")} />
        <select className="input" value={cls} onChange={(e) => setCls(e.target.value)} aria-label={t("common.class")}>
          <option value="">{t("admin.allClasses")}</option>
          {data.classes.map((c) => <option key={c.id} value={c.id}>{className(data, c.id)}</option>)}
          {data.me.role === "admin" && <option value="none">{t("admin.noClass")}</option>}
        </select>
      </div>
      <p className="muted mb-2 text-sm">{rows.length === 1 ? t("admin.studentsOne") : t("admin.students", { n: rows.length })}</p>
      {rows.length === 0 ? <div className="card"><Empty text={t("common.empty")} icon="users" /></div> : (
        <ul className="card divide-y divide-line overflow-hidden">
          {rows.map(({ s, sum }) => (
            <li key={s.id}>
              <Link href={`/app/students/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 sm:px-5">
                <Avatar name={s.full_name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{s.full_name}</span>
                  <span className="muted block truncate text-xs">{className(data, s.class_id)}{s.student_no ? ` · ${s.student_no}` : ""}{s.profile_id ? "" : ` · ${t("admin.noLogin")}`}</span>
                </span>
                {sum?.attention.attention && <span className="badge badge-warn" title={t("dash.attention")}><Icon name="alert" size={14} /></span>}
                <span className={`badge ${scoreTone(sum?.overall, data.school.passing_score)}`}>{pct(sum?.overall)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function LinkChild({ parentId, onClose }: { parentId: string; onClose: () => void }) {
  const { data, store, reload } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const [student, setStudent] = useState("");
  const [rel, setRel] = useState<"mother" | "father" | "guardian" | "other">("guardian");
  const linked = new Set(data.parentStudents.filter((l) => l.parent_id === parentId).map((l) => l.student_id));
  const save = async () => {
    if (!student) return;
    try { await store.linkParent(parentId, student, rel); await reload(); onClose(); } catch (e) { toast(errorText(e), "error"); }
  };
  return (
    <Dialog title={t("admin.linkChild")} onClose={onClose} footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
      <button type="button" className="btn btn-primary" disabled={!student} onClick={save}>{t("admin.link")}</button>
    </>}>
      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="lc-student">{t("common.student")}</label>
          <select id="lc-student" className="input" value={student} onChange={(e) => setStudent(e.target.value)}>
            <option value="">—</option>
            {data.students.filter((s) => !linked.has(s.id)).sort((a, b) => a.full_name.localeCompare(b.full_name)).map((s) => <option key={s.id} value={s.id}>{s.full_name} · {className(data, s.class_id)}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="lc-rel">{t("admin.relationship")}</label>
          <select id="lc-rel" className="input" value={rel} onChange={(e) => setRel(e.target.value as typeof rel)}>
            {(["mother", "father", "guardian", "other"] as const).map((r) => <option key={r} value={r}>{t(`admin.${r}`)}</option>)}
          </select>
        </div>
      </div>
    </Dialog>
  );
}

function ParentsList() {
  const { data } = useApp();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const rows = data.parents.filter((p) => p.full_name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.full_name.localeCompare(b.full_name));
  return (
    <>
      <input className="input mb-3" placeholder={t("admin.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("admin.search")} />
      <ul className="card divide-y divide-line overflow-hidden">
        {rows.map((p) => {
          const kids = data.parentStudents.filter((l) => l.parent_id === p.id).map((l) => ({ l, s: data.students.find((s) => s.id === l.student_id) })).filter((x) => x.s);
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Avatar name={p.full_name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.full_name}</div>
                <div className="muted truncate text-xs">
                  {kids.length ? kids.map(({ l, s }) => `${s!.full_name} (${t(`admin.${l.relationship}`)})`).join(", ") : t("admin.noChildren")}
                  {p.phone ? ` · ${p.phone}` : ""}{p.profile_id ? "" : ` · ${t("admin.noLogin")}`}
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLinking(p.id)}>{t("admin.link")}</button>
            </li>
          );
        })}
      </ul>
      {linking && <LinkChild parentId={linking} onClose={() => setLinking(null)} />}
    </>
  );
}

export default function Students() {
  const { data } = useApp();
  const { t } = useI18n();
  const [tab, setTab] = useState<"students" | "parents">("students");
  const [adding, setAdding] = useState(false);
  const admin = data.me.role === "admin";
  if (!admin && data.me.role !== "teacher") return <Empty text={t("admin.noAccess")} />;
  return (
    <>
      <PageHeader title={t("nav.students")}
        action={admin ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={18} />{tab === "students" ? t("admin.addStudent") : t("admin.addParent")}</button> : undefined} />
      {admin && (
        <div className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1 sm:max-w-xs" role="tablist">
          {(["students", "parents"] as const).map((x) => (
            <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)}
              className={`min-h-10 flex-1 rounded-lg text-sm ${tab === x ? "bg-surface font-semibold shadow-sm" : "text-muted"}`}>{x === "students" ? t("nav.students") : t("admin.parents")}</button>
          ))}
        </div>
      )}
      {tab === "students" ? <StudentsList /> : <ParentsList />}
      {adding && <AddPerson kind={tab === "students" ? "student" : "parent"} onClose={() => setAdding(false)} />}
    </>
  );
}
