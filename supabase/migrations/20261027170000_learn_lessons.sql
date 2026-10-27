-- Aprender / Learn: lesson catalogue (public metadata), lesson bodies (gated by RLS) and per-user progress.
-- Free = the 5 Fundamentos + the first lesson of each sector. Paid lessons: pro, premium or admin.

create table if not exists public.learn_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  track text not null check (track in ('fundamentos','setor','avancado')),
  sector text check (sector in ('marketing','pme','freelancers','imobiliario','hotelaria')),
  sort_order int not null default 0,
  is_free boolean not null default false,
  duration_min int not null default 5,
  level text not null default 'basico' check (level in ('basico','intermedio','avancado')),
  title_pt text not null,
  title_en text not null,
  summary_pt text not null,
  summary_en text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learn_lesson_content (
  lesson_id uuid primary key references public.learn_lessons(id) on delete cascade,
  body_pt jsonb not null,
  body_en jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.learn_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.learn_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.learn_lessons enable row level security;
alter table public.learn_lesson_content enable row level security;
alter table public.learn_progress enable row level security;

-- Titles/summaries of active lessons are public (so locked lessons can be listed with an upsell).
drop policy if exists "Active lessons are public" on public.learn_lessons;
create policy "Active lessons are public" on public.learn_lessons
  for select using (is_active = true);

-- Lesson bodies: free lessons for everyone; paid lessons only for pro, premium or admin.
drop policy if exists "Free lessons or entitled users" on public.learn_lesson_content;
create policy "Free lessons or entitled users" on public.learn_lesson_content
  for select using (
    exists (
      select 1 from public.learn_lessons l
      where l.id = learn_lesson_content.lesson_id and l.is_active = true
        and (
          l.is_free = true
          or (
            auth.uid() is not null
            and (
              exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.current_plan in ('pro'::plan_type, 'premium'::plan_type))
              or public.has_role(auth.uid(), 'admin'::app_role)
            )
          )
        )
    )
  );

-- Progress: each user reads/writes only their own rows.
drop policy if exists "Own progress select" on public.learn_progress;
create policy "Own progress select" on public.learn_progress for select using (auth.uid() = user_id);
drop policy if exists "Own progress insert" on public.learn_progress;
create policy "Own progress insert" on public.learn_progress for insert with check (auth.uid() = user_id);
drop policy if exists "Own progress delete" on public.learn_progress;
create policy "Own progress delete" on public.learn_progress for delete using (auth.uid() = user_id);

grant select on public.learn_lessons, public.learn_lesson_content to anon, authenticated;
grant select, insert, delete on public.learn_progress to authenticated;
