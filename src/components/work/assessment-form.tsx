"use client";
// Creating homework / an assignment (due date, files, submissions) or an exam
// (quiz, midterm, final: a date, scores entered afterwards).
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText } from "@/lib/data/store";
import { className, subjectName, todayIso, whoAmI } from "@/lib/domain/insights";
import type { AssessmentKind } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n";
import { Icon } from "../icons";
import { useToast } from "../toast";
import { PageHeader } from "../ui";

const MAX: Record<AssessmentKind, number> = { homework: 10, assignment: 50, quiz: 20, midterm: 100, final: 100 };
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export function AssessmentForm({ mode }: { mode: "work" | "exam" }) {
  const { data, store, reload } = useApp();
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const me = whoAmI(data);
  const options = data.me.role === "admin" ? data.classSubjects : me.teachingCs;
  const kinds: AssessmentKind[] = mode === "work" ? ["homework", "assignment"] : ["quiz", "midterm", "final"];
  const [cs, setCs] = useState(options.find((o) => o.class_id === params.get("class"))?.id ?? options[0]?.id ?? "");
  const [kind, setKind] = useState<AssessmentKind>(kinds[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(plusDays(mode === "work" ? 3 : 7));
  const [time, setTime] = useState("17:00");
  const [max, setMax] = useState(String(MAX[kinds[0]]));
  const [resubmit, setResubmit] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!cs) return setError(t("work.needClass"));
    if (!title.trim()) return setError(t("work.needTitle"));
    if (!date) return setError(t("work.needDue"));
    const maxScore = Number(max);
    if (!(maxScore > 0) || maxScore > 1000) return setError(t("work.scoreInvalid", { max: 1000 }));
    setBusy(true);
    try {
      const a = await store.createAssessment({
        class_subject_id: cs, kind, title, description, max_score: maxScore, publish, allow_resubmit: mode === "work" && resubmit, files,
        due_at: mode === "work" ? new Date(`${date}T${time || "17:00"}`).toISOString() : null, scheduled_on: mode === "exam" ? date : null,
      });
      await reload();
      toast(publish ? t("work.published") : t("work.created"));
      router.push(`/app/assignments/${a.id}`);
    } catch (err) { setError(errorText(err)); setBusy(false); }
  };

  return (
    <>
      <PageHeader title={mode === "work" ? t("work.newTitle") : t("work.newExam")} />
      <form onSubmit={submit} className="card max-w-2xl space-y-4 p-4 sm:p-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="f-cs">{t("work.classSubject")}</label>
            <select id="f-cs" className="input" value={cs} onChange={(e) => setCs(e.target.value)}>
              {options.map((o) => <option key={o.id} value={o.id}>{className(data, o.class_id)} · {subjectName(data, o.subject_id, locale)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-kind">{t("work.kindLabel")}</label>
            <select id="f-kind" className="input" value={kind} onChange={(e) => { const k = e.target.value as AssessmentKind; setKind(k); setMax(String(MAX[k])); }}>
              {kinds.map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="f-title">{t("common.title")}</label>
          <input id="f-title" className="input" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} placeholder={t("work.titlePh")} required />
        </div>
        <div>
          <label className="label" htmlFor="f-desc">{t("common.description")}</label>
          <textarea id="f-desc" className="input min-h-28" value={description} maxLength={4000} onChange={(e) => setDescription(e.target.value)} placeholder={t("work.descPh")} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="f-date">{mode === "work" ? t("work.dueDate") : t("work.examDate")}</label>
            <input id="f-date" type="date" className="input" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} />
          </div>
          {mode === "work" && (
            <div>
              <label className="label" htmlFor="f-time">{t("work.dueTime")}</label>
              <input id="f-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label" htmlFor="f-max">{t("work.maxScore")}</label>
            <input id="f-max" type="number" inputMode="decimal" min={1} max={1000} className="input" value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
        </div>
        {mode === "work" && (
          <>
            <div>
              <span className="label">{t("work.attach")}</span>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line p-4 hover:bg-surface-2">
                <Icon name="upload" />
                <span className="text-sm"><span className="font-semibold text-brand">{t("work.addFiles")}</span><span className="muted block text-xs">{t("work.attachHint")}</span></span>
                <input type="file" multiple className="sr-only" onChange={(e) => setFiles([...files, ...[...(e.target.files ?? [])].filter((f) => f.size <= 20 * 1024 * 1024)])} />
              </label>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-sm">
                      <span className="truncate">{f.name}</span>
                      <button type="button" className="text-muted" aria-label={`${t("common.delete")} ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><Icon name="x" size={16} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4 accent-[var(--brand)]" checked={resubmit} onChange={(e) => setResubmit(e.target.checked)} />{t("work.allowResubmit")}</label>
          </>
        )}
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4 accent-[var(--brand)]" checked={publish} onChange={(e) => setPublish(e.target.checked)} />{t("work.publishNow")}</label>
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>{t("common.cancel")}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t("common.saving") : publish ? t("work.publish") : t("work.saveDraft")}</button>
        </div>
      </form>
    </>
  );
}
