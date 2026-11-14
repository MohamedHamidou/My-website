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
