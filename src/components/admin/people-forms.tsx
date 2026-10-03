"use client";
// Forms administrators use to add people. A new login's temporary password
// is shown once, to be handed over privately.
import { useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText, type NewPerson } from "@/lib/data/store";
import { className } from "@/lib/domain/insights";
import { useI18n } from "@/lib/i18n";
import { Dialog } from "../dialog";
import { useToast } from "../toast";

export function LoginCreated({ name, email, password, onClose }: { name: string; email: string; password: string; onClose: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(`${email}\n${password}`); setCopied(true); } catch { /* select by hand */ } };
  return (
    <Dialog title={t("admin.loginCreated")} onClose={onClose} footer={<button type="button" className="btn btn-primary" onClick={onClose}>{t("admin.done")}</button>}>
      <p className="muted text-sm">{t("admin.loginHint", { name })}</p>
      <dl className="mt-4 space-y-2 rounded-xl bg-surface-2 p-4 text-sm">
        <div className="flex justify-between gap-3"><dt className="muted">{t("auth.email")}</dt><dd className="font-semibold break-all">{email}</dd></div>
        <div className="flex justify-between gap-3"><dt className="muted">{t("admin.passwordLabel")}</dt><dd className="font-mono font-semibold" data-temp-password>{password}</dd></div>
      </dl>
      <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={copy}>{copied ? t("admin.copied") : t("admin.copy")}</button>
    </Dialog>
  );
}

type Kind = "student" | "teacher" | "parent";
export function AddPerson({ kind, onClose, defaultClass }: { kind: Kind; onClose: () => void; defaultClass?: string }) {
  const { data, store, reload } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const [f, setF] = useState({ full_name: "", email: "", phone: "", class_id: defaultClass ?? data.classes[0]?.id ?? "", student_no: "", gender: "" });
  const [kids, setKids] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!f.full_name.trim()) return setError(t("admin.fullName"));
    setBusy(true);
    const p: NewPerson = {
      role: kind, full_name: f.full_name.trim(), email: f.email.trim().toLowerCase() || null, phone: f.phone.trim() || null,
      ...(kind === "student" ? { class_id: f.class_id || null, student_no: f.student_no.trim() || null, gender: (f.gender || null) as "F" | "M" | null } : {}),
      ...(kind === "parent" ? { child_ids: kids } : {}),
    };
    try {
      const r = await store.addPerson(p);
      await reload();
      toast(t("admin.added", { name: p.full_name }));
      if (r.tempPassword && p.email) setCreated({ name: p.full_name, email: p.email, password: r.tempPassword }); else onClose();
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };

  if (created) return <LoginCreated {...created} onClose={onClose} />;
  const title = t(kind === "student" ? "admin.addStudent" : kind === "teacher" ? "admin.addTeacher" : "admin.addParent");
  const matches = data.students.filter((s) => s.full_name.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  return (
    <Dialog title={title} onClose={onClose} footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
      <button type="submit" form="add-person" className="btn btn-primary" disabled={busy}>{busy ? t("common.saving") : t("common.add")}</button>
    </>}>
      <form id="add-person" onSubmit={save} className="space-y-3" noValidate>
        <div><label className="label" htmlFor="p-name">{t("admin.fullName")}</label><input id="p-name" className="input" value={f.full_name} onChange={set("full_name")} autoComplete="off" /></div>
        <div>
          <label className="label" htmlFor="p-email">{t("admin.emailOpt")}</label>
          <input id="p-email" type="email" className="input" value={f.email} onChange={set("email")} autoComplete="off" />
          <p className="muted mt-1 text-xs">{t("admin.emailHint")}</p>
        </div>
        {kind !== "student" && <div><label className="label" htmlFor="p-phone">{t("admin.phone")}</label><input id="p-phone" type="tel" className="input" value={f.phone} onChange={set("phone")} /></div>}
        {kind === "student" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label" htmlFor="p-class">{t("common.class")}</label>
              <select id="p-class" className="input" value={f.class_id} onChange={set("class_id")}>
                <option value="">{t("admin.noClass")}</option>
                {data.classes.map((c) => <option key={c.id} value={c.id}>{className(data, c.id)}</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor="p-no">{t("admin.studentNo")}</label><input id="p-no" className="input" value={f.student_no} onChange={set("student_no")} /></div>
            <div>
              <label className="label" htmlFor="p-gender">{t("admin.gender")}</label>
              <select id="p-gender" className="input" value={f.gender} onChange={set("gender")}>
                <option value="">—</option><option value="F">{t("admin.female")}</option><option value="M">{t("admin.male")}</option>
              </select>
            </div>
          </div>
        )}
        {kind === "parent" && (
          <fieldset>
            <legend className="label">{t("admin.chooseChildren")}</legend>
            <input className="input mb-2" placeholder={t("admin.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("admin.search")} />
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {matches.map((s) => (
                <li key={s.id}>
                  <label className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                    <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={kids.includes(s.id)} onChange={(e) => setKids(e.target.checked ? [...kids, s.id] : kids.filter((x) => x !== s.id))} />
                    {s.full_name} <span className="muted text-xs">{className(data, s.class_id)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{error}</p>}
      </form>
    </Dialog>
  );
}
