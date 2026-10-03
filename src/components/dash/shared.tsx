"use client";
// Pieces several dashboards share.
import Link from "next/link";
import { useApp } from "@/lib/data/app-context";
import { assessmentPlace, className, subjectName } from "@/lib/domain/insights";
import type { Assessment } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n";
import { Icon } from "../icons";
import { Empty, ListLink } from "../ui";

export function useFmt() {
  const { locale } = useI18n();
  const tag = locale === "am" ? "am-ET" : "en-GB";
  return {
    day: (iso: string | null | undefined) => (iso ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString(tag, { weekday: "short", day: "numeric", month: "short" }) : "—"),
    dateTime: (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(tag, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"),
  };
}

export function AssessmentList({ items, empty, showClass = true, href = (a: Assessment) => `/app/assignments/${a.id}` }: {
  items: Assessment[]; empty: string; showClass?: boolean; href?: (a: Assessment) => string;
}) {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const f = useFmt();
  if (!items.length) return <Empty text={empty} icon="calendar" />;
  return (
    <ul className="divide-y divide-line">
      {items.map((a) => {
        const p = assessmentPlace(data, a);
        return (
          <li key={a.id}>
            <Link href={href(a)} className="flex items-center gap-3 py-2.5 hover:opacity-80">
              <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${a.kind === "midterm" || a.kind === "final" || a.kind === "quiz" ? "bg-accent-soft text-accent" : "bg-info-soft text-info"}`}>
                <Icon name={a.takes_submissions ? "task" : "exam"} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{a.title}</span>
                <span className="muted block truncate text-xs">{t(`kind.${a.kind}`)} · {subjectName(data, p.subjectId, locale)}{showClass ? ` · ${className(data, p.classId)}` : ""}</span>
              </span>
              <span className="muted shrink-0 text-xs">{f.day(a.due_at ?? a.scheduled_on)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Announcements({ limit = 3 }: { limit?: number }) {
  const { data } = useApp();
  const { t } = useI18n();
  const f = useFmt();
  const list = [...data.announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.published_at.localeCompare(a.published_at)).slice(0, limit);
  if (!list.length) return <Empty text={t("common.empty")} icon="megaphone" />;
  return (
    <ul className="space-y-3">
      {list.map((a) => (
        <li key={a.id} className="rounded-xl bg-surface-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <strong className="text-sm">{a.title}</strong>
            {a.pinned && <span className="badge badge-warn">{t("dash.pinned")}</span>}
          </div>
          <p className="muted mt-1 line-clamp-2 text-sm">{a.body}</p>
          <p className="muted mt-1 text-xs">{f.day(a.published_at)}{a.class_id ? ` · ${className(data, a.class_id)}` : ""}</p>
        </li>
      ))}
    </ul>
  );
}
export const SeeAll = ({ href }: { href: string }) => { const { t } = useI18n(); return <ListLink href={href}>{t("common.seeAll")}</ListLink>; };
