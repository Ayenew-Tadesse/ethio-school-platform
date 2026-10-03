"use client";
// Every notification for the signed-in person, newest first.
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/data/app-context";
import type { Notification } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/icons";
import { Empty, PageHeader } from "@/components/ui";
import { useFmt } from "@/components/dash/shared";

const ICON: Record<string, IconName> = { absent: "check", new_assessment: "task", grade_released: "grade", submission: "upload", announcement: "megaphone", message: "message" };

export default function Notifications() {
  const { data, store, reload } = useApp();
  const { t } = useI18n();
  const f = useFmt();
  const router = useRouter();
  const list = [...data.notifications].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const unread = list.filter((n) => !n.read_at);
  const go = async (n: Notification) => {
    if (!n.read_at) { await store.markNotificationsRead([n.id]); await reload(); }
    if (n.link) router.push(n.link === "/app/performance" ? "/app/grades" : n.link);
  };
  const group = (title: string, items: Notification[]) => items.length > 0 && (
    <section className="mb-5">
      <h2 className="muted mb-2 text-xs font-semibold uppercase tracking-wide">{title}</h2>
      <ul className="card divide-y divide-line overflow-hidden">
        {items.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => go(n)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2 sm:px-5">
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${n.read_at ? "bg-surface-2 text-muted" : "bg-brand-soft text-brand"}`}><Icon name={ICON[n.kind] ?? "bell"} size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${n.read_at ? "" : "font-semibold"}`}>{n.title}</span>
                {n.body && <span className="muted block truncate text-xs">{n.body}</span>}
                <span className="muted block text-xs">{f.dateTime(n.created_at)}</span>
              </span>
              {!n.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label={t("comm.unread")} />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <>
      <PageHeader title={t("nav.notifications")} subtitle={t("comm.notifSub")}
        action={unread.length > 0 ? <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await store.markNotificationsRead(unread.map((n) => n.id)); await reload(); }}>{t("comm.readAll")}</button> : undefined} />
      {list.length === 0 ? <div className="card"><Empty text={t("shell.noNotifications")} icon="bell" /></div> : <>
        {group(t("comm.unread"), unread)}
        {group(t("comm.earlier"), list.filter((n) => n.read_at))}
      </>}
    </>
  );
}
