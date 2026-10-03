import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/marketing";

export const metadata: Metadata = { title: "Why Schools Choose the Platform" };

const REASONS: { icon: IconName; title: string; text: string }[] = [
  { icon: "child", title: "Parents see progress during the term", text: "Attendance, homework and grades appear as they happen, so a family can help before a small problem becomes a failed term." },
  { icon: "alert", title: "Early academic attention", text: "Students whose results fall below the school's threshold, or drop sharply, are listed for the class teacher and leadership. These are academic signals only, never diagnoses." },
  { icon: "task", title: "Less paperwork for teachers", text: "Attendance on a phone, homework posted once for the whole class, grades calculated with the school's own weights." },
  { icon: "chart", title: "Leaders see the whole school", text: "Compare classes, follow attendance trends and see assignment completion without collecting mark sheets." },
  { icon: "shield", title: "Records stay private", text: "Access rules are enforced in the database: students, parents and teachers can only reach what their role allows." },
  { icon: "message", title: "Communication the school controls", text: "Announcements and messages run through the school, with rules the administrator sets, instead of personal phone numbers." },
  { icon: "globe", title: "Made for local use", text: "English and Amharic, Ethiopian academic years, and screens designed first for affordable phones on slow connections." },
  { icon: "settings", title: "Configured, not rebuilt", text: "Grade levels, sections, subjects, terms and grading weights are set by each school to match how it already works." },
];

export default function Why() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Why Schools Choose the Platform</h1>
        <p className="muted mt-4 max-w-2xl text-lg">A school runs on many small daily tasks. When they live in one place, everyone (leaders, teachers, students and parents) works from the same, up-to-date picture.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {REASONS.map((r) => (
            <div key={r.title} className="card flex gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon name={r.icon} /></span>
              <div><h2 className="font-semibold">{r.title}</h2><p className="muted mt-1 text-sm">{r.text}</p></div>
            </div>
          ))}
        </div>
        <div className="card mt-10 flex flex-col items-start gap-4 bg-brand p-6 text-on-brand sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div><h2 className="text-xl font-bold">See it for yourself</h2><p className="mt-1 opacity-85">Sign in as an administrator, teacher, student or parent in the demo school.</p></div>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="btn bg-white text-brand-strong hover:bg-white/90">Explore Platform</Link>
            <Link href="/#request" className="btn border-white/40 text-on-brand hover:bg-white/10">Request a School Demo</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
