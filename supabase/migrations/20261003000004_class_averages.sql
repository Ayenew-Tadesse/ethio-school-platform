-- Class averages without revealing anyone's grade: for each class subject the
-- signed-in person is part of (as its student, a parent of one, its teacher,
-- or an administrator), the mean of the students' weighted results.
-- Only aggregates are returned, and only when at least 5 students have grades,
-- so one student's result can't be worked out from the average.
create or replace function public.class_averages()
returns table (class_subject_id uuid, average numeric)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select cs.id, cs.class_id, cs.school_id from public.class_subjects cs
    where cs.school_id = private.my_school()
      and (private.is_admin(cs.school_id) or private.teaches_class(cs.class_id) or private.in_class(cs.class_id))
  ),
  defaults (kind, weight) as (values
    ('homework'::public.assessment_kind, 10::numeric), ('assignment', 20), ('quiz', 20), ('midterm', 20), ('final', 30)),
  per_kind as (
    select m.id as cs_id, m.school_id, sc.student_id, a.kind, avg(sc.score / a.max_score * 100) as pct
    from mine m
    join public.assessments a on a.class_subject_id = m.id and a.max_score > 0
    join public.scores sc on sc.assessment_id = a.id and sc.released
    join public.students s on s.id = sc.student_id and s.class_id = m.class_id
    group by m.id, m.school_id, sc.student_id, a.kind
  ),
  weighted as (
    select pk.*, coalesce(w.weight, d.weight) as weight
    from per_kind pk join defaults d on d.kind = pk.kind
    left join public.grading_components w on w.school_id = pk.school_id and w.kind = pk.kind
  ),
  per_student as (
    select cs_id, student_id, sum(pct * weight) / nullif(sum(weight), 0) as overall
    from weighted where weight > 0 group by cs_id, student_id
  )
  select cs_id, round(avg(overall), 1) from per_student where overall is not null
  group by cs_id having count(*) >= 5;
$$;
revoke all on function public.class_averages() from public, anon;
grant execute on function public.class_averages() to authenticated;
