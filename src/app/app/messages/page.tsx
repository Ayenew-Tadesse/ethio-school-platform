"use client";
// Messages inside the school: conversations list and one thread. Who can
// start a conversation follows the school's rules; replies always work.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { errorText } from "@/lib/data/store";
import { contacts } from "@/lib/domain/insights";
import { useI18n } from "@/lib/i18n";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { Avatar, Empty, PageHeader } from "@/components/ui";
import { useFmt } from "@/components/dash/shared";

function NewMessage({ onClose, onPick }: { onClose: () => void; onPick: (id: string) => void }) {
  const { data } = useApp();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const list = contacts(data).filter((p) => p.full_name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Dialog title={t("comm.newMessage")} onClose={onClose}>
      <input className="input mb-3" placeholder={t("admin.search")} aria-label={t("comm.chooseContact")} value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length === 0 ? <Empty text={t("comm.noContacts")} icon="message" /> : (
        <ul className="max-h-[50dvh] divide-y divide-line overflow-y-auto">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" className="flex w-full items-center gap-3 py-2.5 text-left hover:opacity-80" onClick={() => onPick(p.id)}>
                <Avatar name={p.full_name} size={34} />
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{p.full_name}</span><span className="muted text-xs">{t(`role.${p.role}`)}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted mt-3 text-xs">{t("comm.rulesHint")}</p>
    </Dialog>
  );
}

function Thread({ other }: { other: string }) {
  const { data, store, reload } = useApp();
  const { t } = useI18n();
  const toast = useToast();
  const f = useFmt();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const person = data.people.find((p) => p.id === other);
  const msgs = data.messages.filter((m) => (m.sender_id === other && m.recipient_id === data.me.id) || (m.sender_id === data.me.id && m.recipient_id === other))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const unread = msgs.some((m) => m.recipient_id === data.me.id && !m.read_at);
  const canSend = contacts(data).some((p) => p.id === other);
  useEffect(() => { if (unread) void store.markMessagesRead(other).then(reload); }, [unread, other, store, reload]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try { await store.sendMessage(other, text); setText(""); await reload(); } catch (err) { toast(errorText(err), "error"); } finally { setBusy(false); }
  };
  if (!person) return <Empty text={t("comm.selectConvo")} icon="message" />;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link href="/app/messages" className="grid size-9 place-items-center rounded-full hover:bg-surface-2 lg:hidden" aria-label={t("comm.back")}>←</Link>
        <Avatar name={person.full_name} size={36} />
        <div className="min-w-0"><div className="truncate font-semibold">{person.full_name}</div><div className="muted text-xs">{t(`role.${person.role}`)}</div></div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
        {msgs.length === 0 && <p className="muted py-8 text-center text-sm">{t("comm.startHint")}</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === data.me.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%] ${mine ? "rounded-br-md bg-brand text-on-brand" : "rounded-bl-md bg-surface-2"}`}>
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "opacity-75" : "text-muted"}`}>{f.dateTime(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {canSend ? (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
          <label htmlFor="msg" className="sr-only">{t("comm.writePh")}</label>
          <textarea id="msg" rows={1} className="input max-h-40 min-h-11 flex-1 resize-none" placeholder={t("comm.writePh")} value={text} maxLength={4000}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
          <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()} aria-label={t("comm.send")}><Icon name="arrow" size={18} /><span className="hidden sm:inline">{t("comm.send")}</span></button>
        </form>
      ) : <p className="muted border-t border-line p-3 text-center text-xs">{t("comm.rulesHint")}</p>}
    </div>
  );
}

function Messages() {
  const { data } = useApp();
  const { t } = useI18n();
  const f = useFmt();
  const router = useRouter();
  const params = useSearchParams();
  const other = params.get("with") ?? params.get("to");
  const [picking, setPicking] = useState(false);
  const convos = useMemo(() => {
    const by = new Map<string, typeof data.messages>();
    for (const m of data.messages) {
      const o = m.sender_id === data.me.id ? m.recipient_id : m.sender_id;
      by.set(o, [...(by.get(o) ?? []), m]);
    }
    return [...by.entries()].map(([id, list]) => {
      const last = list.reduce((a, b) => (a.created_at > b.created_at ? a : b));
      return { id, last, unread: list.filter((m) => m.recipient_id === data.me.id && !m.read_at).length, person: data.people.find((p) => p.id === id) };
    }).sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [data]);
  const open = (id: string) => router.push(`/app/messages?with=${id}`);

  return (
    <>
      <div className={other ? "hidden lg:block" : ""}>
        <PageHeader title={t("nav.messages")} action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setPicking(true)}><Icon name="plus" size={18} />{t("comm.newMessage")}</button>} />
      </div>
      <div className="card grid h-[calc(100dvh-13rem)] min-h-[26rem] overflow-hidden lg:h-[calc(100dvh-12rem)] lg:grid-cols-[20rem_1fr]">
        <aside className={`min-h-0 overflow-y-auto border-line lg:border-r ${other ? "hidden lg:block" : ""}`} aria-label={t("nav.messages")}>
          {convos.length === 0 ? <div className="p-6"><Empty text={t("comm.noConvos")} icon="message" /><p className="muted text-center text-xs">{t("comm.startHint")}</p></div> : (
            <ul className="divide-y divide-line">
              {convos.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => open(c.id)} aria-current={other === c.id ? "true" : undefined}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left ${other === c.id ? "bg-brand-soft" : "hover:bg-surface-2"}`}>
                    <Avatar name={c.person?.full_name ?? "?"} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-sm ${c.unread ? "font-bold" : "font-semibold"}`}>{c.person?.full_name ?? "—"}</span>
                        <span className="muted shrink-0 text-[11px]">{f.day(c.last.created_at)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`truncate text-xs ${c.unread ? "text-text" : "text-muted"}`}>{c.last.sender_id === data.me.id ? `${t("comm.you")}: ` : ""}{c.last.body}</span>
                        {c.unread > 0 && <span className="badge badge-bad ml-auto shrink-0">{c.unread}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className={`min-h-0 ${other ? "" : "hidden lg:block"}`}>
          {other ? <Thread key={other} other={other} /> : <div className="grid h-full place-items-center"><Empty text={t("comm.selectConvo")} icon="message" /></div>}
        </section>
      </div>
      {picking && <NewMessage onClose={() => setPicking(false)} onPick={(id) => { setPicking(false); open(id); }} />}
    </>
  );
}

export default function MessagesPage() {
  return <Suspense><Messages /></Suspense>;
}
