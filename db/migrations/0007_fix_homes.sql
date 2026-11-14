-- 0007_fix_homes.sql
-- Canonical repair for shared homes, memberships, invitations, RPCs, and
-- common expenses. Supersedes 0005_shared_homes_and_invites.sql,
-- 0005_patch_fix_rls.sql, 0005_fresh_start.sql, and 0006.
--
-- Prerequisite: migrations 0001-0004 are applied.
-- Run this entire file in the Supabase SQL Editor (as the postgres role).
-- Safe to run multiple times.

-- ============================================================
-- 1. Tables, indexes, trigger, RLS
-- ============================================================

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

create index if not exists homes_created_by_idx on public.homes (created_by);
create index if not exists home_members_home_id_idx on public.home_members (home_id);
create index if not exists home_members_user_id_idx on public.home_members (user_id);
create index if not exists home_invitations_token_idx on public.home_invitations (token);
create index if not exists home_invitations_home_id_idx on public.home_invitations (home_id);

drop trigger if exists homes_set_updated_at on public.homes;
create trigger homes_set_updated_at
before update on public.homes
for each row
execute function public.set_updated_at();

alter table public.homes enable row level security;
alter table public.home_members enable row level security;
alter table public.home_invitations enable row level security;

-- ============================================================
-- 1b. Repair orphaned rows and enforce cascade foreign keys
-- ============================================================
-- If these tables were created before the foreign keys existed, deleting a
-- home can leave a membership behind. That makes get_my_home() return null
-- while create_home() still sees a membership and refuses to create one.

delete from public.home_members as hm
where not exists (
  select 1 from public.homes h where h.id = hm.home_id
);

delete from public.home_invitations as hi
where not exists (
  select 1 from public.homes h where h.id = hi.home_id
);

do $$
declare
  v_member_home_col smallint;
  v_invite_home_col smallint;
  v_has_cascade boolean;
  r record;
begin
  select attnum into v_member_home_col
  from pg_attribute
  where attrelid = 'public.home_members'::regclass
    and attname = 'home_id';

  select exists (
    select 1
    from pg_constraint
    where conrelid = 'public.home_members'::regclass
      and contype = 'f'
      and confrelid = 'public.homes'::regclass
      and conkey = array[v_member_home_col]
      and confdeltype = 'c'
  ) into v_has_cascade;

  if not v_has_cascade then
    for r in
      select conname
      from pg_constraint
      where conrelid = 'public.home_members'::regclass
        and contype = 'f'
        and confrelid = 'public.homes'::regclass
        and conkey = array[v_member_home_col]
    loop
      execute format(
        'alter table public.home_members drop constraint %I',
        r.conname
      );
    end loop;

    alter table public.home_members
      add constraint home_members_home_id_fkey
      foreign key (home_id) references public.homes (id) on delete cascade;
  end if;

  select attnum into v_invite_home_col
  from pg_attribute
  where attrelid = 'public.home_invitations'::regclass
    and attname = 'home_id';

  select exists (
    select 1
    from pg_constraint
    where conrelid = 'public.home_invitations'::regclass
      and contype = 'f'
      and confrelid = 'public.homes'::regclass
      and conkey = array[v_invite_home_col]
      and confdeltype = 'c'
  ) into v_has_cascade;

  if not v_has_cascade then
    for r in
      select conname
      from pg_constraint
      where conrelid = 'public.home_invitations'::regclass
        and contype = 'f'
        and confrelid = 'public.homes'::regclass
        and conkey = array[v_invite_home_col]
    loop
      execute format(
        'alter table public.home_invitations drop constraint %I',
        r.conname
      );
    end loop;

    alter table public.home_invitations
      add constraint home_invitations_home_id_fkey
      foreign key (home_id) references public.homes (id) on delete cascade;
  end if;
end;
$$;

-- ============================================================
-- 2. One home per user (safe pre-check, then unique index)
-- ============================================================
-- If this raises, remove the extra memberships first, then rerun this file.
-- Run this cleanup as its own statement (do not run it in the same batch as
-- the rest of this migration, or the error below will roll the cleanup back).
-- Keep a specific membership by replacing the ORDER BY with a home_id filter.

do $$
declare
  v_dupes text;
begin
  select string_agg(format('%s (%s homes)', user_id, cnt), ', ')
  into v_dupes
  from (
    select user_id, count(*) as cnt
    from public.home_members
    group by user_id
    having count(*) > 1
  ) d;

  if v_dupes is not null then
    raise exception
      'Cannot enforce one home per user. Resolve these memberships first: %',
      v_dupes;
  end if;
