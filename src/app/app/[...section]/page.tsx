"use client";
// Sections that are still being built show what's coming instead of a dead end.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/components/nav";
import { useApp } from "@/lib/data/app-context";
import { useI18n } from "@/lib/i18n";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui";

export default function Section() {
  const { data } = useApp();
  const { t } = useI18n();
  const path = usePathname();
  const item = NAV[data.me.role].find((i) => i.href !== "/app" && (path === i.href || path.startsWith(i.href + "/")));
  if (!item) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="font-semibold">{t("shell.notFound")}</p>
        <Link href="/app" className="btn btn-primary mt-4">{t("nav.dashboard")}</Link>
      </div>
    );
  }
  return (
    <>
      <PageHeader title={t(item.key)} />
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Icon name={item.icon} size={28} /></span>
        <p className="max-w-md font-semibold">{t("shell.comingTitle")}</p>
        <p className="muted max-w-md text-sm">{t("shell.comingBody")}</p>
        <Link href="/app" className="btn btn-ghost mt-2">{t("common.back")}</Link>
      </div>
    </>
  );
}
