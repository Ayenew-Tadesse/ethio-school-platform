"use client";
// Sign in. Demo accounts (fictional school) work in any browser with no setup;
// real accounts sign in through Supabase when a project is connected.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Spinner } from "@/components/ui";
import { loadWorld, resetDemo, setDemoAccount } from "@/lib/data/demo-store";
import { DEMO_PASSWORD } from "@/lib/demo/seed";
import type { Role } from "@/lib/domain/types";
import { LOCALES, useI18n } from "@/lib/i18n";
import { supabaseConfigured } from "@/lib/supabase/config";

const DEMO: { email: string; role: Role; icon: IconName }[] = [
  { email: "admin@example.com", role: "admin", icon: "settings" },
  { email: "teacher@example.com", role: "teacher", icon: "teacher" },
  { email: "student@example.com", role: "student", icon: "book" },
  { email: "parent@example.com", role: "parent", icon: "child" },
];

export default function Login() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const real = supabaseConfigured();

  const enterDemo = (addr: string) => {
    setBusy(addr);
    const acc = loadWorld().accounts.find((a) => a.email === addr);
    if (!acc) { setBusy(null); setError(t("auth.wrong")); return; }
    setDemoAccount(acc.profile_id);
    router.push("/app");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const addr = email.trim().toLowerCase();
    const demo = loadWorld().accounts.find((a) => a.email === addr);
    if (demo && password === DEMO_PASSWORD) return enterDemo(addr);
    if (!real) { setError(demo ? t("auth.wrong") : t("auth.demoOnly")); return; }
    setBusy("form");
    const { supabase } = await import("@/lib/supabase/client");
    const { error: err } = await supabase().auth.signInWithPassword({ email: addr, password });
    if (err) { setBusy(null); setError(/fetch|network/i.test(err.message) ? t("auth.offline") : t("auth.wrong")); return; }
    setDemoAccount(null);
    router.push("/app");
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand p-10 text-on-brand lg:flex">
        <Link href="/" className="flex items-center gap-2.5 font-bold"><span className="grid size-9 place-items-center rounded-xl bg-white/15"><Icon name="teacher" /></span>{t("app.product")}</Link>
        <div>
          <p className="text-3xl font-bold leading-tight">{t("app.tagline")}</p>
          <p className="mt-3 max-w-md opacity-85">{t("auth.sidePitch")}</p>
        </div>
        <p className="text-sm opacity-75">{t("auth.demoHint")}</p>
      </aside>

      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold lg:invisible"><span className="grid size-8 place-items-center rounded-lg bg-brand text-on-brand"><Icon name="teacher" size={18} /></span>{t("app.product")}</Link>
          <div className="flex gap-1" role="group" aria-label={t("nav.language")}>
            {LOCALES.map((l) => (
              <button key={l.code} type="button" onClick={() => setLocale(l.code)} aria-pressed={locale === l.code}
                className={`rounded-full px-3 py-1.5 text-sm ${locale === l.code ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:bg-surface-2"}`}>{l.label}</button>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md flex-1 py-8">
          <h1 className="text-2xl font-bold">{t("auth.demoTitle")}</h1>
          <p className="muted mt-1 text-sm">{t("auth.demoHint")}</p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {DEMO.map((d) => (
              <li key={d.email}>
                <button type="button" onClick={() => enterDemo(d.email)} disabled={!!busy}
                  className="card flex w-full items-center gap-3 p-3.5 text-left transition hover:border-brand disabled:opacity-60" data-demo={d.role}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{busy === d.email ? <Spinner /> : <Icon name={d.icon} />}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{t("auth.demoAs", { role: t(`role.${d.role}`) })}</span>
                    <span className="muted block truncate text-xs">{d.email}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />{t("auth.orSignIn")}<span className="h-px flex-1 bg-line" /></div>

          <form onSubmit={submit} className="space-y-3" noValidate>
            <div>
              <label htmlFor="email" className="label">{t("auth.email")}</label>
              <input id="email" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="password" className="label">{t("auth.password")}</label>
              <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={!!busy || !email || !password}>{busy === "form" ? t("auth.signingIn") : t("auth.signIn")}</button>
            <p className="muted text-center text-xs">{real ? t("auth.noAccount") : t("auth.demoPasswordHint", { password: DEMO_PASSWORD })}</p>
          </form>
          <p className="mt-6 text-center">
            <button type="button" className="text-xs text-muted underline" onClick={() => { resetDemo(); setError(null); }}>{t("auth.resetDemo")}</button>
          </p>
        </div>
      </main>
    </div>
  );
}
