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
