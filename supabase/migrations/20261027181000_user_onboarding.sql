-- Dashboard "first steps" checklist: per-user progress and dismissal, so it follows the user across devices.
create table if not exists public.user_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_steps text[] not null default '{}',
  dismissed boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_onboarding enable row level security;

drop policy if exists "Own onboarding select" on public.user_onboarding;
create policy "Own onboarding select" on public.user_onboarding for select using (auth.uid() = user_id);
drop policy if exists "Own onboarding insert" on public.user_onboarding;
create policy "Own onboarding insert" on public.user_onboarding for insert with check (auth.uid() = user_id);
drop policy if exists "Own onboarding update" on public.user_onboarding;
create policy "Own onboarding update" on public.user_onboarding for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.user_onboarding to authenticated;
