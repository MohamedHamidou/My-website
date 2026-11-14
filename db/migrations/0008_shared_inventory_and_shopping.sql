-- 0008_shared_inventory_and_shopping.sql
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

notify pgrst, 'reload schema';
