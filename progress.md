# Pocket Eye — Project Progress

Last updated: 2026-11-15
Repo: `D:\AntiGravity\my-website`
Branch: `main`
Current focus: Preparing the public Cloudflare Pages launch — CI, headers, repo commit, Supabase auth and Brevo SMTP

> Living document. Read this first when resuming work, then `IDEA.md` for the product spec
> and `AGENTS.md` for agent/skill rules.

---

## 1. What This Project Is

Pocket Eye (working name in `IDEA.md`: "Nestly") is a personal web app for someone living
alone or with one flatmate. It answers three questions at any moment:

1. How much did I spend? (day/week/month/category)
2. How much am I saving? (savings rate and goals)
3. What do I have at home? (household stock, low-stock, shopping list)

Optional flatmate mode adds a shared "Home" where **common** expenses are visible to both
members, split, and settled up. Personal data stays private.

Constraints from the idea: zero cost, mobile-first web app, pure client-side (Supabase only,
no custom server), wrappable as an Android app with Capacitor later.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Vite 8 + React 19 + TypeScript 6 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 + shadcn-style UI primitives (Radix Slot, CVA) |
| Data fetching | TanStack Query 5 |
| Backend | Supabase (Postgres, Auth, RLS) |
| Forms / validation | React Hook Form + Zod 4 |
| Charts | Recharts 3 |
| Dates / money | date-fns; money stored as integer minor units |
| i18n | i18next / react-i18next (English only) |
| PWA | vite-plugin-pwa |
| Mobile | Capacitor 8 (Android); debug APK via Gradle + JDK 21 |
| Icons / fonts | lucide-react, Inter Variable, Plus Jakarta Sans Variable |
| Lint / build | ESLint 10, `tsc -b`, `vite build` |

Note: `IDEA.md` says "Next.js" once in the Phase 0 roadmap table, but the Technology table,
the static-hosting goal, and the actual code all use **Vite**. Vite is the decision of record.

`package.json` scripts: `dev`, `build` (`tsc -b && vite build`), `preview`, `lint`,
`typecheck` (`tsc -b`). Mobile scripts: `build:mobile` (Vite `capacitor` mode, PWA off),
`cap:sync`, `android:open`, `android:run`, `android:apk` (full build), `android:apk:fast`
(reuse `dist`). There is **no test script yet**.

---

## 3. Status at a Glance

| Area | Status | Notes |
|---|---|---|
| Project scaffold / theme | Done | Vite + Tailwind tokens + dark mode |
| Auth (email/password) | Done | Google sign-in not built |
| Onboarding & profile | Done | Currency, month-start day, locale |
| Categories CRUD | Done | Defaults seeded by DB trigger |
| Expenses / incomes CRUD | Done | Search, category filter, date presets |
| Dashboard | Done | Summary cards, donut, 6-month trend |
| Budgets | Done | Per-category monthly limit, alerts |
| Income payment methods / wallets | Done (applied live) | Cash/bKash/bank balances from matching income/expense methods |
| Savings goals & rate | Done | Contribute, edit, delete |
| Inventory | Done | Quantity, unit, threshold, location |
| Shopping list | Done | Auto low-stock + manual items |
| Shared homes / invites / members | Done (applied live) | Create, join, invite, leave/delete; RPC-only writes, one home per user; `create_home` is idempotent with the live owner trigger |
| Common expenses / payer / splits (UI) | Partial | Stock purchases can be shared; payer/split UI missing |
| Balance & settle-up | Not built | No `settlements` table yet |
| Shared inventory / shopping | Done (applied live) | Home rows, RLS, sharing trigger |
| Stock-linked expenses | Done (applied live) | Add to stock while logging; delete reverses stock |
| Realtime (flatmate updates) | Not built | No Supabase subscriptions |
| Recurring expenses | Not built | Deferred from Phase 2 |
| CSV export / backup | Not built | Recommended early by IDEA |
| In-app alerts/reminders | Not built | Budget thresholds only visual |
| PWA | Done (base) | Manifest, icons, service worker |
| Tests | Not started | No Vitest/Playwright |
| CI / deployment | Prepared | New `typecheck`/`lint`/`build` CI; Cloudflare Pages project connection pending |
| Capacitor Android | Done (debug APK) | Builds and runs on emulator; action bar fixed; release signing and store packaging pending |

---

## 4. What We Built (by phase)

### Phase 0 — Setup and foundations

- Vite + React + TS app entry: `index.html`, `src/main.tsx`, `src/App.tsx`
- Tailwind 4 theme tokens and light/dark palettes: `src/index.css`
- UI primitives: `button`, `input`, `select`, `sheet` (bottom sheet), `progress` in
  `src/components/ui/`
