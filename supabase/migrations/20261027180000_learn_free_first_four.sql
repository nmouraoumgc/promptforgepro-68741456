-- Aprender / Learn: only the first 4 Fundamentos lessons (by sort_order) stay free.
-- Every other lesson (5th Fundamentos, all sector and advanced lessons) is paid: pro, premium or admin.
-- Bodies stay gated by the existing RLS policy on learn_lesson_content (is_free or entitled).
with ranked as (
  select id, row_number() over (order by sort_order, created_at) as rn
  from public.learn_lessons
  where track = 'fundamentos' and is_active = true
)
update public.learn_lessons l
set is_free = coalesce((select r.rn <= 4 from ranked r where r.id = l.id), false),
    updated_at = now()
where l.is_free is distinct from coalesce((select r.rn <= 4 from ranked r where r.id = l.id), false);

-- New lessons default to paid.
alter table public.learn_lessons alter column is_free set default false;
