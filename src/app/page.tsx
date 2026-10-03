import Link from "next/link";
import { DemoRequest } from "@/components/demo-request";
import { Icon, type IconName } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/marketing";

const ROLES: { who: string; icon: IconName; points: string[] }[] = [
  { who: "School leaders", icon: "chart", points: ["Attendance, completion and performance for every class at a glance", "Students requiring academic attention, flagged early", "Classes, subjects, teachers and the academic year in one place"] },
  { who: "Teachers", icon: "teacher", points: ["Take attendance in under a minute on a phone", "Post homework with files; collect and grade submissions", "Weighted grades worked out automatically"] },
  { who: "Students", icon: "book", points: ["Every assignment and deadline in one list", "Submit work and see grades and feedback", "A digital library by grade and subject"] },
  { who: "Parents", icon: "child", points: ["Attendance, homework and grades for each child", "Notified about absences and new grades", "Message teachers, within the rules the school sets"] },
];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "check", title: "Attendance", text: "Present, absent, late or excused per class and day, with parents told about absences." },
  { icon: "task", title: "Assignments & submissions", text: "Homework and assignments with files and due dates; late work is marked automatically." },
  { icon: "grade", title: "Grading", text: "Weights the school sets (e.g. homework 10%, final 30%) turn scores into one clear result." },
  { icon: "chart", title: "Performance analytics", text: "Subject results against the class average, trends, and early attention signals." },
  { icon: "library", title: "Digital library", text: "Notes, worksheets, past exams and videos, organised by grade and subject." },
  { icon: "megaphone", title: "Announcements", text: "To the whole school, one class, all parents or all teachers." },
  { icon: "message", title: "School-controlled messaging", text: "The school decides who may message whom. No personal phone numbers needed." },
  { icon: "globe", title: "English and አማርኛ", text: "Every screen is ready for Amharic, and for more languages later." },
];

function Preview() {
  // A small, static picture of the admin dashboard (decorative).
  const bars = [92, 88, 95, 90, 84, 93, 96, 89, 91, 94, 87, 95];
  return (
    <div className="card relative overflow-hidden p-4 sm:p-5" aria-hidden="true">
      <div className="mb-3 flex items-center justify-between"><strong className="text-sm">Addis Future Academy</strong><span className="badge badge-info">Demo</span></div>
      <div className="grid grid-cols-3 gap-2">
        {[["30", "Students"], ["92%", "Attendance"], ["74%", "Average"]].map(([v, l]) => (
          <div key={l} className="rounded-xl bg-surface-2 p-3"><div className="text-lg font-bold">{v}</div><div className="muted text-xs">{l}</div></div>
        ))}
      </div>
      <div className="mt-4 flex h-24 items-end gap-1">{bars.map((b, i) => <div key={i} className="flex-1 rounded-t bg-brand" style={{ height: `${b - 60}%`, opacity: 0.55 + i / 30 }} />)}</div>
      <div className="mt-4 space-y-2">
        {[["Grade 8A", 78], ["Grade 8B", 71], ["Grade 10A", 66]].map(([c, v]) => (
          <div key={c} className="text-xs"><div className="mb-1 flex justify-between"><span className="font-semibold">{c}</span><span className="muted">{v}%</span></div>
            <div className="h-2 rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} /></div></div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="badge badge-good">For primary and secondary schools in Ethiopia</span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">One Platform for the Entire School</h1>
            <p className="muted mt-4 max-w-xl text-lg">Attendance, assignments, grades, a digital library and parent communication, together in one place. Leaders see the whole school, teachers save time, and parents finally see how their children are doing.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#request" className="btn btn-primary">Request a School Demo</Link>
              <Link href="/login" className="btn btn-ghost">Explore Platform <Icon name="arrow" size={18} /></Link>
            </div>
            <p className="muted mt-4 text-sm">Works on any phone with a browser. The demo needs no sign-up.</p>
          </div>
          <Preview />
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">Where school days lose time today</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ["Paper and spreadsheets", "Attendance books, mark sheets and files in different places make it slow to know how a class is really doing."],
                ["Parents find out late", "Many parents only learn about missed homework or falling grades at the end of the term."],
                ["Scattered communication", "Notices and messages spread across personal phones and group chats the school does not control."],
              ].map(([h, p]) => (
                <div key={h} className="rounded-2xl bg-surface-2 p-5"><h3 className="font-semibold">{h}</h3><p className="muted mt-1.5 text-sm">{p}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">One view for everyone</h2>
          <p className="muted mt-2 max-w-2xl">Each person sees exactly what they need, and nothing they shouldn&apos;t.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <div key={r.who} className="card p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><Icon name={r.icon} /></span>
                <h3 className="mt-3 font-semibold">{r.who}</h3>
                <ul className="muted mt-2 space-y-1.5 text-sm">{r.points.map((p) => <li key={p} className="flex gap-2"><span className="text-brand">✓</span>{p}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">Everything a school day needs</h2>
            <div className="mt-6 grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Icon name={f.icon} /></span>
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="muted mt-1 text-sm">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">How a homework day works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            {["The teacher posts homework from a phone", "Students and parents are notified", "Students submit; late work is marked", "The teacher grades; the parent sees the result"].map((s, i) => (
              <li key={s} className="card p-5"><span className="grid size-8 place-items-center rounded-full bg-brand text-sm font-bold text-on-brand">{i + 1}</span><p className="mt-3 text-sm font-semibold">{s}</p></li>
            ))}
          </ol>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-2">
            <div>
              <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><Icon name="shield" /></span>
              <h2 className="mt-3 text-2xl font-bold">Private by design</h2>
              <p className="muted mt-2">Student records are protected in the database itself, not just hidden on screen.</p>
            </div>
            <ul className="space-y-3 text-sm">
              {["A student sees only their own records.", "A parent sees only the children linked to their account.", "A teacher sees only the classes they teach.", "Submitted work is stored privately, never on a public link.", "The school decides who can message whom."].map((x) => (
                <li key={x} className="flex gap-3 rounded-xl bg-surface-2 p-3"><span className="text-brand">✓</span>{x}</li>
              ))}
            </ul>
          </div>
        </section>

        <section id="request" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">See it with your school&apos;s eyes</h2>
          <p className="muted mt-2">Tell us a little about your school and we&apos;ll set up a walkthrough. Or <Link href="/login" className="font-semibold text-brand underline">explore the demo</Link> right now.</p>
          <div className="card mt-6 p-5 sm:p-6"><DemoRequest /></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
