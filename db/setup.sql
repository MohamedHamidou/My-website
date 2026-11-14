-- Pocket Eye: fresh database setup
-- Run once in the Supabase SQL editor on a brand-new project.
-- Combines db/migrations/0001 through 0004, then the canonical 0007 home repair.
-- Re-running will fail because the base tables already exist (0007 itself is idempotent).
-- Do not apply 0005_* or 0006 separately; 0007 supersedes them.


-- ============================================================
-- db\migrations\0001_profiles_and_categories.sql
-- ============================================================

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null default '',
  currency text not null default 'BDT',
  locale text not null default 'en',
  month_start_day smallint not null default 1 check (month_start_day between 1 and 28),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  icon text not null default 'circle',
  color text not null default '#0F766E',
  type text not null default 'expense' check (type in ('expense', 'income')),
  is_default boolean not null default false,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

create index categories_user_id_idx on public.categories (user_id);
create index categories_user_type_idx on public.categories (user_id, type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, icon, color, type, is_default, position)
  values
    (new.id, 'Rent', 'home', '#0F766E', 'expense', true, 0),
    (new.id, 'Utilities', 'zap', '#D97706', 'expense', true, 1),
    (new.id, 'Groceries', 'shopping-basket', '#16A34A', 'expense', true, 2),
    (new.id, 'Transport', 'bus', '#0EA5E9', 'expense', true, 3),
    (new.id, 'Eating out', 'utensils', '#F59E0B', 'expense', true, 4),
    (new.id, 'Health', 'heart-pulse', '#DC2626', 'expense', true, 5),
    (new.id, 'Internet & Phone', 'wifi', '#6366F1', 'expense', true, 6),
    (new.id, 'Household items', 'spray-can', '#8B5CF6', 'expense', true, 7),
    (new.id, 'Personal', 'user', '#6B7280', 'expense', true, 8),
    (new.id, 'Other', 'circle', '#6B7280', 'expense', true, 9),
    (new.id, 'Salary', 'banknote', '#16A34A', 'income', true, 0),
    (new.id, 'Freelance', 'laptop', '#0EA5E9', 'income', true, 1),
    (new.id, 'Allowance', 'hand-coins', '#F59E0B', 'income', true, 2),
    (new.id, 'Other income', 'plus', '#6B7280', 'income', true, 3)
  on conflict (user_id, name, type) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "categories_select_own"
on public.categories for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "categories_insert_own"
on public.categories for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "categories_update_own"
on public.categories for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "categories_delete_own"
on public.categories for delete
to authenticated
using ((select auth.uid()) = user_id);


-- ============================================================
-- db\migrations\0002_expenses_and_incomes.sql
-- ============================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid references public.categories (id) on delete restrict,
  amount integer not null check (amount > 0),
  date date not null default current_date,
  note text not null default '',
  payment_method text not null default 'cash'
    check (payment_method in ('cash', 'bkash', 'nagad', 'card', 'bank')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid references public.categories (id) on delete restrict,
  amount integer not null check (amount > 0),
  date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_user_date_idx on public.expenses (user_id, date desc);
create index expenses_user_category_idx on public.expenses (user_id, category_id);
create index incomes_user_date_idx on public.incomes (user_id, date desc);
create index incomes_user_category_idx on public.incomes (user_id, category_id);

create trigger expenses_set_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

create trigger incomes_set_updated_at
before update on public.incomes
for each row
execute function public.set_updated_at();

alter table public.expenses enable row level security;
alter table public.incomes enable row level security;

create policy "expenses_select_own"
on public.expenses for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "expenses_insert_own"
on public.expenses for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "expenses_update_own"
on public.expenses for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "expenses_delete_own"
on public.expenses for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "incomes_select_own"
on public.incomes for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "incomes_insert_own"
on public.incomes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "incomes_update_own"
on public.incomes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "incomes_delete_own"
on public.incomes for delete
to authenticated
using ((select auth.uid()) = user_id);


-- ============================================================
-- db\migrations\0003_budgets_and_goals.sql
-- ============================================================

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  limit_amount integer not null check (limit_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create index budgets_user_id_idx on public.budgets (user_id);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  target_amount integer not null check (target_amount > 0),
  saved_amount integer not null default 0 check (saved_amount >= 0),
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index savings_goals_user_id_idx on public.savings_goals (user_id);

create trigger budgets_set_updated_at
before update on public.budgets
for each row
execute function public.set_updated_at();

create trigger savings_goals_set_updated_at
before update on public.savings_goals
for each row
execute function public.set_updated_at();

alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;

create policy "budgets_select_own"
on public.budgets for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "budgets_insert_own"
on public.budgets for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.categories c
    where c.id = category_id
      and c.user_id = (select auth.uid())
  )
);

