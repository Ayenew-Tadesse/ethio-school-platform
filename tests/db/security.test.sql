-- Security: each role sees and changes only what it should. Two schools so
-- nothing leaks across schools either. Any failed check aborts the run.

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.act_anon() returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', '', false); execute 'set role anon'; end $$;
create function pg_temp.back() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', false); end $$;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; raise notice 'ok - %', what; end $$;
-- Runs sql as the current role and reports whether it was refused (an error or nothing changed).
create function pg_temp.refused(sql text) returns boolean language plpgsql as $$
declare n int;
begin execute sql; get diagnostics n = row_count; return n = 0;
exception when others then return true; end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------------------------------------------------------------- set-up */
insert into schools (id, name) values ('00000000-0000-0000-0000-00000000000a', 'Addis Test School'), ('00000000-0000-0000-0000-00000000000b', 'Other School');
-- Logins (the profile comes from app metadata, as the server sets it).
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'admin@a.test', '{"school_id":"00000000-0000-0000-0000-00000000000a","role":"admin","full_name":"Owner Admin","is_owner":true}', '{}'),
  ('a0000000-0000-0000-0000-000000000002', 'admin2@a.test', '{"school_id":"00000000-0000-0000-0000-00000000000a","role":"admin","full_name":"Second Admin"}', '{}'),
  ('a0000000-0000-0000-0000-000000000011', 'math@a.test', '{"school_id":"00000000-0000-0000-0000-00000000000a","role":"teacher","full_name":"Math Teacher"}', '{}'),
  ('a0000000-0000-0000-0000-000000000012', 'bio@a.test', '{"school_id":"00000000-0000-0000-0000-00000000000a","role":"teacher","full_name":"Biology Teacher"}', '{}'),
  ('a0000000-0000-0000-0000-000000000021', 'abel@a.test', '{"school_id":"00000000-0000-0000-0000-00000000000a","role":"student","full_name":"Abel"}', '{}'),
  ('a0000000-0000-0000-0000-000000000022', 'bethel@a.test', '{"school_id":"00000000-0000-0000-0000-00000000000a","role":"student","full_name":"Bethel"}', '{}'),
  ('a0000000-0000-0000-0000-000000000031', 'mom@a.test', '{"school_id":"00000000-0000-0000-0000-00000000000a","role":"parent","full_name":"Abel Mom"}', '{}'),
  ('b0000000-0000-0000-0000-000000000001', 'admin@b.test', '{"school_id":"00000000-0000-0000-0000-00000000000b","role":"admin","full_name":"B Admin","is_owner":true}', '{}'),
  ('c0000000-0000-0000-0000-000000000001', 'stranger@x.test', '{"role":"admin"}', '{"school_id":"00000000-0000-0000-0000-00000000000a","role":"admin"}');
select pg_temp.check((select count(*) from profiles) = 8, 'logins with app metadata get a profile');
select pg_temp.check(not exists (select 1 from profiles where id = 'c0000000-0000-0000-0000-000000000001'), 'self-chosen user metadata does not make anyone an admin');

insert into academic_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('ac000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '2018 E.C.', '2025-09-11', '2026-07-07', true);
insert into grade_levels (id, school_id, level, name) values
  ('9e000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-00000000000a', 8, 'Grade 8'),
  ('9e000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a', 5, 'Grade 5');
insert into subjects (id, school_id, name) values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Mathematics'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Biology');
insert into teachers (id, school_id, profile_id, full_name) values
  ('7e000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000011', 'Math Teacher'),
  ('7e000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000012', 'Biology Teacher');
insert into classes (id, school_id, academic_year_id, grade_level_id, section) values
  ('c1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-00000000000a', 'ac000000-0000-0000-0000-000000000001', '9e000000-0000-0000-0000-000000000008', 'A'),
  ('c1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a', 'ac000000-0000-0000-0000-000000000001', '9e000000-0000-0000-0000-000000000005', 'B');
-- Math teaches 8A; Biology teaches 5B.
insert into class_subjects (id, school_id, class_id, subject_id, teacher_id) values
  ('c5000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000001', '7e000000-0000-0000-0000-000000000001'),
  ('c5000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000002', '7e000000-0000-0000-0000-000000000002');
