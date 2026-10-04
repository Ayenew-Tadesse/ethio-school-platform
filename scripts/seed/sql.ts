// The demo school (src/lib/demo/seed.ts) as SQL for a real Supabase project.
// Every person in it needs a login (profiles belong to auth users), so the
// seed script creates those first and passes their ids in; every other id
// becomes a stable UUID made from the demo's own id, so loading twice is
// refused and removing finds the same rows. The database's automatic rules
// (stamping hand-ins as "now", sending notifications) are paused while the
// rows go in, so the demo keeps its history, then switched back on.
import { createHash } from "node:crypto";
import type { World } from "../../src/lib/demo/seed";

/** The tables in the order they can be filled (each only refers to earlier ones). */
export const TABLES: [table: string, key: keyof World][] = [
  ["schools", "school"], ["profiles", "profiles"], ["academic_years", "years"], ["terms", "terms"], ["grade_levels", "gradeLevels"],
  ["subjects", "subjects"], ["grading_components", "weights"], ["teachers", "teachers"], ["classes", "classes"], ["students", "students"],
  ["parents", "parents"], ["parent_students", "parentStudents"], ["class_subjects", "classSubjects"], ["attendance", "attendance"],
  ["assessments", "assessments"], ["assessment_files", "assessmentFiles"], ["submissions", "submissions"], ["scores", "scores"],
  ["learning_resources", "resources"], ["announcements", "announcements"], ["messages", "messages"], ["notifications", "notifications"],
];

// The demo's ids look like UUIDs but use letters that aren't hex ("pr000000-0000-4000-8000-…").
const DEMO_ID = /^[0-9a-z]{8}-0000-4000-8000-\d{12}$/;

/** A stable UUID (version 5 style) for a demo id. */
export function uuidFor(demoId: string): string {
  const h = createHash("sha1").update("ethio-school-platform/demo/" + demoId).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Replace every demo id in a value (deeply) with its real id. */
function remap(v: unknown, ids: (id: string) => string): unknown {
  if (typeof v === "string") return DEMO_ID.test(v) ? ids(v) : v;
  if (Array.isArray(v)) return v.map((x) => remap(x, ids));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, remap(x, ids)]));
  return v;
}

/** Each table's rows with real ids: logins (profile ids) from `userIds`, the rest stable UUIDs. */
export function seedRows(world: World, userIds: Record<string, string>) {
  const ids = (id: string) => userIds[id] ?? uuidFor(id);
  return TABLES.map(([table, key]) => {
    const raw = world[key];
    const rows = (Array.isArray(raw) ? raw : [raw]) as Record<string, unknown>[];
    return { table, rows: rows.map((r) => remap(r, ids) as Record<string, unknown>) };
  });
}

/** The school's id in the real project (for "already loaded?" and removing). */
export const schoolId = (world: World) => uuidFor(world.school.id);

/** One transaction: refuse if the demo school is there, pause the automatic rules, insert, switch them back on. */
export function seedSql(world: World, userIds: Record<string, string>): string {
  const sid = schoolId(world);
  const parts = seedRows(world, userIds).filter((t) => t.rows.length).map(({ table, rows }) => {
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const json = JSON.stringify(rows);
    if (json.includes("$seed$")) throw new Error("The demo data can't contain $seed$.");
    const list = cols.map((c) => `"${c}"`).join(", ");
    return `insert into public.${table} (${list})\n  select ${list} from json_populate_recordset(null::public.${table}, $seed$${json}$seed$::json);`;
  });
  const tables = TABLES.map(([t]) => `public.${t}`);
  return [
    "-- The demo school \"" + world.school.name.replace(/[^\w ]/g, "") + "\" (fictional people), made by `npm run seed`.",
    "-- Run it once in the Supabase SQL Editor. Remove it again with `npm run seed -- --remove`.",
    "begin;",
    `do $$ begin if exists (select 1 from public.schools where id = '${sid}') then raise exception 'The demo school is already loaded. Remove it first: npm run seed -- --remove'; end if; end $$;`,
    ...tables.map((t) => `alter table ${t} disable trigger user;`),
    ...parts,
    ...tables.map((t) => `alter table ${t} enable trigger user;`),
    "commit;",
    "",
  ].join("\n");
}
