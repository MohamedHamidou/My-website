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
