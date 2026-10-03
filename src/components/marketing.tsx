// Header and footer for the public pages (landing, why schools choose us).
import Link from "next/link";
import { Icon } from "./icons";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-brand text-on-brand"><Icon name="teacher" size={18} /></span>
          School Platform
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm" aria-label="Site">
          <Link href="/#features" className="hidden rounded-lg px-3 py-2 hover:bg-surface-2 sm:block">Features</Link>
          <Link href="/why" className="hidden rounded-lg px-3 py-2 hover:bg-surface-2 sm:block">Why schools choose it</Link>
          <Link href="/login" className="rounded-lg px-3 py-2 font-semibold hover:bg-surface-2">Sign in</Link>
          <Link href="/#request" className="btn btn-primary btn-sm">Request a demo</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>School Platform · built for Ethiopian schools · English and አማርኛ</p>
        <nav className="flex gap-4" aria-label="Footer">
          <Link href="/why" className="hover:text-text">Why schools choose it</Link>
          <Link href="/login" className="hover:text-text">Explore the demo</Link>
          <Link href="/#request" className="hover:text-text">Request a demo</Link>
        </nav>
      </div>
    </footer>
  );
}
