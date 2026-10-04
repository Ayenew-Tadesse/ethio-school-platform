# Adding a real school

Do this after `docs/deploy.md`. Use the school's real details only with the
school's agreement, and keep the service_role key private.

## 1. The school and its owner

In the Supabase **SQL Editor**, create the school (change the values):

```sql
insert into public.schools (name, city, region, email)
values ('Example School', 'Addis Ababa', 'Addis Ababa', 'office@example-school.et')
returning id;
```

Copy the `id` it returns. Then **Authentication → Users → Add user**: the
owner's email and a temporary password, with **Auto Confirm** on. Open the
new user, and set its **app metadata** (raw JSON) to:

```json
{ "school_id": "<the id from above>", "role": "admin", "is_owner": true, "full_name": "Owner's Name" }
```

The owner's profile is created from that metadata. (If the user was created
before the metadata was set, add the profile once in the SQL Editor:
`insert into public.profiles (id, school_id, role, full_name, is_owner) values ('<user id>', '<school id>', 'admin', 'Owner''s Name', true);`)

## 2. In the platform, as the owner

1. **Settings:** school details, the academic year and terms, grading weights,
   the pass mark, the attention threshold, attendance rules and who may start
   conversations.
2. **Subjects:** the subjects the school teaches (with Amharic names).
3. **Teachers:** add each teacher. With an email, a login is created and a
   temporary password is shown **once**. Share it privately.
4. **Classes:** create each class, choose its homeroom teacher and assign a
   teacher to each subject.
5. **Students:** add students to their classes (an email only if they'll sign in).
6. **Parents:** add parents and link them to their children. A parent sees only
   the children linked to them.

Other administrators can be added by the owner, who decides what each may do.

## 3. Before going live

- Sign in as one teacher, one student and one parent and check what they see.
- Ask everyone to change their temporary password after first signing in.
