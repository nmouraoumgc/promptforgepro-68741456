-- Account area: display name. Also closes a hole where signed-in users could
-- update their own profiles.current_plan via the REST API. Plans only change
-- through the service role (payments webhook / admin). No plan values change here.
alter table public.profiles add column if not exists display_name text check (char_length(display_name) <= 80);
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;
