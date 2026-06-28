-- ============================================================================
-- Worldbuilding social schema — run once in Supabase → SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.
-- ============================================================================

-- ── Profiles: public-readable author info ──────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique,
  display_name  text,
  bio           text,
  avatar_url    text,
  favorite_tags text[] default '{}',
  created_at    timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles readable by all" on profiles;
create policy "profiles readable by all" on profiles
  for select using (true);

drop policy if exists "users edit own profile" on profiles;
create policy "users edit own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ── Worlds: one row per world; public ones visible to everyone ─────────────
create table if not exists worlds (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  title       text not null,
  description text default '',
  tags        text[] default '{}',
  is_public   boolean default false,
  data        jsonb default '{}'::jsonb,   -- { home, groups } — the world content
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists worlds_owner_idx  on worlds (owner_id);
create index if not exists worlds_public_idx on worlds (is_public) where is_public;

alter table worlds enable row level security;

drop policy if exists "public or own worlds readable" on worlds;
create policy "public or own worlds readable" on worlds
  for select using (is_public = true or owner_id = auth.uid());

drop policy if exists "users write own worlds" on worlds;
create policy "users write own worlds" on worlds
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ── Optional: auto-create a profile row on signup ──────────────────────────
-- The app also creates the profile on first load (Cloud.ensureProfile), so this
-- trigger is a convenience, not a requirement.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name',
             new.raw_user_meta_data->>'preferred_username',
             split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
