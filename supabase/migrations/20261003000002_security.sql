-- Who may see and change what (Row Level Security), automatic rules and
-- notifications, and the private file buckets.
--   admin   : everything in their school (owner: always; other admins: per admin_permissions)
--   teacher : the classes and subjects they teach, those students, their parents
--   student : their own records, their class's published work, the library
--   parent  : only the children linked to them
-- Helpers are SECURITY DEFINER (they read tables directly), so rules don't loop.

/* ---------------------------------------------------------------- helpers */

create or replace function private.me() returns public.profiles
language sql stable security definer set search_path = '' as $$
  select p from public.profiles p where p.id = (select auth.uid());
$$;
create or replace function private.my_school() returns uuid
language sql stable security definer set search_path = '' as $$
  select school_id from public.profiles where id = (select auth.uid());
$$;
create or replace function private.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid());
$$;
create or replace function private.is_admin(p_school uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and school_id = p_school and role = 'admin');
$$;
-- An admin permission: the owner always; others when admin_permissions says so (defaults below).
create or replace function private.admin_can(p_school uuid, p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and school_id = p_school and role = 'admin'
    and (is_owner or coalesce((admin_permissions ->> p_perm)::boolean,
      p_perm in ('manage_people', 'manage_classes', 'manage_academics', 'manage_announcements', 'view_reports', 'manage_library'))));
$$;
create or replace function private.my_teacher() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.teachers where profile_id = (select auth.uid());
$$;
create or replace function private.my_student() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.students where profile_id = (select auth.uid());
$$;
create or replace function private.my_parent() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.parents where profile_id = (select auth.uid());
$$;
-- Does the signed-in teacher teach (a subject in, or the homeroom of) this class?
create or replace function private.teaches_class(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_subjects where class_id = p_class and teacher_id = private.my_teacher())
      or exists (select 1 from public.classes where id = p_class and homeroom_teacher_id = private.my_teacher());
$$;
create or replace function private.teaches_cs(p_cs uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_subjects where id = p_cs and teacher_id = private.my_teacher());
$$;
create or replace function private.is_my_child(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.parent_students where student_id = p_student and parent_id = private.my_parent());
$$;
-- May the signed-in person see this student's records?
create or replace function private.can_see_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.students s where s.id = p_student and (
    private.is_admin(s.school_id)
    or s.id = private.my_student()
    or private.is_my_child(s.id)
    or (s.class_id is not null and private.teaches_class(s.class_id))));
$$;
-- Is the signed-in person in this class (as its student, or a parent of one)?
create or replace function private.in_class(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.students where class_id = p_class and id = private.my_student())
      or exists (select 1 from public.students s join public.parent_students ps on ps.student_id = s.id
                  where s.class_id = p_class and ps.parent_id = private.my_parent());
