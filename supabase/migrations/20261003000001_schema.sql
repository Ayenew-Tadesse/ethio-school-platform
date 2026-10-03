-- Ethiopian School Platform: core schema.
-- One row per school; everything else belongs to a school (school_id) so one
-- database can host many schools. UUID keys, foreign keys, timestamps and
-- check constraints throughout. Security rules are in the next migration.

create extension if not exists pgcrypto;
create schema if not exists private; -- helper functions the security rules use (not exposed by the API)

-- Roles a signed-in person can have in their school.
do $$ begin
  create type public.user_role as enum ('admin', 'teacher', 'student', 'parent');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');
exception when duplicate_object then null; end $$;
-- Homework, assignments, quizzes and exams are all "assessments" of a kind.
do $$ begin
  create type public.assessment_kind as enum ('homework', 'assignment', 'quiz', 'midterm', 'final');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.resource_type as enum ('pdf', 'document', 'video', 'presentation', 'practice_test', 'study_guide', 'textbook');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.audience as enum ('everyone', 'teachers', 'students', 'parents', 'class');
exception when duplicate_object then null; end $$;

/* ---------------------------------------------------------------- school */

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  city text, region text, phone text, email text, address text,
  default_language text not null default 'en' check (default_language in ('en', 'am')),
  -- Configurable rules (assumptions a school sets for itself).
  passing_score numeric(5,2) not null default 50 check (passing_score between 0 and 100),
  attention_threshold numeric(5,2) not null default 50 check (attention_threshold between 0 and 100),
  late_counts_as_present boolean not null default true,
  attendance_edit_days int not null default 7 check (attendance_edit_days between 0 and 365),
  -- Who may start a conversation with whom (the school controls messaging).
  messaging jsonb not null default '{"parent_teacher": true, "teacher_parent": true, "teacher_student": true, "student_teacher": true}'::jsonb,
  created_at timestamptz not null default now()
);

-- Everyone who signs in: one school, one role (MVP; see docs/ARCHITECTURE.md).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  role public.user_role not null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'am')),
  -- Administrators: what this admin may do (the school owner can do everything).
  is_owner boolean not null default false,
  admin_permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists profiles_school on public.profiles (school_id, role);

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60), -- e.g. "2018 E.C. (2025/26)"
  starts_on date not null, ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on),
  unique (school_id, name)
);
create unique index if not exists academic_years_one_current on public.academic_years (school_id) where is_current;

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  academic_year_id uuid not null references public.academic_years (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60), -- "Semester 1", "Term 2"…
  ordinal int not null check (ordinal between 1 and 6),
  starts_on date not null, ends_on date not null,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on),
  unique (academic_year_id, ordinal)
);

-- Grade levels the school runs (KG and 1–12 by default; configurable).
create table if not exists public.grade_levels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  level int not null check (level between 0 and 12), -- 0 = KG
  name text not null,
  unique (school_id, level)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  name_am text, code text,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

-- How the overall score is made up (configurable weights per assessment kind).
create table if not exists public.grading_components (
  school_id uuid not null references public.schools (id) on delete cascade,
  kind public.assessment_kind not null,
  weight numeric(5,2) not null check (weight between 0 and 100),
  primary key (school_id, kind)
);

/* ----------------------------------------------------------------- people */

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text, phone text, staff_no text,
  created_at timestamptz not null default now()
);
create index if not exists teachers_school on public.teachers (school_id);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  academic_year_id uuid not null references public.academic_years (id) on delete cascade,
  grade_level_id uuid not null references public.grade_levels (id) on delete restrict,
  section text not null check (section ~ '^[A-Z]{1,3}$'), -- "A", "B"…
  homeroom_teacher_id uuid references public.teachers (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (academic_year_id, grade_level_id, section)
);
create index if not exists classes_school on public.classes (school_id);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  profile_id uuid unique references public.profiles (id) on delete set null, -- a student may not have a login yet
  class_id uuid references public.classes (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  student_no text, gender text check (gender in ('F', 'M')), date_of_birth date,
  created_at timestamptz not null default now(),
  unique (school_id, student_no)
);
create index if not exists students_class on public.students (class_id);
create index if not exists students_school on public.students (school_id);

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text, email text,
  created_at timestamptz not null default now()
);
create index if not exists parents_school on public.parents (school_id);

