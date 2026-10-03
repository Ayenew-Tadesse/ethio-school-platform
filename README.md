# School Platform (working name)

A school management and learning platform for Ethiopian primary and secondary
schools: attendance, assignments and submissions, weighted grading, performance
analytics, a digital library, announcements, school-controlled messaging and
notifications, for administrators, teachers, students and parents. English and
አማርኛ, built phone-first.

The demo school, **Addis Future Academy**, is entirely fictional.

## Try it

```bash
npm install
npm run dev          # http://localhost:3000
```

With no Supabase settings the site runs as a **demo in your browser**: open
**Explore Platform** and pick a role, or sign in with:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | admin@example.com | `Demo@2026` |
| Teacher | teacher@example.com | `Demo@2026` |
| Student | student@example.com | `Demo@2026` |
| Parent | parent@example.com | `Demo@2026` |

Demo changes stay in that browser; **Reset demo data** starts over.

## How it fits together

- **Next.js (App Router) + TypeScript + Tailwind.** Signed-in screens live under `/app`.
- **One `Store` interface, two implementations** (`src/lib/data`):
  - `SupabaseStore`: the real thing. Uses only the public anon key; **Row Level
    Security** in Postgres decides what each person may read or change.
  - `DemoStore`: the demo school in the browser, applying the same rules in code
    (`visibility.ts`, kept in step with the database by tests).
- **Database:** `supabase/migrations`, covering the schema, security helpers,
  RLS policies, triggers (late work, notifications, score limits) and private
  file buckets.
- **Creating logins:** `POST /api/admin/people` runs on the server with the
  service-role key, after checking the caller is an administrator of that school.

## Security model (summary)

- A student sees only their own records; a parent only their linked children;
  a teacher only the classes they teach; administrators only their own school.
- Roles come from server-set app metadata, never from what a user submits.
- Submitted work is in private storage, opened through short-lived signed links.
- The service-role key is server-only; the browser only ever gets the anon key.

## Tests

```bash
npm test             # unit tests (grading, insights, demo rules, i18n)
npm run test:db      # database security tests (needs local PostgreSQL 15+)
npm run test:e2e     # browser tests at 375/390/412/768/1280 px widths
```

## Configuration

Copy `.env.example` to `.env.local`. Full setup, deployment and the demo script
are documented as the remaining milestones land.