$$;
create or replace function private.cs_class(p_cs uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select class_id from public.class_subjects where id = p_cs;
$$;
create or replace function private.assessment_cs(p_assessment uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select class_subject_id from public.assessments where id = p_assessment;
$$;
create or replace function private.assessment_published(p_assessment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select published from public.assessments where id = p_assessment), false);
$$;
-- May the signed-in person start (or continue) a conversation with p_to? The school decides.
create or replace function private.can_message(p_to uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles; them public.profiles; rules jsonb;
begin
  select * into me from public.profiles where id = (select auth.uid());
  select * into them from public.profiles where id = p_to;
  if me.id is null or them.id is null or me.school_id <> them.school_id then return false; end if;
  -- Replies are always allowed.
  if exists (select 1 from public.messages where sender_id = p_to and recipient_id = me.id) then return true; end if;
  if me.role = 'admin' then return true; end if;               -- the school to anyone
  if them.role = 'admin' then return me.role in ('teacher', 'parent'); end if;
  select messaging into rules from public.schools where id = me.school_id;
  if me.role = 'parent' and them.role = 'teacher' then
    return coalesce((rules ->> 'parent_teacher')::boolean, false) and exists (
      select 1 from public.teachers t join public.class_subjects cs on cs.teacher_id = t.id
      join public.students s on s.class_id = cs.class_id
      where t.profile_id = them.id and private.is_my_child(s.id));
  elsif me.role = 'teacher' and them.role = 'parent' then
    return coalesce((rules ->> 'teacher_parent')::boolean, false) and exists (
      select 1 from public.parents pa join public.parent_students ps on ps.parent_id = pa.id
      join public.students s on s.id = ps.student_id
      where pa.profile_id = them.id and s.class_id is not null and private.teaches_class(s.class_id));
  elsif me.role = 'teacher' and them.role = 'student' then
    return coalesce((rules ->> 'teacher_student')::boolean, false) and exists (
      select 1 from public.students s where s.profile_id = them.id and s.class_id is not null and private.teaches_class(s.class_id));
  elsif me.role = 'student' and them.role = 'teacher' then
    return coalesce((rules ->> 'student_teacher')::boolean, false) and exists (
      select 1 from public.teachers t join public.class_subjects cs on cs.teacher_id = t.id
      join public.students s on s.class_id = cs.class_id
      where t.profile_id = them.id and s.id = private.my_student());
  end if;
  return false;
end $$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

/* ------------------------------------------------- accounts and automatic rules */

-- A new login gets its profile from app metadata (set only by the server with
-- the service key: a person can't sign themselves up as an admin).
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare meta jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
begin
  if meta ? 'school_id' and meta ? 'role' then
    insert into public.profiles (id, school_id, role, full_name, is_owner)
    values (new.id, (meta ->> 'school_id')::uuid, (meta ->> 'role')::public.user_role,
            coalesce(nullif(meta ->> 'full_name', ''), split_part(new.email, '@', 1)), coalesce((meta ->> 'is_owner')::boolean, false))
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

-- People can't change their own role, school or permissions.
create or replace function private.guard_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.role, new.school_id, new.is_owner, new.admin_permissions) is distinct from (old.role, old.school_id, old.is_owner, old.admin_permissions)
     and not private.admin_can(old.school_id, 'manage_people') then
    raise exception 'Only a school administrator can change roles or permissions.' using errcode = '42501';
  end if;
  if old.is_owner and new.is_owner is distinct from old.is_owner then
    raise exception 'The school owner stays the owner.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles for each row execute function private.guard_profile();

-- A score can't be above the assessment's maximum.
create or replace function private.check_score() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m numeric;
begin
  select max_score into m from public.assessments where id = new.assessment_id;
  if new.score > m then raise exception 'Score % is above the maximum of %.', new.score, m using errcode = '23514'; end if;
  new.graded_by := coalesce(new.graded_by, (select auth.uid()));
  new.graded_at := now();
  return new;
end $$;
drop trigger if exists check_score on public.scores;
create trigger check_score before insert or update on public.scores for each row execute function private.check_score();

-- Submissions: only to published work; marked late after the due time; resubmitting counts attempts.
create or replace function private.stamp_submission() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a public.assessments;
begin
  select * into a from public.assessments where id = new.assessment_id;
  if not a.published or not a.takes_submissions then raise exception 'This work is not open for submissions.' using errcode = '42501'; end if;
  if tg_op = 'UPDATE' then
    if not a.allow_resubmit and exists (select 1 from public.scores where assessment_id = new.assessment_id and student_id = new.student_id) then
      raise exception 'This work has been graded and can''t be resubmitted.' using errcode = '42501';
    end if;
    new.attempt := old.attempt + 1;
  end if;
  new.submitted_at := now();
  new.is_late := a.due_at is not null and now() > a.due_at;
  return new;
end $$;
drop trigger if exists stamp_submission on public.submissions;
create trigger stamp_submission before insert or update on public.submissions for each row execute function private.stamp_submission();

create or replace function private.stamp_published() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) then new.published_at := now(); end if;
  return new;
end $$;
drop trigger if exists stamp_published on public.assessments;
create trigger stamp_published before insert or update on public.assessments for each row execute function private.stamp_published();

/* --------------------------------------------------------- notifications */

create or replace function private.notify(p_user uuid, p_school uuid, p_kind text, p_title text, p_body text, p_link text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, school_id, kind, title, body, link)
  select p_user, p_school, p_kind, p_title, p_body, p_link where p_user is not null;
$$;

-- Published work → the class's students and their parents.
create or replace function private.on_assessment_published() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cls uuid; subj text;
begin
  if not new.published or (tg_op = 'UPDATE' and old.published) then return new; end if;
  select cs.class_id, s.name into cls, subj from public.class_subjects cs join public.subjects s on s.id = cs.subject_id where cs.id = new.class_subject_id;
  perform private.notify(st.profile_id, new.school_id, 'new_assessment', subj || ': ' || new.title, null, '/app/assignments/' || new.id)
    from public.students st where st.class_id = cls;
  perform private.notify(pa.profile_id, new.school_id, 'new_assessment', subj || ': ' || new.title, st.full_name, '/app/assignments/' || new.id)
    from public.students st join public.parent_students ps on ps.student_id = st.id join public.parents pa on pa.id = ps.parent_id
    where st.class_id = cls;
  return new;
end $$;
drop trigger if exists notify_assessment on public.assessments;
create trigger notify_assessment after insert or update of published on public.assessments for each row execute function private.on_assessment_published();

-- A released grade → the student and their parents.
create or replace function private.on_score() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a public.assessments; st public.students;
begin
  if not new.released or (tg_op = 'UPDATE' and old.released and old.score = new.score) then return new; end if;
  select * into a from public.assessments where id = new.assessment_id;
  select * into st from public.students where id = new.student_id;
  perform private.notify(st.profile_id, a.school_id, 'grade_released', 'New grade: ' || a.title, new.score || ' / ' || a.max_score, '/app/grades');
  perform private.notify(pa.profile_id, a.school_id, 'grade_released', st.full_name || ': ' || a.title, new.score || ' / ' || a.max_score, '/app/performance')
    from public.parent_students ps join public.parents pa on pa.id = ps.parent_id where ps.student_id = st.id;
  return new;
end $$;
drop trigger if exists notify_score on public.scores;
create trigger notify_score after insert or update on public.scores for each row execute function private.on_score();

-- Absent → the parents.
create or replace function private.on_attendance() returns trigger
language plpgsql security definer set search_path = '' as $$
declare st public.students;
begin
  if new.status <> 'absent' or (tg_op = 'UPDATE' and old.status = 'absent') then return new; end if;
  select * into st from public.students where id = new.student_id;
  perform private.notify(pa.profile_id, new.school_id, 'absent', st.full_name || ' was absent', to_char(new.date, 'Mon DD, YYYY'), '/app/attendance')
    from public.parent_students ps join public.parents pa on pa.id = ps.parent_id where ps.student_id = st.id;
  return new;
end $$;
drop trigger if exists notify_attendance on public.attendance;
create trigger notify_attendance after insert or update of status on public.attendance for each row execute function private.on_attendance();

-- A submission → the subject teacher.
create or replace function private.on_submission() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a public.assessments; t uuid; st text;
begin
  select * into a from public.assessments where id = new.assessment_id;
  select te.profile_id into t from public.class_subjects cs join public.teachers te on te.id = cs.teacher_id where cs.id = a.class_subject_id;
  select full_name into st from public.students where id = new.student_id;
  perform private.notify(t, a.school_id, 'submission', st || ' submitted ' || a.title, case when new.is_late then 'Late' end, '/app/assignments/' || a.id);
  return new;
end $$;
drop trigger if exists notify_submission on public.submissions;
create trigger notify_submission after insert or update on public.submissions for each row execute function private.on_submission();

-- An announcement → its audience.
create or replace function private.on_announcement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(p.id, new.school_id, 'announcement', new.title, null, '/app/announcements')
    from public.profiles p
    where p.school_id = new.school_id and p.id <> coalesce(new.author_id, '00000000-0000-0000-0000-000000000000') and (
      new.audience = 'everyone'
      or (new.audience = 'teachers' and p.role = 'teacher')
      or (new.audience = 'students' and p.role = 'student')
      or (new.audience = 'parents' and p.role = 'parent')
      or (new.audience = 'class' and (
        exists (select 1 from public.students s where s.profile_id = p.id and s.class_id = new.class_id)
        or exists (select 1 from public.parents pa join public.parent_students ps on ps.parent_id = pa.id join public.students s on s.id = ps.student_id
                   where pa.profile_id = p.id and s.class_id = new.class_id))));
  return new;
end $$;
drop trigger if exists notify_announcement on public.announcements;
create trigger notify_announcement after insert on public.announcements for each row execute function private.on_announcement();

-- A message → its recipient.
create or replace function private.on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(new.recipient_id, new.school_id, 'message', 'New message from ' || (select full_name from public.profiles where id = new.sender_id),
    left(new.body, 120), '/app/messages');
  return new;
end $$;
drop trigger if exists notify_message on public.messages;
create trigger notify_message after insert on public.messages for each row execute function private.on_message();

/* -------------------------------------------------------- row level security */

do $$ declare t text; begin
  foreach t in array array['schools','profiles','academic_years','terms','grade_levels','subjects','grading_components','teachers','classes',
    'students','parents','parent_students','class_subjects','attendance','assessments','assessment_files','submissions','scores',
    'learning_resources','announcements','messages','notifications'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- School and its set-up: everyone in the school reads; admins (with the right permission) change.
create policy "school: read" on public.schools for select to authenticated using (id = private.my_school());
create policy "school: change" on public.schools for update to authenticated using (private.admin_can(id, 'manage_school')) with check (private.admin_can(id, 'manage_school'));

do $$ declare t text; begin
  foreach t in array array['academic_years','terms','grade_levels','subjects','grading_components'] loop
    execute format('create policy "%1$s: read" on public.%1$I for select to authenticated using (school_id = private.my_school())', t);
    execute format('create policy "%1$s: write" on public.%1$I for all to authenticated using (private.admin_can(school_id, ''manage_academics'')) with check (private.admin_can(school_id, ''manage_academics''))', t);
  end loop;
end $$;
create policy "classes: read" on public.classes for select to authenticated using (school_id = private.my_school());
create policy "classes: write" on public.classes for all to authenticated using (private.admin_can(school_id, 'manage_classes')) with check (private.admin_can(school_id, 'manage_classes'));
create policy "class subjects: read" on public.class_subjects for select to authenticated using (school_id = private.my_school());
create policy "class subjects: write" on public.class_subjects for all to authenticated using (private.admin_can(school_id, 'manage_classes')) with check (private.admin_can(school_id, 'manage_classes'));

-- Profiles: yourself; admins see the school's; names for messaging come from teachers / parents / students.
create policy "profiles: read" on public.profiles for select to authenticated using (id = (select auth.uid()) or private.is_admin(school_id));
create policy "profiles: update" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or private.admin_can(school_id, 'manage_people'))
  with check (id = (select auth.uid()) or private.admin_can(school_id, 'manage_people'));

-- Teachers: everyone in the school can see who the teachers are.
create policy "teachers: read" on public.teachers for select to authenticated using (school_id = private.my_school());
create policy "teachers: write" on public.teachers for all to authenticated using (private.admin_can(school_id, 'manage_people')) with check (private.admin_can(school_id, 'manage_people'));

-- Students: only those you're allowed to see.
create policy "students: read" on public.students for select to authenticated using (private.can_see_student(id));
create policy "students: write" on public.students for all to authenticated using (private.admin_can(school_id, 'manage_people')) with check (private.admin_can(school_id, 'manage_people'));

-- Parents: admins; the parent; teachers of their children.
create policy "parents: read" on public.parents for select to authenticated using (
  private.is_admin(school_id) or profile_id = (select auth.uid())
  or exists (select 1 from public.parent_students ps join public.students s on s.id = ps.student_id
             where ps.parent_id = parents.id and s.class_id is not null and private.teaches_class(s.class_id)));
create policy "parents: write" on public.parents for all to authenticated using (private.admin_can(school_id, 'manage_people')) with check (private.admin_can(school_id, 'manage_people'));
create policy "parent links: read" on public.parent_students for select to authenticated using (private.can_see_student(student_id) and (private.my_role() <> 'student'));
create policy "parent links: write" on public.parent_students for all to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and private.admin_can(s.school_id, 'manage_people')))
  with check (exists (select 1 from public.students s join public.parents p on p.id = parent_id
    where s.id = student_id and p.school_id = s.school_id and private.admin_can(s.school_id, 'manage_people')));

