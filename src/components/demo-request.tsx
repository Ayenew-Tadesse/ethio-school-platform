"use client";
// "Request a school demo": opens the visitor's email app with the details
// filled in, addressed to NEXT_PUBLIC_DEMO_REQUEST_EMAIL. Nothing is stored.
import Link from "next/link";
import { useState } from "react";

const TO = process.env.NEXT_PUBLIC_DEMO_REQUEST_EMAIL ?? "";

export function DemoRequest() {
  const [f, setF] = useState({ name: "", school: "", city: "", students: "", phone: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const ready = f.name.trim() && f.school.trim();
  const body = `Name: ${f.name}\nSchool: ${f.school}\nCity: ${f.city}\nNumber of students: ${f.students}\nPhone: ${f.phone}\n\nWe would like a demo of the School Platform.`;
  const href = `mailto:${TO}?subject=${encodeURIComponent(`School demo request: ${f.school}`)}&body=${encodeURIComponent(body)}`;
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (ready && TO) location.href = href; }}>
      <div><label className="label" htmlFor="rq-name">Your name</label><input id="rq-name" className="input" value={f.name} onChange={set("name")} required autoComplete="name" /></div>
      <div><label className="label" htmlFor="rq-school">School name</label><input id="rq-school" className="input" value={f.school} onChange={set("school")} required /></div>
      <div><label className="label" htmlFor="rq-city">City</label><input id="rq-city" className="input" value={f.city} onChange={set("city")} placeholder="e.g. Addis Ababa" /></div>
      <div>
        <label className="label" htmlFor="rq-size">Number of students</label>
        <select id="rq-size" className="input" value={f.students} onChange={set("students")}>
          <option value="">Choose…</option><option>Under 300</option><option>300–800</option><option>800–2,000</option><option>Over 2,000</option>
        </select>
      </div>
      <div className="sm:col-span-2"><label className="label" htmlFor="rq-phone">Phone (optional)</label><input id="rq-phone" className="input" type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" /></div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        {TO ? <button type="submit" className="btn btn-primary" disabled={!ready}>Request a School Demo</button>
          : <Link href="/login" className="btn btn-primary">Explore the demo now</Link>}
        <p className="muted text-xs">{TO ? "Opens your email app with these details filled in." : "Demo requests open once the school's contact address is set up. Meanwhile, the full demo is one tap away."}</p>
      </div>
    </form>
  );
}
