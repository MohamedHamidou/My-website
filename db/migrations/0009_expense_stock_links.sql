-- 0009_expense_stock_links.sql
-- Link one expense to one stock purchase and reverse the stock change on delete.

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

-- Create the expense, stock update, and movement in one transaction.
-- The payload shape is:
-- {
--   "expense": { "amount", "category_id", "date", "note", "payment_method",
--                "is_common", "home_id" },
--   "stock":   { "item_id", "name", "category", "quantity", "unit",
--                "min_threshold", "location", "is_common", "home_id" }
-- }
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

-- Reverse the stock increment before the expense row is removed.
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