- App shell with sticky header, bottom nav, safe-area padding, skip link:
  `src/components/layout/AppShell.tsx`
- Auth layout and auth gate: `src/components/layout/AuthLayout.tsx`,
  `src/components/AuthGate.tsx`
- Supabase client with missing-env warning: `src/lib/supabase.ts`
- TanStack Query + Auth provider: `src/main.tsx`, `src/providers/AuthProvider.tsx`
- i18n bootstrap and English strings: `src/lib/i18n.ts`, `src/locales/en.json`
- PWA manifest, icons, service worker config: `vite.config.ts`, `public/*.png`,
  `public/favicon.svg`
- Theme preference hook (light/dark/system): `src/hooks/useTheme.ts`

### Phase 1 — Personal core

- Email/password sign-up, sign-in, email-confirmation state, friendly errors:
  `src/pages/auth/SignUp.tsx`, `src/pages/auth/SignIn.tsx`, `src/lib/auth-errors.ts`
- Onboarding (name, currency, month-start day): `src/pages/Onboarding.tsx`
- Profile read/update hook: `src/hooks/useProfile.ts`
- Category management (add/edit/delete, icons, colors): `src/components/settings/CategoryManager.tsx`,
  `src/hooks/useCategories.ts`
- Expense/income entry sheet with amount, category chips, date, note, payment method:
  `src/components/money/EntrySheet.tsx`
- Expenses page with type toggle, totals, search, category filter, date presets, daily
  grouping, edit sheet, FAB: `src/pages/Expenses.tsx`
- Expense/income hooks: `src/hooks/useExpenses.ts`, `src/hooks/useIncomes.ts`
- Money helpers and integer parsing/formatting: `src/lib/money.ts`
- Period helpers honoring custom month start: `src/lib/periods.ts`
- Dashboard summary + category donut + income/spend trend:
  `src/pages/Dashboard.tsx`, `src/hooks/useMoneyOverview.ts`
- Settings page (profile, currency, month start, language, theme, categories, account):
  `src/pages/Settings.tsx`

### Phase 2 — Budgets and savings

- Migration: `db/migrations/0003_budgets_and_goals.sql`
- Ongoing monthly limit per category (not per-month rows): `src/hooks/useBudgets.ts`,
  `src/components/budgets/BudgetSheet.tsx`, `src/pages/Budgets.tsx`
- Savings goals with contribute/edit/delete: `src/hooks/useSavingsGoals.ts`,
  `src/components/budgets/GoalSheet.tsx`
- Pure helpers `budgetStatus` and `savingsRate`: `src/lib/budgets.ts`, `src/lib/money.ts`
- Green/amber/red progress and near/over badges
- Income payment methods and wallet balances: `0010_income_payment_methods.sql` adds
  `incomes.payment_method` (`cash`/`bkash`/`bank`, default `cash`). `EntrySheet` labels the
  income field “Received in”; `useMoneyOverview` returns current-month income/spent/remaining
  per method, rendered by `WalletSummary` on the Budgets page. Nagad/card spending stays in
  total spent and category budgets but is excluded from wallet balances.
- Recurring expenses explicitly deferred (planned separate slice)

### Phase 3 — Home inventory and shopping list

- Migration: `db/migrations/0004_inventory_and_shopping.sql`
- Inventory CRUD with quantity `numeric(10,2)`, unit, location, min threshold:
  `src/hooks/useInventoryItems.ts`, `src/components/inventory/ItemSheet.tsx`
- Low stock defined as `quantity <= min_threshold`: `src/lib/inventory.ts`
- Stock tab grouped by category, quick +/- controls, low/out badges:
  `src/pages/Inventory.tsx`
- Restock sheet that can log the purchase as an expense in one step:
  `src/components/inventory/RestockSheet.tsx`
- Shopping list: auto low-stock items plus manual items with check/delete/clear:
  `src/components/inventory/ShoppingItemSheet.tsx`, `src/hooks/useShoppingItems.ts`

### Phase 4 — Flatmate / shared home (partial)

Built:

- Canonical migration `db/migrations/0007_fix_homes.sql` repairs the recursive RLS policies,
  recreates the tables if missing, deletes orphaned memberships/invitations, enforces cascade
  foreign keys, enforces one home per user, and includes the `0006` common expense
  columns/policy. It supersedes the `0005_*` files and `0006`.
- `create_home` uses `ON CONFLICT (home_id, user_id) DO NOTHING` when adding the owner
  membership. This makes it compatible with the live `homes_after_insert_owner` trigger, which
  also creates that membership.
- SECURITY DEFINER helpers `is_home_member` and `is_home_owner`; RPCs `create_home`,
  `get_my_home`, `get_home_members`, `join_home_by_token`, and `create_home_invitation`
