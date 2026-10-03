"use client";
// Announcements: administrators post to the whole school or a group;
// teachers post to their own classes. Pinned ones stay on top.
import { useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText } from "@/lib/data/store";
import { className, whoAmI } from "@/lib/domain/insights";
import type { Audience } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { Avatar, Empty, PageHeader } from "@/components/ui";
import { useFmt } from "@/components/dash/shared";

const AUDIENCES: Audience[] = ["everyone", "teachers", "students", "parents", "class"];

function Post({ onClose }: { onClose: () => void }) {
  const { data, store, reload } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const admin = data.me.role === "admin";
  const classes = admin ? data.classes.map((c) => c.id) : whoAmI(data).teachingClasses;
  const [f, setF] = useState({ title: "", body: "", audience: (admin ? "everyone" : "class") as Audience, class_id: classes[0] ?? "", pinned: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await store.postAnnouncement({ title: f.title, body: f.body, audience: f.audience, class_id: f.audience === "class" ? f.class_id || null : null, pinned: admin && f.pinned });
      await reload();
      toast(t("comm.posted"));
      onClose();
    } catch (err) { setError(errorText(err)); setBusy(false); }
  };
  return (
    <Dialog title={t("comm.post")} onClose={onClose} footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
      <button type="submit" form="post-ann" className="btn btn-primary" disabled={busy || !f.title.trim() || !f.body.trim()}>{busy ? t("common.saving") : t("work.publish")}</button>
    </>}>
      <form id="post-ann" onSubmit={save} className="space-y-3" noValidate>
        <div><label className="label" htmlFor="a-title">{t("common.title")}</label><input id="a-title" className="input" maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="label" htmlFor="a-body">{t("comm.bodyLabel")}</label><textarea id="a-body" className="input min-h-32" maxLength={5000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="a-aud">{t("comm.audienceLabel")}</label>
            <select id="a-aud" className="input" value={f.audience} disabled={!admin} onChange={(e) => setF({ ...f, audience: e.target.value as Audience })}>
              {AUDIENCES.map((a) => <option key={a} value={a}>{t(`audience.${a}`)}</option>)}
            </select>
          </div>
          {f.audience === "class" && (
            <div>
              <label className="label" htmlFor="a-class">{t("common.class")}</label>
              <select id="a-class" className="input" value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}>
                {classes.map((c) => <option key={c} value={c}>{className(data, c)}</option>)}
              </select>
            </div>
          )}
        </div>
        {!admin && <p className="muted text-xs">{t("comm.teacherClassOnly")}</p>}
        {admin && <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} />{t("comm.pin")}</label>}
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{error}</p>}
      </form>
    </Dialog>
  );
}

export default function Announcements() {
  const { data } = useApp();
  const { t } = useI18n();
  const f = useFmt();
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState<"all" | Audience>("all");
  const canPost = data.me.role === "admin" || (data.me.role === "teacher" && whoAmI(data).teachingClasses.length > 0);
  const list = [...data.announcements].filter((a) => filter === "all" || a.audience === filter)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.published_at.localeCompare(a.published_at));
  const present = AUDIENCES.filter((a) => data.announcements.some((x) => x.audience === a));
  return (
    <>
      <PageHeader title={t("nav.announcements")}
        action={canPost ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setPosting(true)}><Icon name="plus" size={18} />{t("comm.post")}</button> : undefined} />
      {present.length > 1 && (
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist">
          {(["all", ...present] as const).map((a) => (
            <button key={a} type="button" role="tab" aria-selected={filter === a} onClick={() => setFilter(a)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${filter === a ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line bg-surface"}`}>
              {a === "all" ? t("comm.allAnnouncements") : t(`audience.${a}`)}
            </button>
          ))}
        </div>
      )}
      {list.length === 0 ? <div className="card"><Empty text={t("common.empty")} icon="megaphone" /></div> : (
        <ul className="space-y-3">
          {list.map((a) => {
            const author = data.people.find((p) => p.id === a.author_id);
            return (
              <li key={a.id} className={`card p-4 sm:p-5 ${a.pinned ? "border-accent/50" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {a.pinned && <span className="badge badge-warn">{t("dash.pinned")}</span>}
                  <span className="badge badge-muted">{a.audience === "class" ? t("comm.forClass", { cls: className(data, a.class_id) }) : t(`audience.${a.audience}`)}</span>
                  <span className="muted ml-auto text-xs">{f.dateTime(a.published_at)}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold">{a.title}</h2>
                <p className="mt-1 whitespace-pre-line text-[.95rem]">{a.body}</p>
                {author && <p className="muted mt-3 flex items-center gap-2 text-xs"><Avatar name={author.full_name} size={22} />{author.full_name} · {t(`role.${author.role}`)}</p>}
              </li>
            );
          })}
        </ul>
      )}
      {posting && <Post onClose={() => setPosting(false)} />}
    </>
  );
}