insert into students (id, school_id, profile_id, class_id, full_name, student_no) values
  ('5a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000021', 'c1000000-0000-0000-0000-000000000008', 'Abel', 'S-001'),
  ('5a000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000022', 'c1000000-0000-0000-0000-000000000005', 'Bethel', 'S-002');
insert into parents (id, school_id, profile_id, full_name) values
  ('9a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000031', 'Abel Mom');
insert into parent_students (parent_id, student_id, relationship) values ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'mother');

/* ----------------------------------- 0. the refusal helper itself (controls) */
select pg_temp.check(not pg_temp.refused($q$update schools set city = 'Addis Ababa' where id = '00000000-0000-0000-0000-00000000000a'$q$), 'control: an allowed change is not reported as refused');
select pg_temp.check(pg_temp.refused($q$update no_such_table set x = 1$q$), 'control: an error counts as refused');

/* --------------------------------------------- 1. nobody signed in sees nothing */
select pg_temp.act_anon();
select pg_temp.check(pg_temp.refused('select * from students'), 'signed out: no student records');
select pg_temp.back();

/* ------------------------------------------------------------- 2. teachers */
select pg_temp.act_as('a0000000-0000-0000-0000-000000000011');
select pg_temp.check((select array_agg(full_name) from students) = '{Abel}', 'teacher sees only the students they teach');
select pg_temp.check((select count(*) from parents) = 1, 'teacher sees the parents of their students');
-- Attendance today for their class; not for another class; not in the future.
insert into attendance (school_id, class_id, student_id, date, status) values
  ('00000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-000000000008', '5a000000-0000-0000-0000-000000000001', current_date, 'absent');
select pg_temp.check((select status from attendance where student_id = '5a000000-0000-0000-0000-000000000001') = 'absent', 'teacher records attendance for their class');
select pg_temp.check(not pg_temp.refused($q$update attendance set note = 'Bus delay' where student_id = '5a000000-0000-0000-0000-000000000001'$q$),
  'control: the teacher can correct their own class''s attendance');
select pg_temp.check(pg_temp.refused($$insert into attendance (school_id, class_id, student_id, date, status) values
  ('00000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000002', current_date, 'present')$$), 'teacher cannot record another class''s attendance');
select pg_temp.check(pg_temp.refused($$insert into attendance (school_id, class_id, student_id, date, status) values
  ('00000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-000000000008', '5a000000-0000-0000-0000-000000000001', current_date + 3, 'present')$$), 'no attendance in the future');
select pg_temp.check(pg_temp.refused($$insert into attendance (school_id, class_id, student_id, date, status) values
  ('00000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-000000000008', '5a000000-0000-0000-0000-000000000001', current_date - 30, 'present')$$), 'teacher cannot record past the school''s edit window');
