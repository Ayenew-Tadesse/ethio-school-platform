-- The demo school loaded by the seed (tests/db/run.sh loads it first): the
-- history is kept, the automatic rules are back on, and each demo login sees
-- only what it should. Any failed check aborts the run.
create function pg_temp.act_as(email text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', (select id::text from test.logins l where l.email = act_as.email), false); execute 'set role authenticated'; end $$;
create function pg_temp.back() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', false); end $$;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; raise notice 'ok - %', what; end $$;

select pg_temp.check((select count(*) from public.schools) = 1, 'one demo school');
select pg_temp.check((select count(*) from public.profiles) = (select count(*) from auth.users), 'every person has a login');
select pg_temp.check((select count(*) from public.attendance) > 500 and (select count(*) from public.scores) > 500, 'attendance and grades are there');
select pg_temp.check((select count(distinct submitted_at::date) from public.submissions) > 5, 'hand-ins keep their own dates (not all stamped "now")');
select pg_temp.check((select count(*) from public.notifications) < 20, 'loading sent no flood of notifications');
select pg_temp.check(not exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal and t.tgenabled = 'D'), 'the automatic rules are back on');

-- The student sees only their own grades.
create temp table me as select s.id from public.students s join test.logins l on l.id = s.profile_id where l.email = 'student@example.com';
grant select on me to authenticated;
select pg_temp.act_as('student@example.com');
select pg_temp.check((select count(*) from public.scores) > 0, 'the student sees grades');
select pg_temp.check(not exists (select 1 from public.scores where student_id <> (select id from me)), 'the student sees no one else''s grades');
select pg_temp.back();

-- The parent sees only their linked children.
create temp table kids as select ps.student_id from public.parent_students ps join public.parents p on p.id = ps.parent_id
  join test.logins l on l.id = p.profile_id where l.email = 'parent@example.com';
grant select on kids to authenticated;
select pg_temp.act_as('parent@example.com');
select pg_temp.check((select count(*) from public.students) = (select count(*) from kids) and (select count(*) from kids) > 0, 'the parent sees exactly their children');
select pg_temp.check(not exists (select 1 from public.scores where student_id not in (select student_id from kids)), 'the parent sees no other child''s grades');
select pg_temp.back();

-- The teacher sees attendance only for classes they teach.
create temp table taught as select cs.class_id from public.class_subjects cs join public.teachers t on t.id = cs.teacher_id
  join test.logins l on l.id = t.profile_id where l.email = 'teacher@example.com'
  union select c.id from public.classes c join public.teachers t on t.id = c.homeroom_teacher_id join test.logins l on l.id = t.profile_id where l.email = 'teacher@example.com';
grant select on taught to authenticated;
select pg_temp.act_as('teacher@example.com');
select pg_temp.check((select count(*) from public.attendance) > 0, 'the teacher sees attendance');
select pg_temp.check(not exists (select 1 from public.attendance where class_id not in (select class_id from taught)), 'the teacher sees only their classes');
select pg_temp.back();
