import type { Role } from "@/lib/domain/types";
import type { IconName } from "./icons";

export type NavItem = { href: string; key: string; icon: IconName };
const I = (href: string, key: string, icon: IconName): NavItem => ({ href, key, icon });

// Each role's menu (the first four are the phone's bottom tabs; the rest are under "More").
export const NAV: Record<Role, NavItem[]> = {
  admin: [
    I("/app", "nav.dashboard", "home"), I("/app/students", "nav.students", "users"), I("/app/attendance", "nav.attendance", "check"),
    I("/app/reports", "nav.reports", "chart"), I("/app/teachers", "nav.teachers", "teacher"), I("/app/classes", "nav.classes", "classes"),
    I("/app/subjects", "nav.subjects", "book"), I("/app/exams", "nav.exams", "exam"), I("/app/assignments", "nav.assignments", "task"),
    I("/app/library", "nav.library", "library"), I("/app/messages", "nav.messages", "message"), I("/app/announcements", "nav.announcements", "megaphone"),
    I("/app/settings", "nav.settings", "settings"),
  ],
  teacher: [
    I("/app", "nav.dashboard", "home"), I("/app/attendance", "nav.attendance", "check"), I("/app/assignments", "nav.assignments", "task"),
    I("/app/grades", "nav.grades", "grade"), I("/app/classes", "nav.myClasses", "classes"), I("/app/exams", "nav.exams", "exam"),
    I("/app/library", "nav.library", "library"), I("/app/messages", "nav.messages", "message"), I("/app/announcements", "nav.announcements", "megaphone"),
  ],
  student: [
    I("/app", "nav.dashboard", "home"), I("/app/assignments", "nav.assignments", "task"), I("/app/grades", "nav.grades", "grade"),
    I("/app/library", "nav.library", "library"), I("/app/exams", "nav.exams", "exam"), I("/app/messages", "nav.messages", "message"),
    I("/app/announcements", "nav.announcements", "megaphone"),
  ],
  parent: [
    I("/app", "nav.dashboard", "home"), I("/app/children", "nav.myChildren", "child"), I("/app/grades", "nav.grades", "grade"),
    I("/app/messages", "nav.messages", "message"), I("/app/attendance", "nav.attendance", "check"), I("/app/assignments", "nav.assignments", "task"),
    I("/app/announcements", "nav.announcements", "megaphone"),
  ],
};
export const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path === href || path.startsWith(href + "/"));