- All home writes go through RPCs; there are no direct INSERT policies on `homes`,
  `home_members`, or `home_invitations`, and invite tokens are generated server-side
- Shared home UI in Settings: create home, invite with a 12-character code/link, pending
  invitations, cancel invite, member list, leave/delete: `src/components/settings/HomeManager.tsx`,
  `CreateHomeSheet.tsx`, `InviteRoommateSheet.tsx`, `JoinHomeSheet.tsx`
- Join-by-link support via `/settings?join=CODE`
- Hooks are RPC-only and surface migration/RLS errors instead of masking them:
  `src/hooks/useHome.ts`
- Types and expense input already include `home_id`, `is_common`, `paid_by`
  (`src/types/db.ts`, `src/hooks/useExpenses.ts`)
- Shared inventory and manual shopping list: `home_id`/`is_common` columns, RLS for
  own-or-shared rows, shared-by-default new items, member edit/delete, and shared badges
  (`0008_shared_inventory_and_shopping.sql`, `ItemSheet`, `ShoppingItemSheet`, `InventoryPage`).
  `0008` is applied to the live project; owner/member/non-member RLS, ownership preservation,
  personal-row privacy, and Home-delete cascade were verified with rolled-back SQL tests.
- Unit and location dropdowns with common options plus a custom "Other" fallback
  (`src/lib/inventory.ts`, `src/locales/en.json`)
- Expense → Home stock link: `EntrySheet` can add an existing or new item, set
  quantity/unit/location/min threshold, and share both the purchase and the stock row.
  The atomic `create_expense_with_stock` RPC validates Home membership and share
  consistency, records a `stock_movements` row, and a delete trigger reverses the
  quantity (clamped at zero): `0009_expense_stock_links.sql`, `useExpenses`,
  `src/types/db.ts`. `0009` is applied live and was verified with two members and a
  non-member in a rolled-back transaction.
- Shared expense list: Home-visible expenses load in `ExpensesPage` with a shared badge;
  rows created by another member render read-only. The creator keeps edit/delete.
  Categories are still per-user, so another member may see an unfamiliar category.

Not built (see gaps):

- General Personal/Common toggle for expenses that are not stock purchases, payer
  selection, and split-rule UI
- Shared monthly summary/filter beyond the shared badge
- Running balance and settle-up (no `settlements` table)
- Shared shopping `claimed_by`/claiming flow
- Supabase Realtime subscriptions

### Phase 5 — Polish

- Dark mode with three choices and live preview: `src/components/theme/ThemeCard.tsx`,
  `src/hooks/useTheme.ts`; early theme script in `index.html` avoids flash
- PWA manifest, maskable icon, Apple touch icon, theme color
- English-only i18n with a single locale file
- Not done: CSV export, in-app alerts, offline UX beyond precaching, multi-language

---

### Phase 6 — Capacitor Android

- Capacitor 8.6.2 (`@capacitor/core`, `@capacitor/android`), `@capacitor/app`,
  `@capacitor/splash-screen`; config in `capacitor.config.ts` with appId
  `com.pocketeye.app`, `webDir: dist`, `androidScheme: https`, SplashScreen colors
  `#0f766e` / `#faf7f2`, and `SystemBars.insetsHandling: 'css'`.
- Native shell: `src/lib/native.ts` handles hardware back (with a handler stack used by
  the bottom sheet), `SystemBars` theme sync, splash hide, and the auth deep link
  `com.pocketeye.app://auth/callback` via `appUrlOpen` / `getLaunchUrl`.
  Wired from `src/main.tsx`; theme sync in `src/hooks/useTheme.ts`; `SignUp.tsx` uses
  the native redirect URL.
- Vite `capacitor` mode disables the PWA plugin so the APK does not ship a service
  worker (`vite.config.ts`).
- Safe-area CSS variables `--safe-top` / `--safe-bottom` in `src/index.css`; used by
  `AppShell.tsx`, `Expenses.tsx`, and `sheet.tsx`.
- Android project in `android/`; icons and splash generated from `assets/logo.svg` with
  `@capacitor/assets`. Custom-scheme intent filter added to `AndroidManifest.xml`;
  `MainActivity.java` enables edge-to-edge after `super.onCreate`.
- `scripts/build-android.ps1` auto-selects JDK 21, runs the mobile build (optional
  `-SkipWebBuild`), `cap sync android`, Gradle `assembleDebug`, and copies the APK to
  `artifacts/pocket-eye-0.1.0-debug.apk` (ignored by git).
- `eslint.config.js` ignores `android/**/build`, `artifacts`, and the copied
  `android/app/src/main/assets/public` files so `npm run lint` stays clean.
