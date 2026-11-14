# Phase 2: Budgets & Savings — Tasks

- [x] Task 1: Migration `db/migrations/0003_budgets_and_goals.sql`
  - Acceptance: tables `budgets`, `savings_goals` with constraints, indexes, updated_at triggers, RLS policies
  - Verify: SQL review; run in Supabase SQL editor before using the UI
  - Files: `db/migrations/0003_budgets_and_goals.sql`

- [x] Task 2: Types + hooks
  - Acceptance: `Budget`/`SavingsGoal` types; CRUD hooks invalidate their query keys
  - Verify: `npm run typecheck`
  - Files: `src/types/db.ts`, `src/hooks/useBudgets.ts`, `src/hooks/useSavingsGoals.ts`

- [x] Task 3: Pure helpers
  - Acceptance: `budgetStatus` returns ratio/percent/tone/remaining; `savingsRate` returns null when income is 0
  - Verify: `npm run typecheck`
  - Files: `src/lib/budgets.ts`, `src/lib/money.ts`

- [x] Task 4: Progress primitive + BudgetSheet
  - Acceptance: accessible progressbar; add/edit/delete budget with validation
  - Verify: `npm run lint`
  - Files: `src/components/ui/progress.tsx`, `src/components/budgets/BudgetSheet.tsx`

- [x] Task 5: Budgets page — monthly section
  - Acceptance: rows show spent/limit, colored bar, near/over badges; empty state opens sheet
  - Verify: `npm run build`
  - Files: `src/pages/Budgets.tsx`

- [x] Task 6: Goal sheets
  - Acceptance: create/edit/delete goal; contribute amount adds to saved total
  - Verify: `npm run typecheck`
  - Files: `src/components/budgets/GoalSheet.tsx`

- [x] Task 7: Savings rate + goals list
  - Acceptance: rate card handles zero income; goals show progress and deadline
  - Verify: `npm run build`
  - Files: `src/pages/Budgets.tsx`

- [x] Task 8: i18n + full verification
  - Acceptance: all new strings translated; build clean
  - Verify: `npm run typecheck; npm run lint; npm run build`
  - Files: `src/locales/en.json`

## Manual checks (once Supabase is configured)
- [x] Set a budget, add an expense in that category, see progress move
- [x] Push a category to 80% and 100% to see amber/red states
- [x] Create a goal, add money, edit target, delete goal
- [x] Change month start day in Settings and confirm the period label/spend resets

---

# Phase 3: Home Inventory & Shopping List — Tasks

- [x] Task 1: Migration `db/migrations/0004_inventory_and_shopping.sql`
  - Acceptance: `inventory_items` + `shopping_items` with checks, indexes, updated_at triggers, RLS
  - Files: `db/migrations/0004_inventory_and_shopping.sql`

- [x] Task 2: Types + hooks
  - Acceptance: `InventoryItem`/`ShoppingItem` types; inventory CRUD; shopping add/toggle/delete/clear
  - Verify: `npm run typecheck`
  - Files: `src/types/db.ts`, `src/hooks/useInventoryItems.ts`, `src/hooks/useShoppingItems.ts`

- [x] Task 3: Inventory helpers
  - Acceptance: category options/icons, `isLowStock`, quantity parse/format
  - Verify: `npm run typecheck`
  - Files: `src/lib/inventory.ts`

- [x] Task 4: Item + restock sheets
  - Acceptance: add/edit/delete item; restock writes new quantity and optional expense
  - Verify: `npm run lint`
  - Files: `src/components/inventory/ItemSheet.tsx`, `src/components/inventory/RestockSheet.tsx`

- [x] Task 5: Stock tab
  - Acceptance: grouped by category, quick +/- controls, low/out badges, empty state
  - Verify: `npm run build`
  - Files: `src/pages/Inventory.tsx`

- [x] Task 6: Manual shopping list
  - Acceptance: add item with optional quantity; check/uncheck; delete; clear bought
  - Verify: `npm run typecheck`
  - Files: `src/components/inventory/ShoppingItemSheet.tsx`, `src/pages/Inventory.tsx`

- [x] Task 7: Auto low-stock list
  - Acceptance: low items appear with threshold context; Bought opens restock sheet
  - Verify: `npm run lint`
  - Files: `src/pages/Inventory.tsx`

- [x] Task 8: i18n + full verification
  - Acceptance: all new strings translated; typecheck, lint and build clean
  - Verify: `npm run typecheck; npm run lint; npm run build`
  - Files: `src/locales/en.json`

## Manual checks (once Supabase is configured)
- [ ] Apply `0004_inventory_and_shopping.sql` in the Supabase SQL editor
- [ ] Add an item with a threshold, drop it to the threshold, see the Low badge
- [ ] Restock a low item without logging an expense
- [ ] Restock a low item and log the expense; confirm it appears in Spending
- [ ] Add a manual shopping item, check it off, then clear bought

---

# Phase 4: Shared Home Stock & Shopping — Tasks

- [x] Task 1: Migration `db/migrations/0008_shared_inventory_and_shopping.sql`
  - Acceptance: `home_id`/`is_common` on inventory and shopping, indexes, sharing checks,
    ownership-normalizing trigger, shared RLS
  - Files: `db/migrations/0008_shared_inventory_and_shopping.sql`, `db/setup.sql`

- [x] Task 2: Types + hooks
  - Acceptance: shared fields in types; queries return own + shared rows; create/payload support
  - Files: `src/types/db.ts`, `src/hooks/useInventoryItems.ts`, `src/hooks/useShoppingItems.ts`

- [x] Task 3: Unit/location options
  - Acceptance: common unit and location lists; legacy/custom values fall back to Other
  - Files: `src/lib/inventory.ts`, `src/locales/en.json`