-- Attendance: who can see the student; the class's teachers record it (within the school's edit window); admins always.
create policy "attendance: read" on public.attendance for select to authenticated using (private.can_see_student(student_id));
create policy "attendance: record" on public.attendance for insert to authenticated with check (
  private.admin_can(school_id, 'manage_classes')
  or (private.teaches_class(class_id) and exists (select 1 from public.students s where s.id = student_id and s.class_id = attendance.class_id)
      and date >= current_date - (select attendance_edit_days from public.schools where id = school_id) and date <= current_date));
create policy "attendance: change" on public.attendance for update to authenticated
  using (private.admin_can(school_id, 'manage_classes')
    or (private.teaches_class(class_id) and date >= current_date - (select attendance_edit_days from public.schools where id = school_id)))
  with check (private.admin_can(school_id, 'manage_classes') or (private.teaches_class(class_id) and date <= current_date));
create policy "attendance: delete" on public.attendance for delete to authenticated using (private.admin_can(school_id, 'manage_classes'));

-- Assessments: the subject teacher and admins; the class (students, parents) once published.
create policy "assessments: read" on public.assessments for select to authenticated using (
  private.is_admin(school_id) or private.teaches_cs(class_subject_id)
  or (published and private.in_class(private.cs_class(class_subject_id))));
