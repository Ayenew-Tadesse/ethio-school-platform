// The guided demo tour: ten stops across the four roles. Each stop says which
// demo account to be, which page to show and what to point at (a CSS
// selector; the pages mark their stops with data-tour="…"). The text is in
// the dictionaries under tour.<key>.title / tour.<key>.body. Where you are in
// the tour lives in sessionStorage, so it survives the page reload that
// switching demo accounts needs, and ends when the tab closes.
import type { Role } from "@/lib/domain/types";

export type TourStop = { role: Role; path: string; target: string; key: string };

export const TOUR: TourStop[] = [
  { role: "admin", path: "/app", target: '[data-tour="school-stats"]', key: "schoolStats" },
  { role: "admin", path: "/app/teachers", target: '[data-tour="add-teacher"]', key: "addTeacher" },
  { role: "admin", path: "/app/reports", target: "#main .card", key: "reports" },
  { role: "teacher", path: "/app/attendance", target: '[data-tour="roster"]', key: "attendance" },
  { role: "teacher", path: "/app/assignments/new", target: "#main form", key: "newAssignment" },
  { role: "teacher", path: "/app", target: '[data-tour="to-grade"]', key: "grading" },
  { role: "student", path: "/app/assignments", target: "#main .card", key: "homework" },
  { role: "student", path: "/app/grades", target: "#main .card", key: "grades" },
  { role: "parent", path: "/app", target: '[data-tour="child-attendance"]', key: "child" },
  { role: "parent", path: "/app/messages", target: '[data-tour="new-message"]', key: "message" },
];

/** The demo account each role uses on the tour. */
export const TOUR_ACCOUNTS: Record<Role, string> = {
  admin: "admin@example.com", teacher: "teacher@example.com", student: "student@example.com", parent: "parent@example.com",
};

const KEY = "esp_tour";
const listeners = new Set<() => void>();
export const subscribeTour = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

/** The stop the tour is on (0–9), or null when there's no tour. */
export function tourStop(): number | null {
  try {
    const v = sessionStorage.getItem(KEY);
    const n = v === null ? NaN : Number(v);
    return Number.isInteger(n) && n >= 0 && n < TOUR.length ? n : null;
  } catch { return null; }
}
/** Go to a stop (null ends the tour). */
export function setTourStop(n: number | null) {
  try { if (n === null || n < 0 || n >= TOUR.length) sessionStorage.removeItem(KEY); else sessionStorage.setItem(KEY, String(n)); } catch { /* no tour without storage */ }
  listeners.forEach((f) => f());
}
