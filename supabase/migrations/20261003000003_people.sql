-- Names of the people you may see (for messages, authors and class lists):
-- only id, name and role, never contact details. Same rules as the tables:
-- teachers and administrators of your school, students you can see, parents
-- you can see, and anyone you have exchanged messages with.
create or replace function public.my_people()
returns table (id uuid, full_name text, role public.user_role)
language sql stable security definer set search_path = '' as $$
  with me as (select p.id, p.school_id, p.role from public.profiles p where p.id = (select auth.uid()))
  select p.id, p.full_name, p.role from public.profiles p, me
  where p.school_id = me.school_id and (
    p.id = me.id
    or p.role in ('admin', 'teacher')
    or exists (select 1 from public.students s where s.profile_id = p.id and private.can_see_student(s.id))
    or exists (select 1 from public.parents pa where pa.profile_id = p.id and (
         private.is_admin(me.school_id)
         or exists (select 1 from public.parent_students ps join public.students s on s.id = ps.student_id
                    where ps.parent_id = pa.id and s.class_id is not null and private.teaches_class(s.class_id))))
    or exists (select 1 from public.messages m where (m.sender_id = me.id and m.recipient_id = p.id) or (m.sender_id = p.id and m.recipient_id = me.id)));
$$;
revoke all on function public.my_people() from public, anon;
grant execute on function public.my_people() to authenticated;