end;
$$;

create unique index if not exists home_members_user_id_key
  on public.home_members (user_id);

-- ============================================================
-- 3. Common expenses columns (from 0006)
-- ============================================================

alter table public.expenses
  add column if not exists home_id uuid references public.homes (id) on delete set null,
  add column if not exists is_common boolean not null default false,
  add column if not exists paid_by uuid references public.profiles (id) on delete set null,
  add column if not exists split_rule text not null default 'equal';

create index if not exists expenses_home_id_idx on public.expenses (home_id);
create index if not exists expenses_is_common_idx on public.expenses (is_common);

-- ============================================================
-- 4. Drop old policies before dropping/replacing functions
-- ============================================================

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

  for r in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'home_members'
  loop
    execute format('drop policy if exists %I on public.home_members', r.policyname);
  end loop;

  for r in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'home_invitations'
  loop
    execute format('drop policy if exists %I on public.home_invitations', r.policyname);
  end loop;
end;
$$;

drop policy if exists "Users can view housemates profiles" on public.profiles;
drop policy if exists "expenses_select_own" on public.expenses;
drop policy if exists "expenses_select_own_or_common" on public.expenses;

-- ============================================================
-- 5. Drop old functions by exact signature
-- ============================================================

drop function if exists public.create_home_invitation(uuid, text);
drop function if exists public.join_home_by_token(text);
drop function if exists public.get_home_members(uuid);
drop function if exists public.get_my_home();
drop function if exists public.create_home(text);
drop function if exists public.is_home_owner(uuid, uuid);
drop function if exists public.is_home_member(uuid, uuid);

-- ============================================================
-- 6. SECURITY DEFINER helpers (bypass RLS, prevent recursion)
-- ============================================================

create or replace function public.is_home_member(check_home_id uuid, check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.home_members
    where home_id = check_home_id
      and user_id = check_user_id
  );
$$;

create or replace function public.is_home_owner(check_home_id uuid, check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.home_members
    where home_id = check_home_id
      and user_id = check_user_id
      and role = 'owner'
  );
$$;

-- ============================================================
-- 7. RPCs
-- ============================================================