create policy "assessments: write" on public.assessments for all to authenticated
  using (private.teaches_cs(class_subject_id) or private.admin_can(school_id, 'manage_academics'))
  with check ((private.teaches_cs(class_subject_id) or private.admin_can(school_id, 'manage_academics'))
    and exists (select 1 from public.class_subjects cs where cs.id = class_subject_id and cs.school_id = assessments.school_id));
create policy "assessment files: read" on public.assessment_files for select to authenticated using (
  exists (select 1 from public.assessments a where a.id = assessment_id));  -- visible when the assessment is
create policy "assessment files: write" on public.assessment_files for all to authenticated
  using (private.teaches_cs(private.assessment_cs(assessment_id)))
  with check (private.teaches_cs(private.assessment_cs(assessment_id)));

-- Submissions: the student (their own, to published work), their parents, the teacher, admins.
create policy "submissions: read" on public.submissions for select to authenticated using (
  student_id = private.my_student() or private.is_my_child(student_id)
  or private.teaches_cs(private.assessment_cs(assessment_id))
  or exists (select 1 from public.students s where s.id = student_id and private.is_admin(s.school_id)));
create policy "submissions: submit" on public.submissions for insert to authenticated with check (
  student_id = private.my_student() and private.assessment_published(assessment_id)
  and private.in_class(private.cs_class(private.assessment_cs(assessment_id))));
