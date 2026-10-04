// Load the demo school into your own Supabase project (or remove it again).
//
//   npm run seed              create the demo logins and write supabase/seed/demo-school.sql
//   npm run seed -- --remove  delete the demo school and its logins
//
// Runs only on your computer. It reads NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY from .env.local (never committed; never put the
// service key in the website). Every person in the demo school is fictional.
// After it runs, paste supabase/seed/demo-school.sql into the Supabase SQL
// Editor and run it once (see docs/deploy.md).
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildWorld } from "../src/lib/demo/seed";
import { schoolId, seedSql } from "./seed/sql";

const OUT = "supabase/seed/demo-school.sql";

function env(): { url: string; key: string } {
  const vars: Record<string, string> = {};
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || vars.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || vars.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local first (see docs/deploy.md).");
    process.exit(1);
  }
  return { url, key };
}

/** Every login this seed made for this school (they carry its id in their metadata). */
async function demoUsers(sb: SupabaseClient, sid: string) {
  const found: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    found.push(...data.users.filter((u) => u.user_metadata?.esp_demo_school === sid));
    if (data.users.length < 200) return found;
  }
}

async function remove(sb: SupabaseClient, sid: string) {
  const { error } = await sb.from("schools").delete().eq("id", sid); // everything in the school goes with it
  if (error) throw error;
  const users = await demoUsers(sb, sid);
  for (const u of users) { const r = await sb.auth.admin.deleteUser(u.id); if (r.error) throw r.error; }
  console.log(`Removed the demo school and its ${users.length} logins.`);
}

async function add(sb: SupabaseClient, sid: string) {
  const world = buildWorld();
  const { data: there, error } = await sb.from("schools").select("id").eq("id", sid).maybeSingle();
  if (error) throw new Error(`${error.message} (have you run the migrations in supabase/migrations?)`);
  if (there) { console.error("The demo school is already loaded. To start again: npm run seed -- --remove"); process.exit(1); }
  if ((await demoUsers(sb, sid)).length) {
    console.error("Demo logins from an earlier run are still there. Clear them first: npm run seed -- --remove");
    process.exit(1);
  }

  // One login per person (profiles belong to logins). The demo accounts get a fresh
  // password each, shown once below; everyone else gets one nobody knows.
  const accounts = new Map(world.accounts.map((a) => [a.profile_id, a]));
  const userIds: Record<string, string> = {};
  const shown: { email: string; role: string; password: string }[] = [];
  try {
    for (const [i, p] of world.profiles.entries()) {
      const acc = accounts.get(p.id);
      const email = acc?.email ?? `person-${String(i + 1).padStart(2, "0")}@demo.addisfuture.example`;
      const password = randomBytes(12).toString("base64url");
      const { data, error: e } = await sb.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { esp_demo_school: sid, full_name: p.full_name },
      });
      if (e) throw new Error(`${email}: ${e.message}`);
      userIds[p.id] = data.user.id;
      if (acc) shown.push({ email, role: acc.label, password });
    }
  } catch (e) {
    console.error(`Couldn't create the logins: ${(e as Error).message}\nUndoing…`);
    for (const id of Object.values(userIds)) await sb.auth.admin.deleteUser(id);
    process.exit(1);
  }

  mkdirSync("supabase/seed", { recursive: true });
  writeFileSync(OUT, seedSql(world, userIds));
  console.log(`\nCreated ${Object.keys(userIds).length} logins and wrote ${OUT}.`);
  console.log("\nNext: open your project's SQL Editor in Supabase, paste that file's contents and run it once.");
  console.log("\nDemo sign-ins (shown only now; keep them private):");
  for (const s of shown) console.log(`  ${s.role.padEnd(24)} ${s.email.padEnd(24)} ${s.password}`);
}

async function main() {
  const { url, key } = env();
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const sid = schoolId(buildWorld());
  if (process.argv.includes("--remove")) await remove(sb, sid);
  else await add(sb, sid);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
