"use client";
// Subjects the school teaches (with Amharic names), and where each is taught.
import { useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { Empty, PageHeader } from "@/components/ui";

function AddSubject({ onClose }: { onClose: () => void }) {
  const { store, reload } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const [f, setF] = useState({ name: "", name_am: "", code: "" });
  const [error, setError] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await store.addSubject(f.name, f.name_am.trim() || null, f.code.trim().toUpperCase() || null); await reload(); toast(t("admin.subjectAdded")); onClose(); }
    catch (err) { setError(errorText(err)); }
  };
  return (
    <Dialog title={t("admin.addSubject")} onClose={onClose} footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
      <button type="submit" form="add-subject" className="btn btn-primary">{t("common.add")}</button>
    </>}>
      <form id="add-subject" onSubmit={save} className="space-y-3" noValidate>
        <div><label className="label" htmlFor="s-name">{t("admin.subjectName")}</label><input id="s-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="s-am">{t("admin.subjectNameAm")}</label><input id="s-am" className="input" lang="am" value={f.name_am} onChange={(e) => setF({ ...f, name_am: e.target.value })} /></div>
        <div><label className="label" htmlFor="s-code">{t("admin.code")}</label><input id="s-code" className="input" maxLength={10} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{error}</p>}
      </form>
    </Dialog>
  );
}

export default function Subjects() {
  const { data } = useApp();
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  if (data.me.role !== "admin") return <Empty text={t("admin.noAccess")} />;
  return (
    <>
      <PageHeader title={t("nav.subjects")} action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={18} />{t("admin.addSubject")}</button>} />
      <ul className="card divide-y divide-line overflow-hidden">
        {[...data.subjects].sort((a, b) => a.name.localeCompare(b.name)).map((s) => {
          const n = data.classSubjects.filter((c) => c.subject_id === s.id).length;
          return (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-xs font-bold text-brand">{s.code ?? s.name.slice(0, 3).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{s.name}</div>
                {s.name_am && <div className="muted text-sm" lang="am">{s.name_am}</div>}
              </div>
              <span className="muted text-xs">{n} {t("nav.classes").toLowerCase()}</span>
            </li>
          );
        })}
      </ul>
      {adding && <AddSubject onClose={() => setAdding(false)} />}
    </>
  );
}