create policy "submissions: resubmit" on public.submissions for update to authenticated
  using (student_id = private.my_student()) with check (student_id = private.my_student());

-- Scores: the teacher and admins; the student and parents once released.
create policy "scores: read" on public.scores for select to authenticated using (
  private.teaches_cs(private.assessment_cs(assessment_id))
  or exists (select 1 from public.students s where s.id = student_id and private.is_admin(s.school_id))
  or (released and (student_id = private.my_student() or private.is_my_child(student_id))));
create policy "scores: grade" on public.scores for all to authenticated
  using (private.teaches_cs(private.assessment_cs(assessment_id))
    or exists (select 1 from public.students s where s.id = student_id and private.admin_can(s.school_id, 'manage_academics')))
  with check ((private.teaches_cs(private.assessment_cs(assessment_id))
    or exists (select 1 from public.students s where s.id = student_id and private.admin_can(s.school_id, 'manage_academics')))
    and exists (select 1 from public.assessments a join public.class_subjects cs on cs.id = a.class_subject_id
                join public.students s on s.id = scores.student_id where a.id = assessment_id and s.class_id = cs.class_id));

-- Library: the whole school reads; teachers and admins add; the uploader or an admin changes.
create policy "library: read" on public.learning_resources for select to authenticated using (school_id = private.my_school());
create policy "library: add" on public.learning_resources for insert to authenticated with check (
  school_id = private.my_school() and private.my_role() in ('teacher', 'admin') and uploaded_by = (select auth.uid()));
