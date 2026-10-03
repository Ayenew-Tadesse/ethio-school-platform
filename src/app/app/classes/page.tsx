"use client";
// Classes: administrators see and create every class; teachers see theirs.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText } from "@/lib/data/store";
import { className, classSummary, whoAmI } from "@/lib/domain/insights";
import { useI18n } from "@/lib/i18n";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { Empty, Meter, PageHeader, pct } from "@/components/ui";

function AddClass({ onClose }: { onClose: () => void }) {
  const { data, store, reload } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const levels = [...data.gradeLevels].sort((a, b) => a.level - b.level);
  const [grade, setGrade] = useState(levels.find((g) => g.level === 8)?.id ?? levels[0]?.id ?? "");
  const [section, setSection] = useState("");
  const [homeroom, setHomeroom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const id = await store.addClass(grade, section, homeroom || null);
      await reload();
      const g = levels.find((x) => x.id === grade);
      toast(t("admin.classCreated", { cls: `${g?.name ?? ""}${section.trim().toUpperCase()}` }));
      router.push(`/app/classes/${id}`);
    } catch (err) { setError(errorText(err)); }
  };
  return (
    <Dialog title={t("admin.addClass")} onClose={onClose} footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
      <button type="submit" form="add-class" className="btn btn-primary">{t("common.add")}</button>
    </>}>
      <form id="add-class" onSubmit={save} className="space-y-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="c-grade">{t("admin.gradeLevel")}</label>
            <select id="c-grade" className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
              {levels.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="c-section">{t("admin.section")}</label>
            <input id="c-section" className="input uppercase" maxLength={3} value={section} onChange={(e) => setSection(e.target.value)} placeholder="A" />
            <p className="muted mt-1 text-xs">{t("admin.sectionHint")}</p>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="c-home">{t("admin.homeroom")}</label>
          <select id="c-home" className="input" value={homeroom} onChange={(e) => setHomeroom(e.target.value)}>
            <option value="">{t("admin.none")}</option>
            {data.teachers.map((te) => <option key={te.id} value={te.id}>{te.full_name}</option>)}
          </select>
        </div>
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{error}</p>}
      </form>
    </Dialog>
  );
}

export default function Classes() {
  const { data } = useApp();
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const admin = data.me.role === "admin";
  const mine = whoAmI(data).teachingClasses;
  const ids = admin ? data.classes.map((c) => c.id) : mine;
  const rows = useMemo(() => ids.map((id) => ({ id, s: classSummary(data, id) }))
    .sort((a, b) => className(data, a.id).localeCompare(className(data, b.id), undefined, { numeric: true })), [data, ids]);
  if (!admin && data.me.role !== "teacher") return <Empty text={t("admin.noAccess")} />;
  return (
    <>
      <PageHeader title={admin ? t("nav.classes") : t("nav.myClasses")}
        action={admin ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={18} />{t("admin.addClass")}</button> : undefined} />
      {rows.length === 0 ? <div className="card"><Empty text={t("dash.noClasses")} icon="classes" /></div> : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ id, s }) => {
            const c = data.classes.find((x) => x.id === id)!;
            const home = data.teachers.find((te) => te.id === c.homeroom_teacher_id);
            return (
              <li key={id}>
                <Link href={`/app/classes/${id}`} className="card block p-4 transition hover:border-brand" data-class={className(data, id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-bold">{className(data, id)}</div>
                      <div className="muted text-xs">{home ? t("admin.homeroom") + ": " + home.full_name : t("admin.homeroom") + ": —"}</div>
                    </div>
                    <span className="badge badge-muted">{t("admin.students", { n: s.students })}</span>
                  </div>
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="muted">{t("dash.classAverage")}</span><span className="font-semibold">{pct(s.average)}</span></div>
                    <Meter value={s.average} label={t("dash.classAverage")} />
                    <div className="flex justify-between pt-1"><span className="muted">{t("att.rate")}</span><span className="font-semibold">{pct(s.attendance)}</span></div>
                    {s.attention.length > 0 && <div className="pt-1"><span className="badge badge-warn">{s.attention.length} · {t("dash.attention")}</span></div>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {adding && <AddClass onClose={() => setAdding(false)} />}
    </>
  );
}
