// Small building blocks shared by every screen.
import Link from "next/link";
import { Icon, type IconName } from "./icons";

export const pct = (v: number | null | undefined, digits = 0) => (v == null ? "—" : `${v.toFixed(digits)}%`);

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">{title}</h1>
        {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card min-w-0 p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, icon, tone = "brand" }: { label: string; value: string; hint?: string; icon: IconName; tone?: "brand" | "accent" | "info" | "warn" }) {
  const tones = { brand: "bg-brand-soft text-brand", accent: "bg-accent-soft text-accent", info: "bg-info-soft text-info", warn: "bg-warn-soft text-warn" };
  return (
    <div className="card flex min-w-0 flex-col gap-2 p-3.5 sm:p-4">
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon name={icon} size={18} /></span>
      <div className="min-w-0">
        <div className="text-[1.45rem] font-bold leading-tight tabular-nums">{value}</div>
        <div className="muted text-sm leading-snug">{label}</div>
        {hint && <div className="muted text-xs">{hint}</div>}
      </div>
    </div>
  );
}

/** A horizontal bar 0–100 (with an optional comparison marker). */
export function Meter({ value, compare, label }: { value: number | null; compare?: number | null; label?: string }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const tone = value == null ? "bg-line" : value >= 75 ? "bg-good" : value >= 50 ? "bg-accent" : "bg-bad";
  return (
    <div className="relative h-2.5 w-full rounded-full bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined} aria-label={label}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${v}%` }} />
      {compare != null && <div className="absolute -top-1 h-[18px] w-0.5 rounded bg-text/70" style={{ left: `calc(${Math.max(0, Math.min(100, compare))}% - 1px)` }} title={`${compare.toFixed(0)}%`} />}
    </div>
  );
}

/** Columns for a series (e.g. attendance per day), 0–100. */
export function Columns({ data, label }: { data: { key: string; value: number; title: string }[]; label: string }) {
  if (!data.length) return <Empty text="—" />;
  return (
    <div className="flex h-28 items-end gap-[3px]" role="img" aria-label={label}>
      {data.map((d) => (
        <div key={d.key} className="flex h-full flex-1 items-end" title={d.title}>
          <div className={`w-full rounded-t ${d.value >= 90 ? "bg-brand" : d.value >= 75 ? "bg-accent" : "bg-bad"}`} style={{ height: `${Math.max(4, d.value)}%` }} />
        </div>
      ))}
    </div>
  );
}

export function Empty({ text, icon = "book" }: { text: string; icon?: IconName }) {
  return (
    <div className="muted flex flex-col items-center gap-2 py-6 text-center text-sm">
      <Icon name={icon} size={28} className="opacity-60" />
      <p>{text}</p>
    </div>
  );
}

export function ListLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="text-sm font-semibold text-brand hover:underline">{children}</Link>;
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function scoreTone(v: number | null | undefined, pass = 50) {
  if (v == null) return "badge-muted";
  return v >= 75 ? "badge-good" : v >= pass ? "badge-warn" : "badge-bad";
}

export function Spinner() {
  return <span className="inline-block size-5 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden="true" />;
}
