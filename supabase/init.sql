create extension if not exists pgcrypto;

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  countdowns jsonb not null default '[]'::jsonb,
  course_catalog jsonb not null default '[]'::jsonb,
  course_import_meta jsonb,
  materials_catalog jsonb not null default '[]'::jsonb,
  materials_import_meta jsonb,
  daily_todos jsonb not null default '{}'::jsonb,
  daily_hours jsonb not null default '{}'::jsonb,
  checkins jsonb not null default '[]'::jsonb,
  daily_practice jsonb not null default '{}'::jsonb,
  timer_duration_minutes integer not null default 35,
  mock_exams jsonb not null default '[]'::jsonb,
  learning_records jsonb not null default '[]'::jsonb,
  mistake_records jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.set_user_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_user_state_updated_at on public.user_state;

create trigger set_user_state_updated_at
before update on public.user_state
for each row
execute function public.set_user_state_updated_at();

create or replace function public.handle_new_user_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_user_state on auth.users;

create trigger on_auth_user_created_user_state
after insert on auth.users
for each row
execute procedure public.handle_new_user_state();

alter table public.user_state enable row level security;

drop policy if exists "Users can read their own user_state" on public.user_state;
create policy "Users can read their own user_state"
on public.user_state
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own user_state" on public.user_state;
create policy "Users can insert their own user_state"
on public.user_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own user_state" on public.user_state;
create policy "Users can update their own user_state"
on public.user_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('mistake-images', 'mistake-images', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Users can view their own mistake images" on storage.objects;
create policy "Users can view their own mistake images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'mistake-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can upload their own mistake images" on storage.objects;
create policy "Users can upload their own mistake images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mistake-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can delete their own mistake images" on storage.objects;
create policy "Users can delete their own mistake images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mistake-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
