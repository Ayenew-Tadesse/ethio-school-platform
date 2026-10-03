"use client";
// The digital library: browse by grade, subject and type; teachers and
// administrators add materials (a file in private storage, or a link).
import { useMemo, useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText } from "@/lib/data/store";
import { subjectName, whoAmI } from "@/lib/domain/insights";
import { RESOURCE_TYPES, type Resource, type ResourceType } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n";
import { Dialog } from "@/components/dialog";
import { Icon, type IconName } from "@/components/icons";
import { useToast } from "@/components/toast";
import { Empty, PageHeader } from "@/components/ui";
import { useFmt } from "@/components/dash/shared";

const TYPE_ICON: Record<ResourceType, IconName> = {
  pdf: "task", document: "task", video: "arrow", presentation: "classes", practice_test: "exam", study_guide: "book", textbook: "library",
};

function AddMaterial({ onClose }: { onClose: () => void }) {
  const { data, store, reload } = useApp();
  const { t, locale } = useI18n();
  const toast = useToast();
  const [f, setF] = useState({ title: "", description: "", subject_id: "", grade_level_id: "", topic: "", type: "pdf" as ResourceType, url: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!f.title.trim()) return setError(t("work.needTitle"));
    if (!file && !f.url.trim()) return setError(t("comm.fileOrLink"));
    if (f.url.trim() && !/^https?:\/\//i.test(f.url.trim())) return setError(t("comm.link"));
    setBusy(true);
    try {
      await store.addResource({ title: f.title, description: f.description, subject_id: f.subject_id || null, grade_level_id: f.grade_level_id || null,
        topic: f.topic, type: f.type, url: file ? null : f.url.trim(), file });
      await reload();
      toast(t("comm.added"));
      onClose();
    } catch (err) { setError(errorText(err)); setBusy(false); }
  };
  return (
    <Dialog title={t("comm.addMaterial")} onClose={onClose} footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
      <button type="submit" form="add-material" className="btn btn-primary" disabled={busy}>{busy ? t("common.saving") : t("common.add")}</button>
    </>}>
      <form id="add-material" onSubmit={save} className="space-y-3" noValidate>
        <div><label className="label" htmlFor="r-title">{t("common.title")}</label><input id="r-title" className="input" maxLength={160} value={f.title} onChange={set("title")} /></div>
        <div><label className="label" htmlFor="r-desc">{t("common.description")}</label><textarea id="r-desc" className="input min-h-20" maxLength={2000} value={f.description} onChange={set("description")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="r-subject">{t("common.subject")}</label>
            <select id="r-subject" className="input" value={f.subject_id} onChange={set("subject_id")}>
              <option value="">—</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{subjectName(data, s.id, locale)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="r-grade">{t("common.grade")}</label>
            <select id="r-grade" className="input" value={f.grade_level_id} onChange={set("grade_level_id")}>
              <option value="">—</option>{[...data.gradeLevels].sort((a, b) => a.level - b.level).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="r-type">{t("comm.type")}</label>
            <select id="r-type" className="input" value={f.type} onChange={set("type")}>
              {RESOURCE_TYPES.map((x) => <option key={x} value={x}>{t(`rtype.${x}`)}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor="r-topic">{t("comm.topic")}</label><input id="r-topic" className="input" placeholder={t("comm.topicPh")} value={f.topic} onChange={set("topic")} /></div>
        </div>
        <fieldset className="space-y-2">
          <legend className="label">{t("comm.fileOrLink")}</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line p-3 text-sm hover:bg-surface-2">
            <Icon name="upload" />
            <span className="min-w-0"><span className="font-semibold text-brand">{file ? file.name : t("work.addFiles")}</span><span className="muted block text-xs">{t("work.attachHint")}</span></span>
            <input type="file" className="sr-only" onChange={(e) => { const x = e.target.files?.[0]; if (x && x.size <= 20 * 1024 * 1024) setFile(x); }} />
          </label>
          {!file && <input className="input" type="url" inputMode="url" placeholder="https://" aria-label={t("comm.link")} value={f.url} onChange={set("url")} />}
        </fieldset>
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{error}</p>}
      </form>
    </Dialog>
  );
}

function Item({ r }: { r: Resource }) {
  const { data, store } = useApp();
  const { t, locale } = useI18n();
  const toast = useToast();
  const f = useFmt();
  const grade = data.gradeLevels.find((g) => g.id === r.grade_level_id);
  const author = data.people.find((p) => p.id === r.uploaded_by);
  const open = async () => {
    if (r.url) { window.open(r.url, "_blank", "noopener"); return; }
    const url = r.file_path ? await store.fileUrl("materials", r.file_path) : null;
    if (url) window.open(url, "_blank", "noopener"); else toast(t("work.fileGone"), "error");
  };
  return (
    <li className="card flex min-w-0 flex-col p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon name={TYPE_ICON[r.type]} size={18} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug">{r.title}</h3>
          <p className="muted mt-0.5 text-xs">{[t(`rtype.${r.type}`), r.subject_id && subjectName(data, r.subject_id, locale), grade?.name, r.topic].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {r.description && <p className="muted mt-2 line-clamp-2 text-sm">{r.description}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="muted truncate text-xs">{author ? t("comm.by", { name: author.full_name }) : ""} · {f.day(r.created_at)}</span>
        <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={open}>{r.url ? t("comm.openLink") : t("comm.open")}</button>
      </div>
    </li>
  );
}

export default function Library() {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const [adding, setAdding] = useState(false);
  // Students start at their own grade.
  const me = whoAmI(data);
  const myGrade = data.classes.find((c) => c.id === (me.student?.class_id ?? me.children[0]?.class_id))?.grade_level_id ?? "";
  const [grade, setGrade] = useState(myGrade);
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const list = useMemo(() => data.resources
    .filter((r) => (!grade || r.grade_level_id === grade) && (!subject || r.subject_id === subject) && (!type || r.type === type)
      && `${r.title} ${r.topic ?? ""} ${r.description ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)), [data, grade, subject, type, q]);
  const canAdd = data.me.role === "teacher" || data.me.role === "admin";
  return (
    <>
      <PageHeader title={t("nav.library")} subtitle={t("comm.libSub")}
        action={canAdd ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={18} />{t("comm.addMaterial")}</button> : undefined} />
      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <input className="input col-span-2 lg:col-span-1" placeholder={t("comm.searchLib")} aria-label={t("comm.searchLib")} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" aria-label={t("common.grade")} value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">{t("comm.allGrades")}</option>{[...data.gradeLevels].sort((a, b) => a.level - b.level).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select className="input" aria-label={t("common.subject")} value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">{t("comm.allSubjects")}</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{subjectName(data, s.id, locale)}</option>)}
        </select>
        <select className="input col-span-2 lg:col-span-1" aria-label={t("comm.type")} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">{t("comm.allTypes")}</option>{RESOURCE_TYPES.map((x) => <option key={x} value={x}>{t(`rtype.${x}`)}</option>)}
        </select>
      </div>
      {list.length === 0 ? <div className="card"><Empty text={t("comm.noResults")} icon="library" /></div>
        : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((r) => <Item key={r.id} r={r} />)}</ul>}
      {adding && <AddMaterial onClose={() => setAdding(false)} />}
    </>
  );
}
