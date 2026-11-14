-- 0006_common_expenses_and_splits.sql
-- Adds home association, common toggle, and payer tracking to expenses

alter table public.expenses
  add column if not exists home_id uuid references public.homes (id) on delete set null,
  add column if not exists is_common boolean not null default false,
  add column if not exists paid_by uuid references public.profiles (id) on delete set null,
  add column if not exists split_rule text not null default 'equal';

create index if not exists expenses_home_id_idx on public.expenses (home_id);
create index if not exists expenses_is_common_idx on public.expenses (is_common);

-- RLS: Allow members of a home to view common expenses belonging to that home
drop policy if exists "expenses_select_own" on public.expenses;
drop policy if exists "expenses_select_own_or_common" on public.expenses;
create policy "expenses_select_own_or_common"
  on public.expenses for select
  to authenticated
  using (
    user_id = auth.uid()
    or (
      is_common = true
      and home_id is not null
      and public.is_home_member(home_id, auth.uid())
    )
  );