- Fixed: calling `EdgeToEdge.enable(this)` before `super.onCreate` made AppCompat create
  a native action bar from the splash theme. Moving it after `super.onCreate` and adding
  `postSplashScreenTheme` to `AppTheme.NoActionBarLaunch` removes the overlap.
- Verified on `Pixel_8_API34` (emulator, Android 14, WebView 113): app installs, shows
  the sign-in screen, no FATAL/AndroidRuntime crashes, and no native action bar. The
  emulator's WebView is older than 140, so system bars are applied natively; on WebView
  140+ with `viewport-fit=cover`, the CSS safe-area path is used instead.

---

## 5. Database and Migrations

### Tables in use

`profiles`, `categories`, `expenses`, `incomes`, `budgets`, `savings_goals`,
`inventory_items`, `shopping_items`, `homes`, `home_members`, `home_invitations`,
`stock_movements`.

### RPCs

`is_home_member(check_home_id, check_user_id)` and `is_home_owner(check_home_id, check_user_id)`
(SECURITY DEFINER to avoid RLS recursion), `create_home(home_name)`, `get_my_home()`,
`get_home_members(target_home_id)`, `join_home_by_token(invite_token)`,
`create_home_invitation(target_home_id, invite_email)` (server-generated token), and
`create_expense_with_stock(payload)` (atomic expense + stock create).

### Migration files

| File | Purpose |
|---|---|
| `0001_profiles_and_categories.sql` | Profiles, categories, defaults, new-user trigger, RLS |
| `0002_expenses_and_incomes.sql` | Expenses/incomes, RLS |
| `0003_budgets_and_goals.sql` | Budgets/savings goals, RLS |
| `0004_inventory_and_shopping.sql` | Inventory/shopping, RLS |
| `0005_shared_homes_and_invites.sql` | Superseded by 0007 (historical) |
| `0005_patch_fix_rls.sql` | Superseded by 0007 (historical) |
| `0005_fresh_start.sql` | Superseded by 0007 (historical) |
| `0005_diagnostic.sql` | Read-only diagnostic queries for debugging |
| `0006_common_expenses_and_splits.sql` | Superseded by 0007 (historical) |
| `0007_fix_homes.sql` | **Canonical**: repairs RLS, enforces one home, RPC-only writes, includes 0006 |
| `0008_shared_inventory_and_shopping.sql` | **Canonical**: shared inventory/shopping columns, RLS, sharing trigger |
| `0009_expense_stock_links.sql` | **Canonical**: `stock_movements`, atomic expense+stock RPC, delete-reversal trigger, RLS |
| `0010_income_payment_methods.sql` | **Canonical**: `incomes.payment_method` with Cash/bKash/bank check and `cash` backfill |

**Important:** `db/setup.sql` now combines **0001–0004** plus the canonical **0007** home
repair, **0008** shared inventory/shopping, **0009** stock-linked expenses, and **0010**
income payment methods. It is the single run-once script for a fresh project.

Suggested fresh-project order:

1. Run `db/setup.sql` (includes 0001–0004, 0007, 0008, 0009, and 0010).
2. Use `0005_diagnostic.sql` only when troubleshooting.

The live project has `0007`, `0008`, `0009`, and `0010` applied.

Do not apply `0005_*` or `0006` separately; 0007 supersedes them.

Money is stored as integer minor units (poisha). Inventory quantity is `numeric(10,2)`.

---

## 6. Repository State (read this before committing)

The git history contains only the **old static website** (8 commits) plus agent skills.
The Pocket Eye app is **not committed yet**.

`git status` at the time of writing:

- Deleted in working tree (old static site): `.github/workflows/ci.yml`,
  `.github/workflows/deploy-pages.yml`, `.github/workflows/deploy-server.yml`,
  `.htmlvalidate-a11y.json`, `BRANCH-PROTECTION.md`, `DEPLOY.md`, `deploy/` (all scripts,
  nginx config, systemd unit), `public/index.html`
- Modified: `.gitignore`, `package.json`, `package-lock.json`
- Untracked: `.env.example`, `IDEA.md`, `android/`, `artifacts/` (ignored), `assets/`,
  `capacitor.config.ts`, `components.json`, `db/`, `eslint.config.js`, `index.html`,
  `progress.md`, `public/` icons, `scripts/`, `src/`, `tasks/`, `tsconfig*.json`,
  `vite.config.ts`
- `.env` exists and is correctly ignored; keep only `.env.example` in git
- `artifacts/pocket-eye-0.1.0-debug.apk` is a local debug build and is gitignored; do not
  commit build outputs
