-- Prompt library moves from localStorage to the database (own rows only).
create table public.library_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 300),
  content text not null check (char_length(content) <= 60000),
  description text check (char_length(description) <= 2000),
  category text not null default 'other',
  tags text[] not null default '{}',
  output_type text not null default 'text',
  target_model text,
  tone text,
  variables jsonb not null default '[]',
  score jsonb,
  feedback jsonb,
  current_version_id uuid,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index library_prompts_user_idx on public.library_prompts(user_id, updated_at desc);

create table public.library_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.library_prompts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null check (char_length(content) <= 60000),
  label text check (char_length(label) <= 300),
  created_at timestamptz not null default now()
);
create index library_prompt_versions_prompt_idx on public.library_prompt_versions(prompt_id, created_at);

alter table public.library_prompts enable row level security;
alter table public.library_prompt_versions enable row level security;

create policy "own prompts select" on public.library_prompts for select to authenticated using (user_id = auth.uid());
create policy "own prompts insert" on public.library_prompts for insert to authenticated with check (user_id = auth.uid());
create policy "own prompts update" on public.library_prompts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own prompts delete" on public.library_prompts for delete to authenticated using (user_id = auth.uid());

create policy "own versions select" on public.library_prompt_versions for select to authenticated using (user_id = auth.uid());
create policy "own versions insert" on public.library_prompt_versions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.library_prompts p where p.id = prompt_id and p.user_id = auth.uid()));
create policy "own versions delete" on public.library_prompt_versions for delete to authenticated using (user_id = auth.uid());

-- Per-user caps to prevent abuse.
create or replace function public.enforce_library_caps() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'library_prompts' then
    if (select count(*) from public.library_prompts where user_id = new.user_id) >= 2000 then raise exception 'LIBRARY_LIMIT_REACHED'; end if;
  else
    if (select count(*) from public.library_prompt_versions where prompt_id = new.prompt_id) >= 200 then raise exception 'VERSION_LIMIT_REACHED'; end if;
  end if;
  return new;
end $$;
create trigger library_prompts_cap before insert on public.library_prompts for each row execute function public.enforce_library_caps();
create trigger library_versions_cap before insert on public.library_prompt_versions for each row execute function public.enforce_library_caps();

create or replace function public.library_prompts_touch() returns trigger language plpgsql as $$
begin
  if new.user_id <> old.user_id then raise exception 'user_id is immutable'; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger library_prompts_touch before update on public.library_prompts for each row execute function public.library_prompts_touch();
