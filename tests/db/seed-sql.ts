// For the database tests: the demo school's SQL, with stand-in logins (the
// test database has no Supabase Auth). Prints the SQL to stdout.
import { buildWorld } from "../../src/lib/demo/seed";
import { seedSql, uuidFor } from "../../scripts/seed/sql";

const world = buildWorld();
const userIds = Object.fromEntries(world.profiles.map((p) => [p.id, uuidFor("login/" + p.id)]));
const users = world.profiles.map((p, i) => `('${userIds[p.id]}', 'person${i}@demo.example')`).join(",\n  ");
// The demo logins, so seed.check.sql can act as them.
const logins = world.accounts.map((a) => `('${a.email}', '${userIds[a.profile_id]}')`).join(", ");
process.stdout.write(`insert into auth.users (id, email) values\n  ${users};\n` + seedSql(world, userIds)
  + `create schema test;\ncreate table test.logins (email text, id uuid);\ninsert into test.logins values ${logins};\n`);