create table if not exists public.parent_students (
  parent_id uuid not null references public.parents (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  relationship text not null default 'guardian' check (relationship in ('mother', 'father', 'guardian', 'other')),
  primary key (parent_id, student_id)
);
create index if not exists parent_students_student on public.parent_students (student_id);

-- Who teaches which subject to which class (teacher ↔ class ↔ subject).
create table if not exists public.class_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  teacher_id uuid references public.teachers (id) on delete set null,
  unique (class_id, subject_id)
);
create index if not exists class_subjects_teacher on public.class_subjects (teacher_id);

/* ------------------------------------------------------------ attendance */

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  date date not null,
  status public.attendance_status not null,
  note text check (char_length(note) <= 300),
  recorded_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, date)
);
create index if not exists attendance_class_date on public.attendance (class_id, date);

/* -------------------------------------------- assessments and their scores */

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  class_subject_id uuid not null references public.class_subjects (id) on delete cascade,
  term_id uuid references public.terms (id) on delete set null,
  kind public.assessment_kind not null,
  title text not null check (char_length(title) between 1 and 160),
  description text check (char_length(description) <= 5000),
  due_at timestamptz,          -- assignments / homework
  scheduled_on date,           -- quizzes / exams
  max_score numeric(6,2) not null default 100 check (max_score > 0),
  published boolean not null default false,
  published_at timestamptz,
  takes_submissions boolean not null default true,
  allow_resubmit boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists assessments_cs on public.assessments (class_subject_id, kind);

-- Files a teacher attaches (paths in the private "materials" bucket).
create table if not exists public.assessment_files (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  path text not null, name text not null, size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  body text check (char_length(body) <= 10000),
  files jsonb not null default '[]'::jsonb, -- [{path, name, size}] in the private "submissions" bucket
  attempt int not null default 1 check (attempt >= 1),
  submitted_at timestamptz not null default now(),
  is_late boolean not null default false,
  unique (assessment_id, student_id)
);
create index if not exists submissions_student on public.submissions (student_id);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  score numeric(6,2) not null check (score >= 0),
  feedback text check (char_length(feedback) <= 3000),
  released boolean not null default true, -- students and parents see released scores
  graded_by uuid references public.profiles (id) on delete set null,
  graded_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);
create index if not exists scores_student on public.scores (student_id);

/* -------------------------------------------- library, news and messages */

create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text check (char_length(description) <= 2000),
  subject_id uuid references public.subjects (id) on delete set null,
  grade_level_id uuid references public.grade_levels (id) on delete set null,
  academic_year_id uuid references public.academic_years (id) on delete set null,
  topic text, type public.resource_type not null,
  file_path text, url text, -- a file in "materials", or a link (e.g. a video)
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (file_path is not null or url is not null)
);
create index if not exists resources_school on public.learning_resources (school_id, grade_level_id, subject_id);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 5000),
  audience public.audience not null default 'everyone',
  class_id uuid references public.classes (id) on delete cascade, -- when audience = 'class'
  author_id uuid references public.profiles (id) on delete set null,
  pinned boolean not null default false,
  published_at timestamptz not null default now(),
  check ((audience = 'class') = (class_id is not null))
);
create index if not exists announcements_school on public.announcements (school_id, published_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid references public.students (id) on delete set null, -- which child it's about (optional)
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists messages_recipient on public.messages (recipient_id, created_at desc);
create index if not exists messages_sender on public.messages (sender_id, created_at desc);

-- In-app notifications (channel kept so SMS / email / push can be added later).
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null, -- new_assessment, grade_released, absent, submission, announcement, message
  title text not null, body text, link text,
  channel text not null default 'in_app',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications (user_id, created_at desc);