create policy "budgets_update_own"
on public.budgets for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.categories c
    where c.id = category_id
      and c.user_id = (select auth.uid())
  )
);

create policy "budgets_delete_own"
on public.budgets for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "savings_goals_select_own"
on public.savings_goals for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "savings_goals_insert_own"
on public.savings_goals for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "savings_goals_update_own"
on public.savings_goals for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "savings_goals_delete_own"
on public.savings_goals for delete
to authenticated
using ((select auth.uid()) = user_id);


-- ============================================================
-- db\migrations\0004_inventory_and_shopping.sql
-- ============================================================

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  category text not null default 'other'
    check (category in ('kitchen', 'cleaning', 'bathroom', 'food', 'furniture', 'electronics', 'other')),
  quantity numeric(10, 2) not null default 0 check (quantity >= 0),
  unit text not null default 'pcs',
  min_threshold numeric(10, 2) not null default 0 check (min_threshold >= 0),
  location text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inventory_items_user_category_idx
on public.inventory_items (user_id, category);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  quantity text not null default '',
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shopping_items_user_checked_idx
on public.shopping_items (user_id, checked);

create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row
execute function public.set_updated_at();

create trigger shopping_items_set_updated_at
before update on public.shopping_items
for each row
execute function public.set_updated_at();

alter table public.inventory_items enable row level security;
alter table public.shopping_items enable row level security;

create policy "inventory_items_select_own"
on public.inventory_items for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "inventory_items_insert_own"
on public.inventory_items for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "inventory_items_update_own"
on public.inventory_items for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "inventory_items_delete_own"
on public.inventory_items for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "shopping_items_select_own"
on public.shopping_items for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "shopping_items_insert_own"
on public.shopping_items for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "shopping_items_update_own"
on public.shopping_items for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "shopping_items_delete_own"
on public.shopping_items for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ============================================================
-- db\migrations\0007_fix_homes.sql
-- ============================================================

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

-- db\migrations\0008_shared_inventory_and_shopping.sql
-- Share inventory and manual shopping items with a Home.
--
-- Personal rows keep home_id = null and is_common = false.
-- Shared rows belong to a home and are visible to every member of that home.

alter table public.inventory_items
  add column if not exists home_id uuid references public.homes (id) on delete cascade,
  add column if not exists is_common boolean not null default false;

alter table public.shopping_items
  add column if not exists home_id uuid references public.homes (id) on delete cascade,
  add column if not exists is_common boolean not null default false;

create index if not exists inventory_items_home_category_idx
on public.inventory_items (home_id, category);

create index if not exists shopping_items_home_checked_idx
on public.shopping_items (home_id, checked);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inventory_items'::regclass
      and conname = 'inventory_items_sharing_check'
  ) then
    alter table public.inventory_items
      add constraint inventory_items_sharing_check
      check (
        (is_common = true and home_id is not null)
        or (is_common = false and home_id is null)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.shopping_items'::regclass
      and conname = 'shopping_items_sharing_check'
  ) then
    alter table public.shopping_items
      add constraint shopping_items_sharing_check
      check (
        (is_common = true and home_id is not null)
        or (is_common = false and home_id is null)
      );
  end if;
end
$$;

-- Keep ownership stable and normalise the sharing columns on every write.
create or replace function public.normalize_shared_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
  end if;

  if new.is_common then
    if new.home_id is null then
      raise exception 'Shared items must belong to a home';
    end if;
  else
    new.home_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists inventory_items_normalize_sharing on public.inventory_items;