create policy "library: change" on public.learning_resources for update to authenticated
  using (uploaded_by = (select auth.uid()) or private.admin_can(school_id, 'manage_library'))
  with check (school_id = private.my_school());
create policy "library: delete" on public.learning_resources for delete to authenticated
  using (uploaded_by = (select auth.uid()) or private.admin_can(school_id, 'manage_library'));

-- Announcements: the audience reads; admins post to anyone, teachers to their classes.
create policy "announcements: read" on public.announcements for select to authenticated using (
  school_id = private.my_school() and (
    private.is_admin(school_id) or author_id = (select auth.uid()) or audience = 'everyone'
    or (audience::text = private.my_role()::text || 's')
    or (audience = 'class' and (private.in_class(class_id) or private.teaches_class(class_id)))));
create policy "announcements: post" on public.announcements for insert to authenticated with check (
  school_id = private.my_school() and author_id = (select auth.uid()) and (
    private.admin_can(school_id, 'manage_announcements') or (audience = 'class' and private.teaches_class(class_id))));
create policy "announcements: change" on public.announcements for update to authenticated
  using (author_id = (select auth.uid()) or private.admin_can(school_id, 'manage_announcements'))
  with check (school_id = private.my_school());
create policy "announcements: delete" on public.announcements for delete to authenticated
  using (author_id = (select auth.uid()) or private.admin_can(school_id, 'manage_announcements'));

-- Messages: the two people in the conversation; sending follows the school's rules.
create policy "messages: read" on public.messages for select to authenticated using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy "messages: send" on public.messages for insert to authenticated with check (
  sender_id = (select auth.uid()) and school_id = private.my_school() and private.can_message(recipient_id));
create policy "messages: mark read" on public.messages for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

-- Notifications: your own (read / mark read / clear); created only by the rules above.
create policy "notifications: read" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: mark read" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: clear" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
revoke insert on public.notifications from authenticated;

/* ------------------------------------------------------------- file storage */

-- Private buckets. Paths: materials/<school>/<assessment or resource>/<file>,
-- submissions/<school>/<assessment>/<student>/<file>. 20 MB per file.
insert into storage.buckets (id, name, public, file_size_limit) values
  ('materials', 'materials', false, 20971520), ('submissions', 'submissions', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "materials: read" on storage.objects for select to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = private.my_school()::text);
create policy "materials: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = private.my_school()::text and private.my_role() in ('teacher', 'admin'));
create policy "materials: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = private.my_school()::text and (owner = (select auth.uid()) or private.is_admin(private.my_school())));

create policy "submissions: read files" on storage.objects for select to authenticated using (
  bucket_id = 'submissions' and (storage.foldername(name))[1] = private.my_school()::text and (
    (storage.foldername(name))[3] = private.my_student()::text
    or private.is_my_child(((storage.foldername(name))[3])::uuid)
    or private.teaches_cs(private.assessment_cs(((storage.foldername(name))[2])::uuid))
    or private.is_admin(private.my_school())));
create policy "submissions: upload files" on storage.objects for insert to authenticated with check (
  bucket_id = 'submissions' and (storage.foldername(name))[1] = private.my_school()::text
  and (storage.foldername(name))[3] = private.my_student()::text);

notify pgrst, 'reload schema';