- [x] Task 4: Shared UI
  - Acceptance: share toggle on new items, shared badges, translated locations, unit/location
    selects with Other inputs
  - Files: `src/components/inventory/ItemSheet.tsx`,
    `src/components/inventory/ShoppingItemSheet.tsx`, `src/pages/Inventory.tsx`

- [x] Task 5: Apply `0008` live and verify two-member RLS
  - Acceptance: owner and member see/edit shared rows; non-members cannot; personal rows stay
    private; deleting a home cascades shared rows
  - Verified 2026-11-13 with DB-level tests using simulated JWT claims; all checks passed in
    rolled-back transactions.

---

# Phase 4b: Expense → Home Stock Link — Tasks

- [x] Task 1: Migration `db/migrations/0009_expense_stock_links.sql`
  - Acceptance: `stock_movements` with unique expense link; RLS select for own/shared rows;
    atomic `create_expense_with_stock(payload)`; delete-reversal trigger clamped at zero
  - Files: `db/migrations/0009_expense_stock_links.sql`, `db/setup.sql`

- [x] Task 2: Types + hook
  - Acceptance: `StockMovement`/`StockPurchaseInput`; `useCreateExpenseWithStock`; Home-aware
    expense query key; inventory/money invalidation
  - Files: `src/types/db.ts`, `src/hooks/useExpenses.ts`

- [x] Task 3: Entry sheet UI
  - Acceptance: Add to stock toggle; existing item + quantity; new item fields; unit/location
    presets + Other; share toggle defaults on with a Home and locks on for shared items;
    manual validation
  - Files: `src/components/money/EntrySheet.tsx`, `src/locales/en.json`

- [x] Task 4: Shared expense list
  - Acceptance: Home-visible expenses appear with a shared badge; other members' rows are
    read-only; creator can edit/delete
  - Files: `src/pages/Expenses.tsx`

- [x] Task 5: Verification
  - Acceptance: `npm run typecheck`, `npm run lint`, `npm run build` pass
  - Verified 2026-11-13

- [x] Task 6: Apply `0009` live and verify RPC/trigger/RLS
  - Acceptance: create new/existing item with and without sharing; delete reverses quantity
    once and clamps at zero; non-members cannot see shared stock/expense; non-creator cannot
    edit/delete a shared expense
  - Verified 2026-11-13: 22 DB-level checks passed in a rolled-back transaction with two
    temporary Home members and a non-member. No test rows remained; temporary token removed.

---

# Phase 4c: Income Payment Methods & Wallet Balances — Tasks

- [x] Task 1: Migration `db/migrations/0010_income_payment_methods.sql`
  - Acceptance: `incomes.payment_method` text not null default `cash`; existing rows
    backfilled; check allows only `cash`, `bkash`, `bank`
  - Files: `db/migrations/0010_income_payment_methods.sql`, `db/setup.sql`

- [x] Task 2: Types, constants, and income hook
  - Acceptance: `IncomePaymentMethod`; `Income.payment_method`; `IncomeInput` requires a
    method; shared expense/income option lists
  - Files: `src/types/db.ts`, `src/lib/payments.ts`, `src/hooks/useIncomes.ts`

- [x] Task 3: Entry sheet and income list
  - Acceptance: income shows “Received in” with Cash/bKash/bank; create/update sends the
    method; income rows display the method
  - Files: `src/components/money/EntrySheet.tsx`, `src/pages/Expenses.tsx`,
    `src/locales/en.json`

- [x] Task 4: Wallet balances
  - Acceptance: current-month income/spent/remaining per method; Cash/bKash/bank only;
    personal-only and category budgets unchanged
  - Files: `src/hooks/useMoneyOverview.ts`,
    `src/components/budgets/WalletSummary.tsx`, `src/pages/Budgets.tsx`

- [x] Task 5: Verification
  - Acceptance: `npm run typecheck`, `npm run lint`, `npm run build` pass
  - Verified 2026-11-13

- [x] Task 6: Apply `0010` live and verify schema
  - Acceptance: column is `text not null default 'cash'`; existing rows backfilled; check
    rejects invalid methods
  - Verified 2026-11-13 through the Supabase Management API; temporary token removed.

---

# Phase 6b: Confirm Dialogs & Sheet Keyboard - Tasks

- [x] Task 1: Reusable ConfirmDialog primitive
  - Acceptance: centered alertdialog above sheets; Escape/backdrop cancel; focus Cancel;
    keyboard hides on open; focus trap; native back closes only the dialog
  - Files: `src/components/ui/confirm-dialog.tsx`, `src/lib/confirm-context.ts`,
    `src/providers/ConfirmProvider.tsx`, `src/main.tsx`, `src/locales/en.json`

- [x] Task 2: Replace native delete confirms
  - Acceptance: entry/income, stock item, budget, goal, category, shopping item, clear
    bought, and leave/delete Home all use the branded dialog
  - Files: `EntrySheet.tsx`, `ItemSheet.tsx`, `BudgetSheet.tsx`, `GoalSheet.tsx`,
    `CategoryManager.tsx`, `Inventory.tsx`, `HomeManager.tsx`

- [x] Task 3: Inline Home errors
  - Acceptance: leave/delete and cancel-invite failures render in a destructive banner;
    no native alerts remain
  - Files: `src/components/settings/HomeManager.tsx`, `src/locales/en.json`

- [x] Task 4: Keep keyboard hidden when sheets open
  - Acceptance: no add/edit sheet autofocuses a field; the panel receives focus instead;
    closing a sheet blurs the active field
  - Files: `src/components/ui/sheet.tsx` plus the eight sheet components

- [x] Task 5: Verification
  - Acceptance: `npm run typecheck`, `npm run lint`, `npm run build` pass
  - Verified 2026-11-14