- `.github/` now contains only `dependabot.yml`
- No root `README.md`
- `project-history/README.md` and `cheatsheet.md` still describe the old static site,
  Ubuntu nginx, and Cloudflare tunnel — **stale**
- Stray file `System.Drawing.Drawing2D.GraphicsPath` is actually a PNG screenshot and
  should be removed or renamed

Because everything is uncommitted, a bad checkout could lose the app. Treat P0 below as
the top priority.

---

## 7. Known Gaps and Risks

### Functional gaps

- **Flatmate mode is partly built.** Homes/invites/members, shared inventory/shopping, and
  shared stock-linked expenses work. General common expenses, splits, balances, settle-up,
  shopping claiming, and Realtime do not.
- **No settle-up model.** IDEA proposes a `settlements` table; it has not been created.
- **No recurring expenses.** Needs `recurring_rules`, `next_date`, and a UI/action to
  apply due rules.
- **Dashboard misses two IDEA features:** low-stock card and upcoming recurring payments.
- **No CSV export**, which IDEA recommends as a cheap backup for the free Supabase tier.
- **No in-app alerts** beyond visual budget colors.
- **No Google sign-in** (email/password only, which matches IDEA's "start simple" advice).
- **English only**; language selector is present but has one option.
- **No tests.** Verification is typecheck/lint/build plus manual Supabase checks.

### Technical / operational risks

- The live project has `0007_fix_homes.sql`, `0008_shared_inventory_and_shopping.sql`, and
  `0009_expense_stock_links.sql` applied. `setup.sql` remains the run-once script for fresh
  projects.
- `stock_movements` is written only by `create_expense_with_stock`; direct authenticated
  inserts are denied by RLS. The reversal trigger runs despite the trigger function having no
  EXECUTE grant to clients; this was verified live.
- If a home was created before the cascade foreign key existed, deleting it can leave an
  orphan membership. `get_my_home` now joins `homes`, and re-running 0007 removes those
  orphans and repairs the FK.
- The live DB has a `homes_after_insert_owner` trigger that inserts the owner membership.
  `create_home` must keep its `ON CONFLICT` clause; without it, the second insert raises
  `home_members_home_id_user_id_key` and the transaction rolls back.
- Migrations are applied by hand in the Supabase SQL editor; nothing tracks applied state.
- `useHome` is now RPC-only and surfaces missing-migration/RLS errors. If home actions fail,
  confirm `0007_fix_homes.sql` was applied and PostgREST reloaded its schema.
- No deployment pipeline for the Vite app. The old self-hosted/Pages workflows were deleted.
- No CI to catch `tsc`/lint/build regressions.
- `useMoneyOverview` and reports read only `user_id = auth.uid()`, so shared/common
  expenses are not yet included in totals or charts.
- **Android build requires JDK 21** (`C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot`
  on this machine). Gradle fails with `invalid source release: 21` under JDK 17.
  `scripts/build-android.ps1` selects JDK 21 automatically.
- The APK is **debug-signed only**. Play Store distribution needs a release keystore,
  `assembleRelease`/AAB, and versioning; do not publish the debug APK.
- Supabase must allowlist `com.pocketeye.app://auth/callback` before new-account email
  confirmation links can return to the app. Existing-account sign-in works without it.
- Android Studio is **not installed**; CLI builds work, but `npm run android:open`
  (which launches Android Studio) will fail until it is installed.
- System-bar behavior depends on the WebView version: WebView <140 uses native insets;
  WebView 140+ with `viewport-fit=cover` uses the injected `--safe-area-*` CSS values.
  Test both if status-bar padding issues appear.

---

## 8. Next Steps (prioritized)

### P0 — Protect the work and clean the repo (do first)

- [x] Run `npm run typecheck`, `npm run lint`, `npm run build`; fix anything broken.
- [ ] Commit the app. Prefer logical commits if practical, otherwise one clear commit such as
      "Rebuild site as Pocket Eye money and home tracker". Include `src/`, `db/`, configs,
      `index.html`, icons, `IDEA.md`, `tasks/`, `.env.example`; keep `.env` ignored.
- [x] Remove or rename the stray PNG `System.Drawing.Drawing2D.GraphicsPath`.
- [ ] Add a root `README.md` (what it is, stack, setup, env vars, migration order, scripts).
- [ ] Decide the fate of the old static-site deletion and update/archive
      `project-history/README.md` + `cheatsheet.md` so they stop describing the live product.
- [x] Add canonical `0007_fix_homes.sql` (supersedes `0005_*` and `0006`; keep the diagnostic
      script separate).
- [x] Update `db/setup.sql` to cover 0001–0004 + 0007 with a documented apply order.
- [x] Restore CI for `typecheck`, `lint`, `build` (`.github/workflows/ci.yml`).
- [ ] Connect the Vite app to Cloudflare Pages, configure Supabase auth/Brevo SMTP, and
      verify the public `pages.dev` URL.

### P1 — Finish Phase 4 (flatmate mode)

- [x] Applied `0009_expense_stock_links.sql` live and verified the RPC, reversal trigger, and
      RLS with two members and a non-member (DB-level, rolled back).
- [x] Add optional Add to stock to `EntrySheet`: existing/new item, quantity, unit, location,
      threshold, and share toggle; create the expense and stock link atomically.
- [x] Show Home-visible expenses in the list with a shared badge; other members' rows are
      read-only and only the creator can edit/delete.
- [ ] Add a general Personal/Common toggle, home selector, payer, and split rule to
      `EntrySheet` for expenses that are not stock purchases.
- [ ] Add a shared filter/monthly summary beyond the badge.
- [ ] Add migration `0007_settlements.sql` and a `settlements` hook; compute a running
      balance ("friend owes you X") and a settle-up flow with history.
- [x] Extend inventory/shopping with `home_id`, `is_common`, RLS, and shared UI; personal
      items remain private. `claimed_by`/claiming remains future work.
- [ ] Add Supabase Realtime subscriptions for common expenses and shared shopping.
- [ ] Update `useMoneyOverview`/reports so common expenses are included where intended
      without leaking personal data across members.

### P2 — Daily-use polish

- [ ] Recurring expenses: `recurring_rules` migration, due-date logic, "apply now" UX, and
      upcoming payments on the dashboard.
- [ ] Dashboard low-stock card reusing `useInventoryItems`.
- [ ] CSV export for expenses/incomes/inventory (IDEA's backup recommendation).
- [ ] In-app alerts for budget thresholds and low stock.
- [ ] Verify PWA install/update behavior on a real phone; refine offline messaging.

### P3 — Quality and ship

- [ ] Add Vitest for pure helpers (`budgetStatus`, `savingsRate`, `isLowStock`,
      `parseAmountToMinor`, period ranges) and Playwright for core flows
      (sign up → onboarding → add expense → create budget → restock).
- [ ] Deploy the web app to a free static host; configure Supabase auth redirect URLs.
- [x] Capacitor Android wrap: `npx cap add android`, icons/splash, safe-area and back-button
      behavior, debug APK build + emulator smoke test.
- [ ] Android release packaging: create a keystore, build a signed release APK/AAB, set
      `versionCode`/`versionName`, and test on a physical device.
- [ ] Allowlist `com.pocketeye.app://auth/callback` in Supabase Auth redirect URLs and
      verify an email-confirmation deep link end to end.
- [ ] Resolve the IDEA open questions (see section 9) and record final decisions here.

---

## 9. Open Questions (from IDEA.md)

| # | Question | Current state / default |
|---|---|---|
| 1 | Name | "Pocket Eye" is used in code and UI; IDEA still says Nestly |
| 2 | Currency | Multi-code currency list exists; default BDT |
| 3 | Flatmate count | Designed for 2 (home + one member) |
| 4 | Split default | DB default `split_rule = 'equal'`; no UI yet |
| 5 | Language | English only; locale field exists |
| 6 | Android or iPhone | Android-first via PWA/APK; iPhone via PWA |
| 7 | Offline logging | Not addressed; service worker precaches only |

---

## 10. Verification

### Commands

```powershell
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

Build output is `dist/` (ignored). Typecheck, lint, and build passed on 2026-11-14.

### Android (debug APK)

```powershell
npm run android:apk        # full web build + cap sync + Gradle + copy APK
npm run android:apk:fast   # reuse dist (native-only changes)
npm run android:run        # build and install on a connected device/emulator
```

Output: `artifacts/pocket-eye-0.1.0-debug.apk` (debug-signed, package
`com.pocketeye.app`, minSdk 24, targetSdk 36). JDK 21 is required; the build script
auto-selects `C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot` or `JAVA_HOME`.
Verified on 2026-11-14: `assembleDebug` succeeds, the APK installs on `emulator-5554`
(`Pixel_8_API34`), the sign-in screen renders, the native action bar is gone, and
logcat shows no FATAL/AndroidRuntime crashes. The debug APK is **not** release-ready.

### Manual checks (require Supabase)

Setup: copy `.env.example` to `.env`, add `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`, then apply migrations in the order in section 5.

- [ ] Sign up; a profile and default categories are created by the DB trigger.
- [ ] Complete onboarding; reload keeps currency and month-start day.
- [ ] Add/edit/delete an expense and an income; search and filters return the right rows.
- [ ] Add income with bKash/bank/Cash; confirm the list shows “Received in” and the method.
- [ ] Budgets wallets match current-month income minus matching expenses; Nagad/card spending
      stays in total spent but not in the three wallet balances.
- [ ] Dashboard totals, donut, and 6-month trend match the entries.
- [ ] Budget moves through green/amber/red; savings rate handles zero income.
- [ ] Create a goal, contribute, edit target, delete.
- [ ] Inventory item reaches its threshold and shows Low; restock with and without an
      expense.
- [ ] Shopping list: add, check, delete, clear bought.
- [ ] Create a home, invite, join from a second account with the code, leave/delete.
- [ ] Shared stock: new item is shared by default, second member sees and edits it, unshare
      makes it private, and member delete works.
- [ ] Shared shopping: new entry is shared by default, both members can check/delete it, and
      Clear bought removes shared checked rows.
- [ ] Add an expense with a new stock item and share enabled; confirm the expense appears in
      Spending and the item appears in Home stock for both members.
- [ ] Add an expense to an existing stock item; confirm quantity increases by the entered
      amount and the expense is linked.
- [ ] Delete the linked expense; confirm the stock quantity reverses and never goes below 0.
- [ ] Try to edit/delete another member's shared expense from the UI; confirm it is read-only.
- [x] Confirm RLS: a non-member cannot read another user's personal rows or another home's
      shared rows (DB-level verified 2026-11-13 with simulated JWT claims; live two-account
      UI smoke test still optional).
- [x] `0009` DB-level checks: new/existing item creation, shared visibility for both members,
      non-member isolation, creator-only expense edit/delete, direct movement insert denial,
      category ownership, share-mismatch rejection, movement cleanup, reversal, and clamping
      at zero. Verified 2026-11-13 in a rolled-back transaction.
- [x] `0010` DB-level checks: `incomes.payment_method` is `text not null default 'cash'`; the
      existing row was backfilled; the check constraint rejected `nagad` and no invalid rows
      remained. Verified 2026-11-13.
- [ ] After `0009`: repeat the stock checks in the live UI with two real accounts; balance and
      settle-up still need a `settlements` table.

---

## 11. Session Log

- 2026-11-12: Reviewed the whole repository, identified the old-static-site → Pocket Eye
  rewrite, mapped completed phases and gaps, and created this `progress.md`. No application
  code was changed. The app remains uncommitted.
- 2026-11-12: Diagnosed the "cannot create a home" failure: the live DB had a recursive
  `is_home_member` policy and was missing the RPCs and `0006` columns. Added canonical
  `0007_fix_homes.sql` (idempotent repair, one home per user, SECURITY DEFINER helpers,
  RPC-only writes, server-generated invite tokens). Hardened `useHome` to RPC-only with
  actionable errors, updated the invite/member UI, and removed unused imports.
- 2026-11-12: Applied `0007_fix_homes.sql` to the live project through the Supabase
  Management API. Before applying, resolved one user's 5 duplicate memberships by keeping
  the newest home and deleting the 4 empty duplicates. Verified: 7 SECURITY DEFINER
  functions, the one-home unique index, 4 expense columns, and 7 home policies. REST probes
  for `home_members`, `home_invitations`, and `expenses.home_id` now return `200 []`;
  `get_my_home` is executable by `authenticated` and denied to `anon`.
- 2026-11-12: Updated `db/setup.sql` to cover 0001–0004 plus canonical 0007 and refreshed
  the fresh-project migration order. The run-once script now creates homes, memberships,
  invitations, RPCs, the one-home index, and the common-expense columns.
- 2026-11-12: Found the actual “home not showing” cause: the live DB has an
  `homes_after_insert_owner` trigger (`handle_new_home`) that inserts the owner membership
  after a home is created. `create_home` then inserted the same membership again, hit
  `home_members_home_id_user_id_key`, and the exception handler mislabeled it “You already
  belong to a home”; the whole transaction rolled back. Added `ON CONFLICT (home_id, user_id)
  DO NOTHING` to `create_home` in 0007 and setup.sql. Also kept the orphan cleanup/cascade-FK
  hardening and made `get_my_home` join `homes` so orphan memberships cannot masquerade as a
  home. Re-applied 0007 live and verified `create_home` + `get_my_home` in a rolled-back
  transaction; the DB was left with 0 homes and 0 memberships. Removed the temporary
  `SUPABASE_ACCESS_TOKEN` from `.env` afterward.
- 2026-11-13: Applied `0008_shared_inventory_and_shopping.sql` to the live project through the
  Supabase Management API. Verified `home_id`/`is_common` columns, sharing checks, both
  normalization triggers, all eight own-or-shared policies, and `ON DELETE CASCADE` on both
  shared tables. RLS tests used a temporary member auth user and simulated JWT claims:
  member/owner saw shared rows, personal rows stayed private, member insert/update/delete
  worked, member edits preserved the original `user_id`, non-members saw and changed nothing,
  and deleting a test Home cascaded its shared rows. All test data was rolled back. Also
  added idempotent drops for the new policy names and synced `db/setup.sql`; typecheck, lint,
  and build pass. Removed the temporary `SUPABASE_ACCESS_TOKEN` from `.env` afterward.
- 2026-11-13: Added `0009_expense_stock_links.sql` and synced it into `db/setup.sql`.
  `EntrySheet` now supports Add to stock with an existing or new item, quantity, unit,
  location, threshold, and share toggle. Creation goes through the atomic
  `create_expense_with_stock` RPC; deleting the expense reverses the linked quantity via a
  `BEFORE DELETE` trigger clamped at zero. `ExpensesPage` now shows Home-visible expenses with
  a shared badge and renders other members' rows read-only. Typecheck, lint, and build pass.
  Applied `0009` live through the Supabase Management API and verified 22 checks in a
  rolled-back transaction with two temporary Home members and a non-member: RPC creation for
  new/existing items, shared RLS visibility, non-member isolation, creator-only expense
  edit/delete, direct movement insert denial (`42501`), category ownership, share mismatch,
  movement cleanup, reversal, and zero-clamping. No test rows remained; removed the temporary
  `SUPABASE_ACCESS_TOKEN` from `.env` afterward.
- 2026-11-13: Added `0010_income_payment_methods.sql` and synced it into `db/setup.sql`.
  `incomes.payment_method` is `text not null default 'cash'` with a Cash/bKash/bank check;
  existing rows were backfilled to `cash`. `EntrySheet` now labels income payment as “Received
  in,” income rows show the method, and `useMoneyOverview` returns current-month wallet buckets
  rendered by `WalletSummary` on the Budgets page. Nagad/card spending remains in total spent
  and category budgets but is excluded from wallets. Typecheck, lint, and build pass. Applied
  `0010` live through the Supabase Management API and verified the column type/default/nullable
  state, valid backfill, and check-constraint rejection; removed the temporary
  `SUPABASE_ACCESS_TOKEN` from `.env` afterward.

- 2026-11-14: Wrapped the app with Capacitor 8. Added `capacitor.config.ts`, installed
  `@capacitor/core`, `@capacitor/android`, `@capacitor/app`, `@capacitor/splash-screen`,
  and `@capacitor/assets`; added the `android/` project, generated icons/splash from
  `assets/logo.svg`, added the custom-scheme intent filter, and built a debug APK. Added
  `src/lib/native.ts` for back-button handling, `SystemBars` theme sync, splash hide, and
  auth deep links; disabled the PWA plugin in `capacitor` mode; added safe-area CSS.
  Added `scripts/build-android.ps1` plus `build:mobile`, `cap:sync`, `android:open`,
  `android:run`, `android:apk`, and `android:apk:fast` scripts. Installed JDK 21 and
  confirmed Gradle rejects JDK 17. APK: `artifacts/pocket-eye-0.1.0-debug.apk` (debug
  signed, ~5.34 MB). Emulator smoke test finds the sign-in screen with no fatal crashes.
  Fixed a native action bar overlapping the WebView: `EdgeToEdge.enable(this)` ran before
  `super.onCreate`, so AppCompat created the decor/action bar from the splash theme. Moved
  it after `super.onCreate` and added `postSplashScreenTheme` to `AppTheme.NoActionBarLaunch`.
  Remaining: release signing, physical-device test, and the Supabase redirect allowlist.

---

## 12. How to Resume

1. Read `progress.md` (this file), `IDEA.md`, and `AGENTS.md`.
2. Run `git status` and `git log --oneline -10`; remember the app is uncommitted.
3. Run the verification commands above.
4. Start with P0 in section 8 (commit the app, clean the repo, consolidate migrations).
5. Update the status table and session log as work lands.

- 2026-11-14: Replaced every native delete `window.confirm` with a centered branded
  `ConfirmDialog` exposed through `ConfirmProvider`/`useConfirm`. The dialog stacks above
  sheets, focus-traps, focuses Cancel, hides the keyboard on open, closes on Escape/backdrop,
  and owns the Android Back button. Converted the Home leave/delete and cancel-invite failures
  from `window.alert` to an inline destructive banner, and added confirmation to Clear
  bought. Sheets now focus the panel instead of the first input, and every `data-autofocus`/
  `autoFocus` was removed, so opening add/edit sheets keeps the soft keyboard hidden; tapping
  a field still opens it and closing the sheet blurs it. Typecheck, lint, and build pass.
  No migration or new dependency.