create or replace function public.create_home(home_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_home public.homes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if nullif(trim(home_name), '') is null then
    raise exception 'Home name is required';
  end if;

  -- Remove a membership left behind by a deleted home.
  delete from public.home_members as hm
  where hm.user_id = auth.uid()
    and not exists (
      select 1 from public.homes h where h.id = hm.home_id
    );

  if exists (
    select 1 from public.home_members where user_id = auth.uid()
  ) then
    raise exception 'You already belong to a home';
  end if;

  insert into public.homes (name, created_by)
  values (trim(home_name), auth.uid())
  returning * into v_home;

  insert into public.home_members (home_id, user_id, role)
  values (v_home.id, auth.uid(), 'owner')
  on conflict (home_id, user_id) do nothing;

  return to_jsonb(v_home);
exception
  when unique_violation then
    raise exception 'You already belong to a home';
end;
$$;

create or replace function public.get_my_home()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member public.home_members%rowtype;
  v_home public.homes%rowtype;
begin
  if auth.uid() is null then
    return null;
  end if;

  select hm.*
  into v_member
  from public.home_members hm
  join public.homes h on h.id = hm.home_id
  where hm.user_id = auth.uid()
  limit 1;

  if not found then
    return null;
  end if;

  select *
  into v_home
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

create or replace function public.get_home_members(target_home_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or not public.is_home_member(target_home_id, auth.uid()) then
    raise exception 'Not authorized';
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

create or replace function public.join_home_by_token(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.home_invitations%rowtype;
  v_home public.homes%rowtype;
  v_my_home_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Remove a membership left behind by a deleted home.
  delete from public.home_members as hm
  where hm.user_id = auth.uid()
    and not exists (
      select 1 from public.homes h where h.id = hm.home_id
    );

  select *
  into v_invite
  from public.home_invitations
  where upper(token) = upper(trim(invite_token))
    and status = 'pending'
    and expires_at > now()
  limit 1;

  if not found then
    raise exception 'Invalid or expired invitation code';
  end if;

  select *
  into v_home
  from public.homes
  where id = v_invite.home_id;

  if not found then
    raise exception 'Home no longer exists';
  end if;

  select home_id
  into v_my_home_id
  from public.home_members
  where user_id = auth.uid()
  limit 1;

  if v_my_home_id is not null then
    if v_my_home_id = v_invite.home_id then
      update public.home_invitations
      set status = 'accepted'
      where id = v_invite.id;

      return jsonb_build_object(
        'home_id', v_home.id,
        'home_name', v_home.name,
        'already_member', true
      );
    end if;

    raise exception 'You already belong to a home';
  end if;

  insert into public.home_members (home_id, user_id, role)
  values (v_invite.home_id, auth.uid(), 'member');

  update public.home_invitations
  set status = 'accepted'
  where id = v_invite.id;

  return jsonb_build_object(
    'home_id', v_home.id,
    'home_name', v_home.name,
    'already_member', false
  );
exception
  when unique_violation then
    raise exception 'You already belong to a home';
end;
$$;

create or replace function public.create_home_invitation(
  target_home_id uuid,
  invite_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.home_invitations%rowtype;
  v_token text;
begin
  if auth.uid() is null
     or not public.is_home_member(target_home_id, auth.uid()) then
    raise exception 'Not authorized';
  end if;

  v_token := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.home_invitations (home_id, invited_by, email, token, status)
  values (
    target_home_id,
    auth.uid(),
    nullif(trim(invite_email), ''),
    v_token,
    'pending'
  )
  returning * into v_invite;

  return to_jsonb(v_invite);
end;
$$;

-- ============================================================
-- 8. Policies (writes go through RPCs, so no INSERT policies)
-- ============================================================

create policy "homes_select"
  on public.homes for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or public.is_home_member(id, (select auth.uid()))
  );

create policy "homes_update"
  on public.homes for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "homes_delete"
  on public.homes for delete
  to authenticated
  using (created_by = (select auth.uid()));

create policy "home_members_select"
  on public.home_members for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_home_member(home_id, (select auth.uid()))
  );

create policy "home_members_delete"
  on public.home_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_home_owner(home_id, (select auth.uid()))
  );

create policy "home_invitations_select"
  on public.home_invitations for select
  to authenticated
  using (
    public.is_home_member(home_id, (select auth.uid()))
  );

create policy "home_invitations_update"
  on public.home_invitations for update
  to authenticated
  using (
    public.is_home_member(home_id, (select auth.uid()))
    and (
      invited_by = (select auth.uid())
      or public.is_home_owner(home_id, (select auth.uid()))
    )
  )
  with check (
    public.is_home_member(home_id, (select auth.uid()))
    and (
      invited_by = (select auth.uid())
      or public.is_home_owner(home_id, (select auth.uid()))
    )
  );

create policy "Users can view housemates profiles"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.home_members hm
      where hm.user_id = profiles.id
        and public.is_home_member(hm.home_id, (select auth.uid()))
    )
  );

create policy "expenses_select_own_or_common"
  on public.expenses for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      is_common = true
      and home_id is not null
      and public.is_home_member(home_id, (select auth.uid()))
    )
  );

-- ============================================================
-- 9. Grants + PostgREST schema reload
-- ============================================================

revoke all on function public.is_home_member(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.is_home_owner(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.create_home(text)
  from public, anon, authenticated;
revoke all on function public.get_my_home()
  from public, anon, authenticated;
revoke all on function public.get_home_members(uuid)
  from public, anon, authenticated;
revoke all on function public.join_home_by_token(text)
  from public, anon, authenticated;
revoke all on function public.create_home_invitation(uuid, text)
  from public, anon, authenticated;

grant execute on function public.is_home_member(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.is_home_owner(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.create_home(text)
  to authenticated, service_role;
grant execute on function public.get_my_home()
  to authenticated, service_role;
grant execute on function public.get_home_members(uuid)
  to authenticated, service_role;
grant execute on function public.join_home_by_token(text)
  to authenticated, service_role;
grant execute on function public.create_home_invitation(uuid, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================
-- Verification (run separately after this script succeeds)
-- ============================================================
-- select public.is_home_member(gen_random_uuid(), gen_random_uuid());
--   -> false, returns immediately
--
-- select proname, prosecdef
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and proname in (
--     'is_home_member', 'is_home_owner', 'create_home', 'get_my_home',
--     'get_home_members', 'join_home_by_token', 'create_home_invitation'
--   );
--   -> prosecdef = true for every row
--
-- select user_id, count(*)
-- from public.home_members
-- group by user_id
-- having count(*) > 1;
--   -> no rows
