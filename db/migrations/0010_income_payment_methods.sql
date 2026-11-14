-- 0010_income_payment_methods.sql
-- Track where income was received so wallet balances can match expenses.

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
