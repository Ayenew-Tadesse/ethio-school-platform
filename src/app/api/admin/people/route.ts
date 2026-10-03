// Adding a person (and their login) to a school. Runs only on the server: it
// uses the service-role key, so it first checks that the caller is signed in
// as an administrator of that school with permission to manage people. The
// school and role go into app metadata, which only the server can set.
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { NewPerson } from "@/lib/data/store";

const fail = (error: string, status = 400) => Response.json({ error }, { status });
const tempPassword = () => randomBytes(9).toString("base64url"); // 12 characters, shown once to the admin

export async function POST(req: Request) {
  let sb;
  try { sb = supabaseAdmin(); } catch (e) { return fail((e as Error).message, 501); }
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return fail("Please sign in.", 401);
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return fail("Please sign in.", 401);
  const { data: me } = await sb.from("profiles").select("school_id, role, is_owner, admin_permissions").eq("id", user.id).single();
  const allowed = me && me.role === "admin" && (me.is_owner || (me.admin_permissions?.manage_people ?? true) !== false);
  if (!allowed) return fail("Only a school administrator can add people.", 403);

  const p = (await req.json().catch(() => null)) as NewPerson | null;
  const name = p?.full_name?.trim();
  if (!p || !name || !["admin", "teacher", "student", "parent"].includes(p.role)) return fail("Add the person's name and role.");
  if (p.role === "admin" && !me.is_owner) return fail("Only the school owner can add administrators.", 403);
  const email = p.email?.trim().toLowerCase() || null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("That email address doesn't look right.");
  const school = me.school_id as string;

  // Classes and children must belong to this school.
  if (p.class_id) {
    const { data } = await sb.from("classes").select("id").eq("id", p.class_id).eq("school_id", school).maybeSingle();
    if (!data) return fail("That class isn't in your school.");
  }
  if (p.child_ids?.length) {
    const { count } = await sb.from("students").select("id", { count: "exact", head: true }).in("id", p.child_ids).eq("school_id", school);
    if (count !== p.child_ids.length) return fail("One of the children isn't in your school.");
  }

  let profileId: string | null = null, password: string | undefined;
  if (email) {
    password = tempPassword();
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { school_id: school, role: p.role, full_name: name } });
    if (error) return fail(/already/i.test(error.message) ? "Someone with that email already has a login." : error.message);
    profileId = data.user.id;
  }
  const base = { school_id: school, profile_id: profileId, full_name: name };
  let id = profileId ?? "";
  const insert = async (table: string, row: Record<string, unknown>) => {
    const { data, error } = await sb.from(table).insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return data.id as string;
  };
  try {
    if (p.role === "teacher") id = await insert("teachers", { ...base, email, phone: p.phone });
    if (p.role === "student") id = await insert("students", { ...base, class_id: p.class_id ?? null, student_no: p.student_no ?? null, gender: p.gender ?? null });
    if (p.role === "parent") {
      id = await insert("parents", { ...base, email, phone: p.phone });
      if (p.child_ids?.length) {
        const { error } = await sb.from("parent_students").insert(p.child_ids.map((c) => ({ parent_id: id, student_id: c, relationship: "guardian" })));
        if (error) throw new Error(error.message);
      }
    }
  } catch (e) {
    if (profileId) await sb.auth.admin.deleteUser(profileId); // don't leave a login without a record
    return fail((e as Error).message);
  }
  return Response.json({ id, tempPassword: password });
}