create trigger inventory_items_normalize_sharing
before insert or update on public.inventory_items
for each row
execute function public.normalize_shared_item();

drop trigger if exists shopping_items_normalize_sharing on public.shopping_items;
create trigger shopping_items_normalize_sharing
before insert or update on public.shopping_items
for each row
execute function public.normalize_shared_item();

alter table public.inventory_items enable row level security;
alter table public.shopping_items enable row level security;

drop policy if exists "inventory_items_select_own" on public.inventory_items;
drop policy if exists "inventory_items_insert_own" on public.inventory_items;
drop policy if exists "inventory_items_update_own" on public.inventory_items;
drop policy if exists "inventory_items_delete_own" on public.inventory_items;
drop policy if exists "inventory_items_select_own_or_shared" on public.inventory_items;
drop policy if exists "inventory_items_insert_own_or_shared" on public.inventory_items;
drop policy if exists "inventory_items_update_own_or_shared" on public.inventory_items;
drop policy if exists "inventory_items_delete_own_or_shared" on public.inventory_items;

create policy "inventory_items_select_own_or_shared"
on public.inventory_items for select
to authenticated
using (
  (select auth.uid()) = user_id
  or (
    is_common = true
    and home_id is not null
    and public.is_home_member(home_id, (select auth.uid()))
  )
);

create policy "inventory_items_insert_own_or_shared"
on public.inventory_items for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    (
      is_common = true
      and home_id is not null
      and public.is_home_member(home_id, (select auth.uid()))
    )
    or (is_common = false and home_id is null)
  )
);

create policy "inventory_items_update_own_or_shared"
on public.inventory_items for update
to authenticated
using (
  (select auth.uid()) = user_id
  or (
    is_common = true
    and home_id is not null
    and public.is_home_member(home_id, (select auth.uid()))
  )
)
with check (
  (
    is_common = true
    and home_id is not null
    and public.is_home_member(home_id, (select auth.uid()))
  )
  or (is_common = false and home_id is null)
);

create policy "inventory_items_delete_own_or_shared"
on public.inventory_items for delete
to authenticated
using (
  (select auth.uid()) = user_id
  or (
    is_common = true
    and home_id is not null
    and public.is_home_member(home_id, (select auth.uid()))
  )
);

drop policy if exists "shopping_items_select_own" on public.shopping_items;
drop policy if exists "shopping_items_insert_own" on public.shopping_items;
drop policy if exists "shopping_items_update_own" on public.shopping_items;
drop policy if exists "shopping_items_delete_own" on public.shopping_items;
drop policy if exists "shopping_items_select_own_or_shared" on public.shopping_items;
drop policy if exists "shopping_items_insert_own_or_shared" on public.shopping_items;
drop policy if exists "shopping_items_update_own_or_shared" on public.shopping_items;
drop policy if exists "shopping_items_delete_own_or_shared" on public.shopping_items;

create policy "shopping_items_select_own_or_shared"
on public.shopping_items for select
to authenticated
using (
  (select auth.uid()) = user_id
  or (
    is_common = true
    and home_id is not null
    and public.is_home_member(home_id, (select auth.uid()))
  )
);

create policy "shopping_items_insert_own_or_shared"
on public.shopping_items for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    (
      is_common = true
      and home_id is not null
      and public.is_home_member(home_id, (select auth.uid()))
    )
    or (is_common = false and home_id is null)
  )
);

create policy "shopping_items_update_own_or_shared"
on public.shopping_items for update
to authenticated
using (
  (select auth.uid()) = user_id
  or (
    is_common = true
    and home_id is not null
    and public.is_home_member(home_id, (select auth.uid()))
  )
)
with check (
  (
    is_common = true
    and home_id is not null
    and public.is_home_member(home_id, (select auth.uid()))
  )
  or (is_common = false and home_id is null)
);

create policy "shopping_items_delete_own_or_shared"
on public.shopping_items for delete
to authenticated
using (
  (select auth.uid()) = user_id
  or (
    is_common = true
    and home_id is not null
    and public.is_home_member(home_id, (select auth.uid()))
  )
);

