"use client";
import Link from "next/link";
import { useApp } from "@/lib/data/app-context";
import { useI18n } from "@/lib/i18n";

/** Shows children only to teachers and administrators. */
export function TeacherOnly({ children }: { children: React.ReactNode }) {
  const { data } = useApp();
  const { t } = useI18n();
  if (data.me.role === "teacher" || data.me.role === "admin") return <>{children}</>;
  return (
    <div className="card mx-auto max-w-md p-6 text-center">
      <p className="font-semibold">{t("shell.notFound")}</p>
      <Link href="/app" className="btn btn-primary mt-4">{t("nav.dashboard")}</Link>
    </div>
  );
}
