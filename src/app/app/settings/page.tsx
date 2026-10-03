"use client";
// School settings: details, grading weights and thresholds, attendance rules,
// who may message whom, and the academic year.
import { useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText, weightsProblem } from "@/lib/data/store";
import { weightsOf } from "@/lib/domain/performance";
import { ASSESSMENT_KINDS, type AssessmentKind, type School } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/toast";
import { Card, Empty, PageHeader } from "@/components/ui";
import { useFmt } from "@/components/dash/shared";

function Toggle({ id, label, checked, onChange, disabled }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 py-2.5 text-sm">
      <span>{label}</span>
      <span className="relative inline-flex shrink-0">
        <input id={id} type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-line transition peer-checked:bg-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand peer-disabled:opacity-50" />
        <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default function Settings() {
  const { data, store, reload } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const f = useFmt();
  const s = data.school;
  const owner = data.me.is_owner || data.me.admin_permissions?.manage_school === true;
  const [info, setInfo] = useState({ name: s.name, city: s.city ?? "", region: s.region ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "" });
  const [rules, setRules] = useState({ passing_score: String(s.passing_score), attention_threshold: String(s.attention_threshold),
    late_counts_as_present: s.late_counts_as_present, attendance_edit_days: String(s.attendance_edit_days) });
  const [messaging, setMessaging] = useState<School["messaging"]>({ ...s.messaging });
  const [weights, setWeights] = useState<Record<AssessmentKind, string>>(() => {
    const w = weightsOf(data.weights);
    return Object.fromEntries(ASSESSMENT_KINDS.map((k) => [k, String(w[k])])) as Record<AssessmentKind, string>;
  });
  const [busy, setBusy] = useState<string | null>(null);
  if (data.me.role !== "admin") return <Empty text={t("admin.noAccess")} />;

  const numeric = Object.fromEntries(ASSESSMENT_KINDS.map((k) => [k, Number(weights[k])])) as Record<AssessmentKind, number>;
  const total = ASSESSMENT_KINDS.reduce((a, k) => a + (Number(weights[k]) || 0), 0);
  const save = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); await reload(); toast(t("admin.settingsSaved")); } catch (e) { toast(errorText(e), "error"); } finally { setBusy(null); }
  };
  const inRange = (v: string, lo: number, hi: number) => { const n = Number(v); return v.trim() !== "" && n >= lo && n <= hi; };
  const year = data.years.find((y) => y.is_current);

  return (
    <>
      <PageHeader title={t("nav.settings")} />
      {!owner && <p className="mb-4 rounded-xl bg-info-soft px-4 py-3 text-sm text-info">{t("admin.ownerOnly")}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("admin.schoolInfo")}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save("info", () => store.updateSchool({ name: info.name.trim(), city: info.city.trim() || null,
            region: info.region.trim() || null, phone: info.phone.trim() || null, email: info.email.trim() || null, address: info.address.trim() || null })); }}>
            <fieldset disabled={!owner} className="space-y-3">
              <div><label className="label" htmlFor="s-name">{t("admin.schoolName")}</label><input id="s-name" className="input" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label" htmlFor="s-city">{t("admin.city")}</label><input id="s-city" className="input" value={info.city} onChange={(e) => setInfo({ ...info, city: e.target.value })} /></div>
                <div><label className="label" htmlFor="s-region">{t("admin.region")}</label><input id="s-region" className="input" value={info.region} onChange={(e) => setInfo({ ...info, region: e.target.value })} /></div>
                <div><label className="label" htmlFor="s-phone">{t("admin.phone")}</label><input id="s-phone" type="tel" className="input" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} /></div>
                <div><label className="label" htmlFor="s-email">{t("admin.email")}</label><input id="s-email" type="email" className="input" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /></div>
              </div>
              <div><label className="label" htmlFor="s-address">{t("admin.address")}</label><input id="s-address" className="input" value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} /></div>
              <div className="flex justify-end"><button type="submit" className="btn btn-primary" disabled={busy === "info" || !info.name.trim()}>{t("admin.saveSettings")}</button></div>
            </fieldset>
          </form>
        </Card>

        <Card title={t("admin.grading")}>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const problem = weightsProblem(numeric);
            if (problem) return toast(problem, "error");
            if (!inRange(rules.passing_score, 0, 100) || !inRange(rules.attention_threshold, 0, 100)) return toast(t("work.scoreInvalid", { max: 100 }), "error");
            save("grading", async () => {
              await store.saveWeights(numeric);
              if (owner) await store.updateSchool({ passing_score: Number(rules.passing_score), attention_threshold: Number(rules.attention_threshold) });
            });
          }}>
            <fieldset>
              <legend className="label">{t("admin.weightsTitle")}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ASSESSMENT_KINDS.map((k) => (
                  <div key={k}>
                    <label className="muted mb-1 block text-xs" htmlFor={`w-${k}`}>{t(`kind.${k}`)}</label>
                    <div className="relative"><input id={`w-${k}`} type="number" inputMode="numeric" min={0} max={100} className="input pr-8 tabular-nums" value={weights[k]}
                      onChange={(e) => setWeights({ ...weights, [k]: e.target.value })} /><span className="muted absolute right-3 top-1/2 -translate-y-1/2 text-sm">%</span></div>
                  </div>
                ))}
              </div>
              <p className={`mt-2 text-sm font-semibold ${Math.abs(total - 100) < 0.001 ? "text-good" : "text-bad"}`} aria-live="polite">{t("admin.weightsTotal", { n: total })}</p>
            </fieldset>
            <fieldset disabled={!owner} className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="pass">{t("admin.passMark")}</label><input id="pass" type="number" min={0} max={100} className="input" value={rules.passing_score} onChange={(e) => setRules({ ...rules, passing_score: e.target.value })} /></div>
              <div><label className="label" htmlFor="attn">{t("admin.attentionThreshold")}</label><input id="attn" type="number" min={0} max={100} className="input" value={rules.attention_threshold} onChange={(e) => setRules({ ...rules, attention_threshold: e.target.value })} /></div>
            </fieldset>
            <div className="flex justify-end"><button type="submit" className="btn btn-primary" disabled={busy === "grading"}>{t("admin.saveSettings")}</button></div>
          </form>
        </Card>

        <Card title={t("admin.attendanceRules")}>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!inRange(rules.attendance_edit_days, 0, 365)) return toast(t("work.scoreInvalid", { max: 365 }), "error");
            save("att", () => store.updateSchool({ late_counts_as_present: rules.late_counts_as_present, attendance_edit_days: Number(rules.attendance_edit_days) }));
          }}>
            <fieldset disabled={!owner}>
              <Toggle id="late" label={t("admin.lateCounts")} checked={rules.late_counts_as_present} onChange={(v) => setRules({ ...rules, late_counts_as_present: v })} />
              <div className="mt-2"><label className="label" htmlFor="days">{t("admin.editDays")}</label><input id="days" type="number" min={0} max={365} className="input max-w-32" value={rules.attendance_edit_days} onChange={(e) => setRules({ ...rules, attendance_edit_days: e.target.value })} /></div>
              <div className="mt-3 flex justify-end"><button type="submit" className="btn btn-primary" disabled={busy === "att"}>{t("admin.saveSettings")}</button></div>
            </fieldset>
          </form>
        </Card>

        <Card title={t("admin.messagingTitle")}>
          <form onSubmit={(e) => { e.preventDefault(); save("msg", () => store.updateSchool({ messaging })); }}>
            <fieldset disabled={!owner} className="divide-y divide-line">
              {([["parent_teacher", "parentTeacher"], ["teacher_parent", "teacherParent"], ["teacher_student", "teacherStudent"], ["student_teacher", "studentTeacher"]] as const).map(([k, label]) => (
                <Toggle key={k} id={`m-${k}`} label={t(`admin.${label}`)} checked={messaging[k]} onChange={(v) => setMessaging({ ...messaging, [k]: v })} />
              ))}
            </fieldset>
            <p className="muted mt-2 text-xs">{t("admin.messagingHint")}</p>
            <div className="mt-3 flex justify-end"><button type="submit" className="btn btn-primary" disabled={!owner || busy === "msg"}>{t("admin.saveSettings")}</button></div>
          </form>
        </Card>

        <Card title={t("admin.year")}>
          {year ? (
            <>
              <p className="text-sm"><span className="muted">{t("admin.currentYear")}:</span> <strong>{year.name}</strong> <span className="muted">({f.day(year.starts_on)} – {f.day(year.ends_on)})</span></p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {data.terms.filter((x) => x.academic_year_id === year.id).sort((a, b) => a.ordinal - b.ordinal).map((x) => (
                  <li key={x.id} className="flex justify-between rounded-lg bg-surface-2 px-3 py-2"><span>{x.name}</span><span className="muted">{f.day(x.starts_on)} – {f.day(x.ends_on)}</span></li>
                ))}
              </ul>
            </>
          ) : <Empty text={t("common.noData")} icon="calendar" />}
        </Card>
      </div>
    </>
  );
}
