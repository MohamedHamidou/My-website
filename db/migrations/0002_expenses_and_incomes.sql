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