-- ============================================================
-- db\migrations\0009_expense_stock_links.sql
-- ============================================================

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expense_id uuid not null references public.expenses (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete cascade,
  quantity numeric(10, 2) not null check (quantity > 0),
  home_id uuid references public.homes (id) on delete set null,
  is_common boolean not null default false,
  created_at timestamptz not null default now(),
  constraint stock_movements_expense_unique unique (expense_id),
  constraint stock_movements_sharing_check check (
    (is_common = true and home_id is not null)
    or (is_common = false and home_id is null)
  )
);

create index if not exists stock_movements_item_idx
on public.stock_movements (inventory_item_id);

create index if not exists stock_movements_home_idx
on public.stock_movements (home_id);

alter table public.stock_movements enable row level security;

drop policy if exists "stock_movements_select_own_or_shared" on public.stock_movements;
create policy "stock_movements_select_own_or_shared"
on public.stock_movements for select
to authenticated
using (
  (select auth.uid()) = user_id
  or (
    is_common = true
    and home_id is not null
    and public.is_home_member(home_id, (select auth.uid()))
  )
);

create or replace function public.create_expense_with_stock(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_expense jsonb := coalesce(payload -> 'expense', '{}'::jsonb);
  v_stock jsonb := coalesce(payload -> 'stock', '{}'::jsonb);
  v_item_id uuid := nullif(v_stock ->> 'item_id', '')::uuid;
  v_quantity numeric := nullif(v_stock ->> 'quantity', '')::numeric;
  v_home_id uuid := nullif(v_expense ->> 'home_id', '')::uuid;
  v_is_common boolean := coalesce((v_expense ->> 'is_common')::boolean, false);
  v_stock_home_id uuid := nullif(v_stock ->> 'home_id', '')::uuid;
  v_stock_is_common boolean := coalesce((v_stock ->> 'is_common')::boolean, false);
  v_amount integer := nullif(v_expense ->> 'amount', '')::integer;
  v_category_id uuid := nullif(v_expense ->> 'category_id', '')::uuid;
  v_date date := nullif(v_expense ->> 'date', '')::date;
  v_note text := coalesce(v_expense ->> 'note', '');
  v_payment_method text := coalesce(v_expense ->> 'payment_method', 'cash');
  v_stock_name text := trim(coalesce(v_stock ->> 'name', ''));
  v_stock_category text := coalesce(v_stock ->> 'category', 'other');
  v_stock_unit text := trim(coalesce(v_stock ->> 'unit', 'pcs'));
  v_stock_location text := trim(coalesce(v_stock ->> 'location', ''));
  v_min_threshold numeric := coalesce(nullif(v_stock ->> 'min_threshold', '')::numeric, 0);
  v_item public.inventory_items%rowtype;
  v_created_expense public.expenses%rowtype;
  v_movement public.stock_movements%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_amount is null or v_amount <= 0 then
    raise exception 'Expense amount must be greater than zero';
  end if;

  if v_date is null then
    raise exception 'Expense date is required';
  end if;

  if v_payment_method not in ('cash', 'bkash', 'nagad', 'card', 'bank') then
    raise exception 'Invalid payment method';
  end if;

  if v_quantity is null or v_quantity <= 0 then
    raise exception 'Stock quantity must be greater than zero';
  end if;

  if v_category_id is not null and not exists (
    select 1
    from public.categories
    where id = v_category_id
      and user_id = v_user_id
  ) then
    raise exception 'Expense category not found';
  end if;

  if v_is_common <> v_stock_is_common then
    raise exception 'Expense and stock sharing must match';
  end if;

  if v_is_common then
    if v_home_id is null or not public.is_home_member(v_home_id, v_user_id) then
      raise exception 'Not a member of this home';
    end if;
  else
    v_home_id := null;
  end if;

  if v_stock_is_common then
    if v_stock_home_id is null
       or not public.is_home_member(v_stock_home_id, v_user_id) then
      raise exception 'Not a member of this home';
    end if;
  else
    v_stock_home_id := null;
  end if;

  if v_is_common and v_home_id <> v_stock_home_id then
    raise exception 'Expense and stock must belong to the same home';
  end if;

  if v_item_id is not null then
    select *
    into v_item
    from public.inventory_items
    where id = v_item_id
    for update;

    if not found then
      raise exception 'Stock item not found';
    end if;

    if not (
      v_item.user_id = v_user_id
      or (
        v_item.is_common = true
        and v_item.home_id is not null
        and public.is_home_member(v_item.home_id, v_user_id)
      )
    ) then
      raise exception 'Stock item is not available';
    end if;

    if v_stock_is_common
       and v_item.is_common = true
       and v_item.home_id <> v_stock_home_id then
      raise exception 'Stock item belongs to another home';
    end if;

    update public.inventory_items
    set quantity = quantity + v_quantity,
        home_id = v_stock_home_id,
        is_common = v_stock_is_common
    where id = v_item.id
    returning * into v_item;
  else
    if length(v_stock_name) < 2 then
      raise exception 'Stock item name must be at least 2 characters';
    end if;

    if v_stock_category not in (
      'kitchen', 'cleaning', 'bathroom', 'food',
      'furniture', 'electronics', 'other'
    ) then
      raise exception 'Invalid stock category';
    end if;

    if v_stock_unit = '' then
      raise exception 'Stock unit is required';
    end if;

    if v_min_threshold < 0 then
      raise exception 'Minimum threshold cannot be negative';
    end if;

    insert into public.inventory_items (
      user_id, home_id, is_common, name, category,
      quantity, unit, min_threshold, location
    )
    values (
      v_user_id, v_stock_home_id, v_stock_is_common, v_stock_name,
      v_stock_category, v_quantity, v_stock_unit, v_min_threshold,
      v_stock_location
    )
    returning * into v_item;
  end if;

  insert into public.expenses (
    user_id, category_id, amount, date, note, payment_method,
    home_id, is_common, paid_by, split_rule
  )
  values (
    v_user_id, v_category_id, v_amount, v_date, v_note, v_payment_method,
    v_home_id, v_is_common, v_user_id, 'equal'
  )
  returning * into v_created_expense;

  insert into public.stock_movements (
    user_id, expense_id, inventory_item_id, quantity, home_id, is_common
  )
  values (
    v_user_id, v_created_expense.id, v_item.id, v_quantity,
    v_stock_home_id, v_stock_is_common
  )
  returning * into v_movement;

  return jsonb_build_object(
    'expense', to_jsonb(v_created_expense),
    'item', to_jsonb(v_item),
    'movement', to_jsonb(v_movement)
  );
end;
$$;

create or replace function public.reverse_expense_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_movement public.stock_movements%rowtype;
begin
  for v_movement in
    select *
    from public.stock_movements
    where expense_id = old.id
  loop
    update public.inventory_items
    set quantity = greatest(quantity - v_movement.quantity, 0)
    where id = v_movement.inventory_item_id;

    delete from public.stock_movements
    where id = v_movement.id;
  end loop;

  return old;
end;
$$;

drop trigger if exists expenses_reverse_stock_on_delete on public.expenses;
create trigger expenses_reverse_stock_on_delete
before delete on public.expenses
for each row
execute function public.reverse_expense_stock();

revoke all on function public.create_expense_with_stock(jsonb)
  from public, anon, authenticated;
revoke all on function public.reverse_expense_stock()
  from public, anon, authenticated;

grant execute on function public.create_expense_with_stock(jsonb)
  to authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================
-- db\migrations\0010_income_payment_methods.sql
-- ============================================================

alter table public.incomes
  add column if not exists payment_method text;

update public.incomes
set payment_method = 'cash'
where payment_method is null;

alter table public.incomes
  alter column payment_method set default 'cash';

alter table public.incomes
  alter column payment_method set not null;

alter table public.incomes
  drop constraint if exists incomes_payment_method_check;

alter table public.incomes
  add constraint incomes_payment_method_check
  check (payment_method in ('cash', 'bkash', 'bank'));

notify pgrst, 'reload schema';
