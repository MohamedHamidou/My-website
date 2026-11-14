-- ============================================================
-- FRESH START: Run this ENTIRE block in Supabase SQL Editor
-- This is safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- 1. Create tables (safe if they already exist)
create table if not exists public.homes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.home_members (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (home_id, user_id)
);

create table if not exists public.home_invitations (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  email text,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- 2. Enable RLS (safe to run again)
alter table public.homes enable row level security;
alter table public.home_members enable row level security;
alter table public.home_invitations enable row level security;

-- 3. Create the SECURITY DEFINER helper (prevents RLS recursion)
create or replace function public.is_home_member(check_home_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.home_members
    where home_id = check_home_id
      and user_id = check_user_id
  );
$$;

-- 4. Drop ALL existing policies on home_members (old ones cause infinite recursion)
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'home_members'
  loop
    execute format('drop policy if exists %I on public.home_members', r.policyname);
  end loop;
end;
$$;

-- 5. Drop ALL existing policies on homes
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'homes'
  loop
    execute format('drop policy if exists %I on public.homes', r.policyname);
  end loop;
end;
$$;

-- 6. Drop ALL existing policies on home_invitations
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'home_invitations'
  loop
    execute format('drop policy if exists %I on public.home_invitations', r.policyname);
  end loop;
end;
$$;

-- 7. Create clean policies using the helper (no recursion)

-- homes policies
create policy "homes_select"
  on public.homes for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_home_member(id, auth.uid())
  );

create policy "homes_insert"
  on public.homes for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "homes_update"
  on public.homes for update
  to authenticated
  using (created_by = auth.uid());

create policy "homes_delete"
  on public.homes for delete
  to authenticated
  using (created_by = auth.uid());

-- home_members policies
create policy "home_members_select"
  on public.home_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_home_member(home_id, auth.uid())
  );

create policy "home_members_insert"
  on public.home_members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "home_members_delete"
  on public.home_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.home_members hm
      where hm.home_id = home_members.home_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

-- home_invitations policies
create policy "home_invitations_select"
  on public.home_invitations for select
  to authenticated
  using (
    public.is_home_member(home_id, auth.uid())
    or status = 'pending'
  );

create policy "home_invitations_insert"
  on public.home_invitations for insert
  to authenticated
  with check (
    auth.uid() = invited_by
    and public.is_home_member(home_id, auth.uid())
  );

create policy "home_invitations_update"
  on public.home_invitations for update
  to authenticated
  using (public.is_home_member(home_id, auth.uid()));

-- 8. Create the create_home RPC (atomic, runs as SECURITY DEFINER = bypasses RLS)
create or replace function public.create_home(home_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_home public.homes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.homes (name, created_by)
  values (trim(home_name), auth.uid())
  returning * into v_home;

  insert into public.home_members (home_id, user_id, role)
  values (v_home.id, auth.uid(), 'owner')
  on conflict (home_id, user_id) do nothing;

  return to_jsonb(v_home);
end;
$$;

-- 9. Create get_my_home RPC
create or replace function public.get_my_home()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
  v_home record;
begin
  if auth.uid() is null then
    return null;
  end if;

  select * into v_member
  from public.home_members
  where user_id = auth.uid()
  limit 1;

  if not found then
    return null;
  end if;

  select * into v_home
  from public.homes
  where id = v_member.home_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'home', to_jsonb(v_home),
    'membership', to_jsonb(v_member)
  );
end;
$$;

-- 10. Create get_home_members RPC
create or replace function public.get_home_members(target_home_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_home_member(target_home_id, auth.uid()) then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', hm.id,
          'home_id', hm.home_id,
          'user_id', hm.user_id,
          'role', hm.role,
          'joined_at', hm.joined_at,
          'profile', jsonb_build_object(
            'id', p.id,
            'email', p.email,
            'name', p.name
          )
        )
        order by hm.joined_at asc
      )
      from public.home_members hm
      left join public.profiles p on p.id = hm.user_id
      where hm.home_id = target_home_id
    ),
    '[]'::jsonb
  );
end;
$$;

-- 11. Create join_home_by_token RPC
create or replace function public.join_home_by_token(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_home record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invite
  from public.home_invitations
  where upper(token) = upper(trim(invite_token))
    and status = 'pending'
    and expires_at > now()
  limit 1;

  if not found then
    raise exception 'Invalid or expired invitation code';
  end if;

  select * into v_home
  from public.homes
  where id = v_invite.home_id;

  -- Already a member? Just return success
  if public.is_home_member(v_invite.home_id, auth.uid()) then
    return jsonb_build_object('home_id', v_home.id, 'home_name', v_home.name, 'already_member', true);
  end if;

  insert into public.home_members (home_id, user_id, role)
  values (v_invite.home_id, auth.uid(), 'member');

  update public.home_invitations
  set status = 'accepted'
  where id = v_invite.id;

  return jsonb_build_object('home_id', v_home.id, 'home_name', v_home.name, 'already_member', false);
end;
$$;

-- ============================================================
-- VERIFY: Run these after the above succeeds
-- ============================================================
-- select public.is_home_member(gen_random_uuid(), gen_random_uuid()); -- expect: false
-- select public.get_my_home(); -- expect: null or your home JSON
-- select public.create_home('Test Home'); -- creates a home!
-- select * from public.homes; -- verify the home was inserted

