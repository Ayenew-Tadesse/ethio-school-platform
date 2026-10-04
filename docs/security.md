# Who can see what

The rules live in the database itself (PostgreSQL **Row Level Security**, in
`supabase/migrations`), so they hold no matter how the data is asked for: the
website, a phone app later, or someone calling the API directly.

| Person | Sees | Can change |
| --- | --- | --- |
| **Student** | their own attendance, work, submissions and grades; their class's announcements and library; their teachers' names | their own submissions (until graded, unless resubmitting is allowed) |
| **Parent** | only the children linked to their account: attendance, work, grades, teacher feedback | nothing about grades or attendance; they can message their children's teachers |
| **Teacher** | only the classes they teach or are homeroom teacher of, and those students' parents | attendance (within the school's edit window), assignments, grades and feedback for those classes |
| **Administrator** | everything in their own school, never another school's | people, classes, subjects, settings; the school owner decides what other admins may do |
| **Signed out** | nothing | nothing |

More of the rules:

- **Roles can't be self-assigned.** A login's role and school come from
  server-set metadata when an administrator creates the account. Nobody can
  change their own role, school or permissions; the school owner stays the owner.
- **Private files.** Submitted work and attachments are in private storage,
  opened through short-lived signed links, only by people who may see that work.
- **Class averages never reveal one student.** A class average is only shown
  when at least five students have been graded.
- **"Students requiring academic attention"** is based on academic signals only
  (overall score below the school's threshold, or falling scores). It is a
  prompt for a conversation, never a diagnosis.

## Keys

- The **anon key** is public and safe in the browser: Row Level Security does
  the protecting.
- The **service-role key** bypasses those rules. It is used only on the server
  (`src/app/api/admin/people`, which first checks the caller is an
  administrator of that school) and by `npm run seed` on your own computer. It
  must never have a `NEXT_PUBLIC_` prefix and must never be committed.

## Tested

`npm run test:db` checks these rules against a real PostgreSQL: each role
trying to read and change what it shouldn't, across two schools, plus the
demo seed (each demo login sees only its own part).
