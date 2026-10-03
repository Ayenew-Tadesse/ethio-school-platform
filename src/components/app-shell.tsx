"use client";
// The frame around every signed-in screen: the role's menu (a sidebar on
// larger screens, bottom tabs + "More" on phones), notifications, language
// and the account menu. Demo sessions say so clearly.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { resetDemo } from "@/lib/data/demo-store";
import { LOCALES, useI18n } from "@/lib/i18n";
import { Icon } from "./icons";
import { NAV, isActive } from "./nav";
import { Avatar } from "./ui";

function timeAgo(iso: string, locale: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (s < 3600) return rtf.format(-Math.max(1, Math.round(s / 60)), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}

/** Closes a popover on outside click / Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return ref;
}

function Notifications() {
  const { data, store, reload } = useApp();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const list = [...data.notifications].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30);
  const unread = list.filter((n) => !n.read_at);
  const go = async (id: string, link: string | null) => {
    setOpen(false);
    await store.markNotificationsRead([id]);
    await reload();
    if (link) router.push(link === "/app/performance" ? "/app/grades" : link);
  };
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="relative grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label={`${t("nav.notifications")} (${unread.length})`}
        aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="bell" />
        {unread.length > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-[18px] place-items-center rounded-full bg-bad px-1 text-[11px] font-bold leading-[18px] text-white">{unread.length > 9 ? "9+" : unread.length}</span>}
      </button>
      {open && (
        <div className="card fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-auto p-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96" role="dialog" aria-label={t("nav.notifications")}>
          <div className="flex items-center justify-between px-2 py-1.5">
            <strong className="text-sm">{t("nav.notifications")}</strong>
            {unread.length > 0 && (
              <button type="button" className="text-xs font-semibold text-brand" onClick={async () => { await store.markNotificationsRead(unread.map((n) => n.id)); await reload(); }}>
                {t("shell.markAllRead")}
              </button>
            )}
          </div>
          {list.length === 0 && <p className="muted px-2 py-6 text-center text-sm">{t("shell.noNotifications")}</p>}
          <ul>
            {list.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => go(n.id, n.link)} className="flex w-full gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-surface-2">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-brand"}`} />
                  <span className="min-w-0">
                    <span className={`block text-sm ${n.read_at ? "" : "font-semibold"}`}>{n.title}</span>
                    {n.body && <span className="muted block truncate text-xs">{n.body}</span>}
                    <span className="muted block text-xs">{timeAgo(n.created_at, locale)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link href="/app/notifications" onClick={() => setOpen(false)} className="mt-1 block rounded-lg px-2 py-2 text-center text-sm font-semibold text-brand hover:bg-surface-2">{t("nav.seeAllNotifications")}</Link>
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const { data, store, signOut } = useApp();
  const { t, locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="flex items-center gap-2 rounded-full p-1 hover:bg-surface-2" aria-label={t("shell.account")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar name={data.me.full_name} />
      </button>
      {open && (
        <div className="card absolute right-0 top-12 z-50 w-64 p-2" role="menu">
          <div className="px-2 py-2">
            <div className="truncate text-sm font-semibold">{data.me.full_name}</div>
            <div className="muted text-xs">{t(`role.${data.me.role}`)} · {data.school.name}</div>
          </div>
          <div className="my-1 border-t border-line" />
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("nav.language")}</div>
          {LOCALES.map((l) => (
            <button key={l.code} type="button" role="menuitemradio" aria-checked={locale === l.code} onClick={() => setLocale(l.code)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-surface-2">
              {l.label}{locale === l.code && <span className="text-brand">✓</span>}
            </button>
          ))}
          <div className="my-1 border-t border-line" />
          {store.mode === "demo" && (
            <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-2"
              onClick={() => { resetDemo(); location.reload(); }}>
              <Icon name="calendar" size={18} />{t("auth.resetDemo")}
            </button>
          )}
          <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-2" onClick={signOut}>
            <Icon name="out" size={18} />{store.mode === "demo" ? t("shell.switchAccount") : t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, store } = useApp();
  const { t } = useI18n();
  const path = usePathname();
  const items = NAV[data.me.role];
  // The "More" sheet belongs to the page it was opened on, so it closes when you navigate.
  const [moreAt, setMoreAt] = useState<string | null>(null);
  const more = moreAt === path;
  const setMore = (open: boolean) => setMoreAt(open ? path : null);
  const tabs = items.slice(0, 4), rest = items.slice(4);
  const moreActive = rest.some((i) => isActive(path, i.href));
  const unreadMessages = data.messages.filter((m) => m.recipient_id === data.me.id && !m.read_at).length;
  const label = (key: string, href: string) => (
    <>{t(key)}{href === "/app/messages" && unreadMessages > 0 && <span className="badge badge-bad ml-auto">{unreadMessages}</span>}</>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded focus:bg-surface focus:p-2">{t("shell.skip")}</a>
      {/* Sidebar (large screens) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex" aria-label={t("nav.menu")}>
        <Link href="/app" className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-on-brand"><Icon name="teacher" size={20} /></span>
          <span className="min-w-0 leading-tight"><span className="block truncate font-bold">{data.school.name}</span><span className="muted block text-xs">{t("app.product")}</span></span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5">
            {items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} aria-current={isActive(path, i.href) ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-[.95rem] ${isActive(path, i.href) ? "bg-brand-soft font-semibold text-brand" : "hover:bg-surface-2"}`}>
                  <Icon name={i.icon} />{label(i.key, i.href)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {store.mode === "demo" && <p className="muted border-t border-line px-5 py-3 text-xs">{t("shell.demoNote")}</p>}
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
        <Link href="/app" className="flex min-w-0 items-center gap-2 lg:hidden">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-on-brand"><Icon name="teacher" size={18} /></span>
          <span className="truncate font-bold">{data.school.name}</span>
        </Link>
        <div className="hidden min-w-0 lg:block">
          <span className="muted text-sm">{t(`role.${data.me.role}`)}</span>
        </div>
        {store.mode === "demo" && <span className="badge badge-info ml-1 hidden sm:inline-flex">{t("common.demo")}</span>}
        <div className="ml-auto flex items-center gap-1">
          <Notifications />
          <AccountMenu />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-12">{children}</main>

      {/* Bottom tabs (phones and tablets) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label={t("nav.menu")}>
        <ul className="grid grid-cols-5">
          {tabs.map((i) => (
            <li key={i.href}>
              <Link href={i.href} aria-current={isActive(path, i.href) ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] ${isActive(path, i.href) ? "font-semibold text-brand" : "text-muted"}`}>
                <Icon name={i.icon} size={22} /><span className="max-w-full truncate px-1">{t(i.key)}</span>
                {i.href === "/app/messages" && unreadMessages > 0 && <span className="absolute right-[calc(50%-18px)] top-2 size-2.5 rounded-full bg-bad" />}
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setMore(true)} aria-expanded={more}
              className={`flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[11px] ${moreActive ? "font-semibold text-brand" : "text-muted"}`}>
              <Icon name="menu" size={22} /><span>{t("nav.more")}</span>
            </button>
          </li>
        </ul>
      </nav>
      {more && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("nav.more")}>
          <button type="button" className="absolute inset-0 bg-black/40" aria-label={t("common.close")} onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-2 flex items-center justify-between">
              <strong>{t("nav.more")}</strong>
              <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-surface-2" onClick={() => setMore(false)} aria-label={t("common.close")}><Icon name="x" /></button>
            </div>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {rest.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className={`flex h-20 flex-col items-center justify-center gap-1 rounded-xl text-xs ${isActive(path, i.href) ? "bg-brand-soft font-semibold text-brand" : "bg-surface-2"}`}>
                    <Icon name={i.icon} size={22} /><span className="px-1 text-center">{t(i.key)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
