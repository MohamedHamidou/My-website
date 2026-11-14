# Implementation Plan: Budgets & Savings Goals (Phase 2)

## Overview
Give each expense category an ongoing monthly limit, show progress for the current
period (respecting the profile's custom month start), and let users create savings
goals, add money to them, and see their monthly savings rate.

## Architecture Decisions
- **Ongoing monthly limits, not per-month rows.** The IDEA.md draft has
  `budgets(month, ...)`, but per-month rows force the user to recreate budgets every
  period. A single limit per category matches "simple, not accountant-grade" and the
  UI copy ("monthly limit"). Per-month history can be added later with a
  `period_start` column without changing the UI contract.
- **Spent totals reuse `useMoneyOverview`.** It already returns current-period totals
  per category using the custom month start, so no extra query shape is introduced.
- **Savings goals store `saved_amount` directly.** No contribution ledger yet; adding
  money reads the current value and updates it. A ledger can replace this later.
- **RLS on every new table**, scoped to `auth.uid()`, plus a category-ownership check
  for budget inserts/updates so a user cannot budget against someone else's category.
- **No test harness exists yet** (roadmap defers Vitest/Playwright). Verification for
  this phase is `tsc -b`, ESLint, and `vite build`; pure helpers
  (`budgetStatus`, `savingsRate`) are kept in `src/lib` so tests can be added without
  touching components.

## Task List

### Slice 1: Data layer
- [x] Task 1: Add `0003_budgets_and_goals.sql` with tables, indexes, triggers, RLS
- [x] Task 2: Add `Budget` / `SavingsGoal` types and `useBudgets` / `useSavingsGoals` hooks
- [x] Task 3: Add pure helpers `budgetStatus` and `savingsRate`

### Checkpoint: Data layer
- [x] `npm run typecheck` and `npm run lint` pass

### Slice 2: Budget UI
- [x] Task 4: Add `Progress` UI primitive and `BudgetSheet`
- [x] Task 5: Rebuild `BudgetsPage` monthly-budget section with alerts

### Checkpoint: Budgets
- [x] Add/edit/delete budget compiles and renders; typecheck/lint pass

### Slice 3: Goals & savings rate
- [x] Task 6: Add `GoalSheet` + contribution sheet
- [x] Task 7: Add savings-rate summary and goals list to `BudgetsPage`
- [x] Task 8: Add i18n strings, run full build

### Checkpoint: Complete
- [x] `npm run build` passes
- [x] Manual check list documented for when Supabase is configured

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Migration not applied (anon key missing) | UI queries fail at runtime | Ship SQL; document applying it in Supabase SQL editor |
| Contribute read-then-write race | Lost update | Single-user app; revisit with an RPC if sharing arrives |
| Budget category deleted | Orphan row | `on delete cascade` on `category_id` |

## Open Questions
- Recurring expenses (rent, subscriptions) are part of Phase 2 in the roadmap but are
  deferred to a separate slice; they need a scheduler/next-date model.

---

# Implementation Plan: Home Inventory & Shopping List (Phase 3)

## Overview
Track household items with quantity, unit, location and a low-stock threshold. Items at
or below their threshold surface in a shopping list view where they can be restocked in
one step, optionally logging the purchase as an expense. The list also accepts manual
entries for things that are not inventoried.

## Architecture Decisions
- **Personal-only tables for now.** `home_id` / `is_common` from the IDEA.md draft wait
  for Phase 4, because there is no `homes` table yet.
- **Quantity is `numeric(10,2)`**, so `0.5 kg` works. UI treats empty as `0`, rejects
  negatives, and displays whole numbers without decimals.
- **Low stock means `quantity <= min_threshold`.** `0` therefore flags only when the item
  is gone; `1` flags when one is left. This matches how people set a threshold.
- **Shopping list is a tab inside Home stock** rather than a sixth bottom-nav item;
  low-stock items are derived from inventory, manual needs are persisted in
  `shopping_items` with a `checked` flag.
- **Restock + expense in one action.** The restock sheet updates the item and can insert
  an expense (defaults to the Household items category) in the same submit.

## Task List

### Slice 1: Data layer
- [x] Task 1: `0004_inventory_and_shopping.sql` (tables, indexes, triggers, RLS)
- [x] Task 2: Types, `useInventoryItems`, `useShoppingItems`
- [x] Task 3: `src/lib/inventory.ts` (categories/icons, `isLowStock`, quantity parse/format)

### Slice 2: Inventory UI
- [x] Task 4: `ItemSheet` (add/edit/delete) and `RestockSheet` (restock + optional expense)
- [x] Task 5: Stock tab with grouped list, quick +/- and low badges

### Slice 3: Shopping list
- [x] Task 6: `ShoppingItemSheet` + manual list check/delete/clear
- [x] Task 7: Auto low-stock list with restock actions; tabs wired
- [x] Task 8: i18n strings; typecheck, lint, build

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Rapid +/- clicks race | Wrong quantity | Disable controls while an update is pending |
| Expense logging fails after quantity update | Item restocked without expense | Report error and let the user retry the expense; data stays consistent |
| Migration not applied | Runtime query errors | Document applying `0004` before using the page |

## Follow-ups
- Dashboard "Low-stock items" card (reuses `useInventoryItems`)
- Shared inventory + shopping claiming in Phase 4

---

# Implementation Plan: Shared Home Stock & Shopping (Phase 4)

## Overview
Share inventory and manual shopping items with members of the user's Home while keeping
personal rows private. New items default to shared when a Home exists. Any Home member can
edit or delete shared rows. Unit and location fields become preset selects with an Other
fallback.

## Architecture Decisions
- `inventory_items` and `shopping_items` gain nullable `home_id` and `is_common`.
- Shared rows require `home_id`; personal rows require `home_id = null`.
- RLS allows own rows or shared rows where `is_home_member(home_id, auth.uid())`.
- A trigger preserves `user_id` and normalises `home_id`/`is_common` on writes.
- Queries select all RLS-visible rows and include the current Home id in their query key.
- Units/locations are common presets; unknown legacy values open as Other with free text.

## Task List
- [x] `0008_shared_inventory_and_shopping.sql` (columns, indexes, checks, trigger, RLS)
- [x] Types, inventory/shopping hooks, shared create payloads
- [x] Unit/location options + i18n
- [x] Share toggle, shared badges, translated location display
- [x] Apply `0008` live and verify owner/member/non-member RLS (DB-level; 2026-11-13)

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Broad RLS lets a member write to another Home | Data leak/corruption | `WITH CHECK` requires `is_home_member(home_id, auth.uid())` for shared rows |
| User changes row ownership | Lost access/confusing ownership | Trigger restores `old.user_id` on update |
| Shared rows orphaned by Home deletion | Stale shared data | `home_id` uses `ON DELETE CASCADE` |
| Custom legacy units/locations disappear | Edit data loss | Unknown values open as Other with the existing text preserved |

---

# Implementation Plan: Expense → Home Stock Link (Phase 4)

## Overview
When logging an expense, optionally add the purchase to Home stock. The user can pick an
existing item and quantity to add, or create a new item with unit, location, threshold, and
sharing. The expense and stock change must stay consistent, and deleting the expense must
reverse the linked quantity.

## Architecture Decisions
- One `stock_movements` row per expense, unique on `expense_id`, stores the linked item and
  purchased quantity plus sharing fields.
- `create_expense_with_stock(payload jsonb)` is SECURITY DEFINER and atomic. It validates
  auth, Home membership, category ownership, item visibility, and that the expense and stock
  share settings agree. It creates/updates the item, inserts the expense, then the movement.
- A `BEFORE DELETE` trigger on `expenses` reverses `inventory_items.quantity` with
  `greatest(quantity - movement.quantity, 0)` and then deletes the movement.
- The stock link is create-only for now. Editing an expense does not change stock, and
  `RestockSheet` remains a separate legacy flow.
- Shared expenses are visible under the existing expense RLS. Only the creator can edit or
  delete; other members' shared rows are read-only in the UI.
- Categories remain per-user, so another member may see a shared expense as uncategorised.

## Task List
- [x] `0009_expense_stock_links.sql`: table, constraints, indexes, RLS, RPC, reversal trigger
- [x] Sync the full block into `db/setup.sql`
- [x] Types + `useCreateExpenseWithStock`; Home-aware expense query key/invalidations
- [x] `EntrySheet` Add to stock UI: existing/new, quantity, unit/location presets + Other,
      threshold, share toggle and validation
- [x] `ExpensesPage` shared badge and creator-only edit/delete
- [x] English strings; typecheck, lint, build
- [x] Applied `0009` live and verified RPC/trigger/RLS with two members and a non-member
      (22 DB-level checks, all passed; test rows rolled back)

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Expense created but stock update fails | Inconsistent data | Single RPC transaction; any failure rolls back both |
| Delete reverses stock twice | Wrong quantity | Unique movement row is deleted in the same trigger |
| Another member edits a shared expense | Ownership confusion | Existing RLS is creator-only; UI makes other rows read-only |
| Category is private to its creator | Shared expense shows as uncategorised | Documented limitation; shared category model is future work |
| Editing a linked expense changes intent | Stock drift | Link is create-only; edit does not touch stock |

---

# Implementation Plan: Income Payment Methods & Wallet Balances

## Overview
Track where income is received and show a current-month balance for Cash, bKash, and bank on
the Budgets page. Wallet balances use the same payment method on income and expenses; existing
category budgets, savings rate, and dashboard totals stay unchanged.

## Architecture Decisions
- `incomes.payment_method` is `text not null default 'cash'` with a check for `cash`,
  `bkash`, or `bank`; existing rows migrate to `cash`.
- `IncomePaymentMethod` is a subset of the existing `PaymentMethod`; shared option lists live in
  `src/lib/payments.ts`.
- `useMoneyOverview` selects `payment_method` and returns current-month `wallets` with income,
  spent, and remaining per method.
- Wallet summary is personal-only, matching the existing overview. Nagad/card spending remains in
  total spent and category budgets but is excluded from the three wallet balances.
- Wallet balances are informational; no transfer/reconciliation flow is added.

## Task List
- [x] `0010_income_payment_methods.sql`: column, backfill, default, not-null, check constraint
- [x] Sync the full block into `db/setup.sql`
- [x] `IncomePaymentMethod`, income types/input, shared payment options
- [x] `EntrySheet` income “Received in” selector; show method on income rows
- [x] `useMoneyOverview.wallets` + `WalletSummary` on the Budgets page
- [x] English strings; typecheck, lint, build
- [x] Applied `0010` live and verified the default, not-null column, valid backfill, and
      constraint rejection

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Migration not applied | Income queries fail | Document applying `0010` before using income/wallet UI |
| Expenses exceed income for a method | Negative balance | Show the negative remaining amount honestly |
| Shared expenses are excluded from wallets | Wallet totals differ from Home spending | Personal-only summary; documented alongside the existing overview scope |
| Nagad/card spending is omitted from wallets | Total spent is larger than wallet outflows | Keep both visible and label wallets as Cash/bKash/bank only |

---

# Implementation Plan: Confirm Dialogs & Sheet Keyboard

## Overview
Replace native `window.confirm` delete popups with a branded centered alert dialog, and stop
add/edit sheets from raising the soft keyboard when they open. Home settings errors that used
`window.alert` move inline.

## Architecture Decisions
- One app-level `ConfirmProvider` exposes `useConfirm() => Promise<boolean>`; the dialog
  portals to `document.body` at `z-[60]` so it stacks above the existing `z-50` sheet.
- The dialog captures Escape before the sheet, manages a focus trap, focuses Cancel, and
  registers a native Android back handler so Back closes only the dialog.
- Sheets focus their panel (`tabIndex=-1`) instead of the first input and blur focused fields
  on close, so the keyboard stays hidden until the user taps a field.
- No new dependency; no custom keyboard.

## Task List
- [x] ConfirmDialog primitive, context/hook, provider, mount in `main.tsx`
- [x] Replace all delete confirms and convert Home alerts to inline errors
- [x] Remove `data-autofocus` / `autoFocus` and change Sheet focus behavior
- [x] English strings; typecheck, lint, build

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Escape closes dialog and sheet together | Data entry lost | Dialog captures Escape and stops propagation |
| Android Back closes the sheet behind the dialog | Wrong target | Dialog registers a later back handler and returns true |
| Async confirm changes handler timing | Dangling mutations | All handlers await the result; page-level handlers use `void` |
| Removing autofocus hurts accessibility | Focus lost in dialog | Panel receives focus; Tab moves to the first control |

## Open Questions
- None.