-- Work: a draft, then published.
insert into assessments (id, school_id, class_subject_id, kind, title, max_score, due_at, published) values
  ('a5000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'c5000000-0000-0000-0000-000000000001', 'homework', 'Fractions practice', 20, now() + interval '2 days', false);
select pg_temp.check(pg_temp.refused($$insert into assessments (school_id, class_subject_id, kind, title) values
  ('00000000-0000-0000-0000-00000000000a', 'c5000000-0000-0000-0000-000000000002', 'quiz', 'Not my class')$$), 'teacher cannot create work for another teacher''s class');
select pg_temp.back();

/* ------------------------------------------------------------- 3. students */
select pg_temp.act_as('a0000000-0000-0000-0000-000000000021');
select pg_temp.check((select array_agg(full_name) from students) = '{Abel}', 'student sees only themself');
select pg_temp.check((select count(*) from assessments) = 0, 'student does not see draft work');
select pg_temp.back();
update assessments set published = true where id = 'a5000000-0000-0000-0000-000000000001';
select pg_temp.check((select count(*) from notifications where kind = 'new_assessment') = 2, 'publishing notifies the student and the parent');
select pg_temp.check((select count(*) from notifications where kind = 'absent') = 1, 'an absence notifies the parent');
select pg_temp.act_as('a0000000-0000-0000-0000-000000000021');
select pg_temp.check((select count(*) from assessments) = 1, 'student sees published work for their class');
insert into submissions (assessment_id, student_id, body) values ('a5000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'My answers');
select pg_temp.check((select not is_late and attempt = 1 from submissions), 'student submits (on time)');
select pg_temp.check(pg_temp.refused($$insert into submissions (assessment_id, student_id, body) values ('a5000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000002', 'pretending')$$),
  'student cannot submit as someone else');
select pg_temp.check(pg_temp.refused($$insert into scores (assessment_id, student_id, score) values ('a5000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 20)$$),
  'student cannot grade themself');
select pg_temp.check(pg_temp.refused($$update profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000021'$$), 'student cannot make themself an admin');
select pg_temp.back();
select pg_temp.check((select count(*) from notifications where kind = 'submission') = 1, 'a submission notifies the teacher');

-- Bethel (another class) sees none of Abel's things.
select pg_temp.act_as('a0000000-0000-0000-0000-000000000022');
select pg_temp.check((select count(*) from assessments) = 0 and (select count(*) from submissions) = 0 and (select count(*) from attendance) = 0,
  'another student sees none of it');
select pg_temp.back();

/* ------------------------------------------------------------- 4. grading */
select pg_temp.act_as('a0000000-0000-0000-0000-000000000011');
select pg_temp.check(pg_temp.refused($$insert into scores (assessment_id, student_id, score) values ('a5000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 25)$$),
  'a score above the maximum is refused');
insert into scores (assessment_id, student_id, score, feedback) values ('a5000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 17, 'Good work');
select pg_temp.check((select score from scores) = 17, 'teacher grades their student');
select pg_temp.back();
select pg_temp.check((select count(*) from notifications where kind = 'grade_released') = 2, 'a released grade notifies the student and the parent');
select pg_temp.act_as('a0000000-0000-0000-0000-000000000021');
select pg_temp.check(pg_temp.refused($$update submissions set body = 'changed' where student_id = '5a000000-0000-0000-0000-000000000001'$$),
  'graded work cannot be resubmitted unless allowed');
select pg_temp.check((select feedback from scores) = 'Good work', 'student sees their grade and feedback');
select pg_temp.back();

/* -------------------------------------------------------------- 5. parents */
select pg_temp.act_as('a0000000-0000-0000-0000-000000000031');
select pg_temp.check((select array_agg(full_name) from students) = '{Abel}', 'parent sees only their child');
select pg_temp.check((select score from scores) = 17 and (select count(*) from attendance) = 1, 'parent sees their child''s grades and attendance');
select pg_temp.check((select count(*) from notifications) = 3, 'parent has their notifications (work, absence, grade)');
select pg_temp.back();

/* ------------------------------------------------------------ 6. messaging */
select pg_temp.act_as('a0000000-0000-0000-0000-000000000031');
insert into messages (school_id, sender_id, recipient_id, body) values
  ('00000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000011', 'Hello, how is Abel doing?');
select pg_temp.check(pg_temp.refused($$insert into messages (school_id, sender_id, recipient_id, body) values
  ('00000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000012', 'Hi')$$),
  'parent cannot message a teacher who doesn''t teach their child');
select pg_temp.check(pg_temp.refused($$insert into messages (school_id, sender_id, recipient_id, body) values
  ('00000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000022', 'Hi')$$),
  'parent cannot message a student');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000011');
select pg_temp.check((select count(*) from messages) = 1, 'the teacher receives it');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000022');
select pg_temp.check((select count(*) from messages) = 0, 'others don''t see the conversation');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000031');
select pg_temp.check(private.can_message('a0000000-0000-0000-0000-000000000011'), 'parent may message their child''s teacher');
select pg_temp.back();
update schools set messaging = messaging || '{"parent_teacher": false}' where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.act_as('a0000000-0000-0000-0000-000000000031');
select pg_temp.check(not private.can_message('a0000000-0000-0000-0000-000000000011'), 'the school can turn parent → teacher messaging off');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000011');
select pg_temp.check(not pg_temp.refused($q$insert into messages (school_id, sender_id, recipient_id, body) values
  ('00000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000031', 'Abel is doing well.')$q$),
  'the teacher can still reply');
select pg_temp.back();

/* ------------------------------------------------------- 7. administrators */
select pg_temp.act_as('a0000000-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from students) = 2, 'admin sees every student in their school');
update profiles set admin_permissions = '{"manage_people": false}' where id = 'a0000000-0000-0000-0000-000000000002';
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000002');
select pg_temp.check(pg_temp.refused($$insert into students (school_id, full_name, student_no) values ('00000000-0000-0000-0000-00000000000a', 'New', 'S-099')$$),
  'an admin without "manage people" cannot add students');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000001');
select pg_temp.check(not pg_temp.refused($q$insert into students (school_id, full_name, student_no) values ('00000000-0000-0000-0000-00000000000a', 'New', 'S-099')$q$),
  'control: the owner can add students');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000002');
insert into announcements (school_id, title, body, audience, author_id) values
  ('00000000-0000-0000-0000-00000000000a', 'Parents'' day', 'Saturday at 9', 'parents', 'a0000000-0000-0000-0000-000000000002');
select pg_temp.check(pg_temp.refused($$update profiles set admin_permissions = '{}' where id = 'a0000000-0000-0000-0000-000000000002'$$),
  'that admin cannot give themself the permission back');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000021');
select pg_temp.check((select count(*) from announcements) = 0, 'a parents-only announcement is not shown to students');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000031');
select pg_temp.check((select count(*) from announcements) = 1, 'parents see it');
select pg_temp.back();

/* ------------------------------------------------------- 8. other schools */
select pg_temp.act_as('b0000000-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from students) = 0 and (select count(*) from teachers) = 0 and (select count(*) from scores) = 0
  and (select count(*) from schools) = 1, 'another school''s admin sees nothing of this school');
select pg_temp.check(pg_temp.refused($$update schools set name = 'hacked' where id = '00000000-0000-0000-0000-00000000000a'$$), 'and cannot change it');
select pg_temp.back();

/* ------------------------------------------------------------ 9. files */
insert into storage.objects (bucket_id, name, owner) values
  ('submissions', '00000000-0000-0000-0000-00000000000a/a5000000-0000-0000-0000-000000000001/5a000000-0000-0000-0000-000000000001/answers.pdf', 'a0000000-0000-0000-0000-000000000021');
select pg_temp.act_as('a0000000-0000-0000-0000-000000000022');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'submissions') = 0, 'another student cannot open a submission file');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000031');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'submissions') = 1, 'the parent can open their child''s file');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000012');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'submissions') = 0, 'a teacher of another subject cannot open it');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000022');
select pg_temp.check(pg_temp.refused($$insert into storage.objects (bucket_id, name) values ('submissions',
  '00000000-0000-0000-0000-00000000000a/a5000000-0000-0000-0000-000000000001/5a000000-0000-0000-0000-000000000001/fake.pdf')$$),
  'a student cannot upload into another student''s folder');
select pg_temp.back();

/* ------------------------------------------------- names you may see */
select pg_temp.act_as('a0000000-0000-0000-0000-000000000021');
select pg_temp.check(exists (select 1 from my_people() where full_name = 'Math Teacher'), 'a student sees their teachers'' names');
select pg_temp.check(not exists (select 1 from my_people() where full_name = 'Bethel'), 'a student does not see another student''s name');
select pg_temp.check(not exists (select 1 from my_people() where full_name = 'Abel Mom'), 'a student does not see parents in the people list');
select pg_temp.check(not exists (select 1 from my_people() where full_name = 'B Admin'), 'no names from another school');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000012');
select pg_temp.check(not exists (select 1 from my_people() where full_name in ('Abel', 'Abel Mom')), 'a teacher does not see students or parents of classes they don''t teach');
select pg_temp.back();
select pg_temp.act_as('a0000000-0000-0000-0000-000000000011');
select pg_temp.check((select count(*) from my_people() where full_name in ('Abel', 'Abel Mom')) = 2, 'a teacher sees their students and those students'' parents');
select pg_temp.back();
select pg_temp.act_anon();
select pg_temp.check(pg_temp.refused('select * from my_people()'), 'signed out: no names');
select pg_temp.back();
