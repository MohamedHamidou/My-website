# Nestly (working name): Living-Alone Money & Home Tracker

> A personal web app to track spending, grow savings, and keep a stock of household items, built for someone moving out of campus into their first studio, with an optional shared space for a flatmate.

---

## 0. Project Constraints

1. **Web app first, mobile app second.** The web app is built so it can be turned into an Android app later *without rewriting it*. Mobile-friendly design is therefore a requirement from day one:
   - Single-column layouts, bottom navigation bar, large touch targets (min 44px)
   - Respect phone safe areas (notches, gesture bar)
   - No hover-only interactions
   - All data access through the Supabase client (no custom server), so the same code runs in a browser and inside a mobile wrapper
2. **Zero cost.** The only money spent is on the AI agent that builds the product. Every tool, service and host below is on a free tier. No paid domain, no paid email service, no app-store fees.
3. **Free-tier limits are accepted** and designed around (see section 7.1).

---

## 1. Core Idea

After finishing a bachelor's degree and moving out of campus housing, every cost becomes your own: rent, utilities, food, internet, cleaning supplies, furniture. Without a system it's easy to lose track of where money goes and what's running out at home.

**Nestly answers three questions at any moment:**

1. **How much did I spend?** (by day, week, month, category)
2. **How much am I saving?** (monthly savings rate, progress toward goals)
3. **What do I have at home?** (stock of household items, what's low, what to buy next)

**Flatmate mode:** invite a friend to share a home. Only the expenses *marked as common* (rent, electricity, gas, internet, groceries, cleaning supplies) are visible and split between you two. Everything personal stays private.

### Principles
- **Fast to log:** adding an expense should take under 5 seconds.
- **Private by default:** nothing is shared unless it is explicitly a common expense.
- **Mobile first:** you will mostly use it on your phone, right after buying something.
- **Simple, not accountant-grade:** clarity over complexity.

---

## 2. Users & Scenarios

| Scenario | What the app does |
|---|---|
| Living alone | Personal budget, savings goals, home inventory |
| Living with one friend | Same, plus a shared "Home" space with split expenses and a shared inventory |
| Friend moves out / ends sharing | Settle the balance, archive the shared space |

---

## 3. Features

### 3.1 MVP (build first)

**Authentication & profile**
- Email + password and Google sign-in
- Currency setting (default BDT ৳), month start day (e.g. salary day)

**Expense tracking**
- Quick-add: amount, category, date, note, payment method (cash / bKash / Nagad / card / bank)
- Categories with icons: Rent, Utilities, Groceries, Transport, Eating out, Health, Internet/Phone, Household items, Personal, Other (customisable)
- Edit, delete, search, filter by date range / category
- Recurring expenses (rent, internet, subscriptions)

**Income & savings**
- Log income (salary, freelance, allowance, other)
- Savings goals (e.g. "Emergency fund", "Laptop", "Furniture") with target amount, deadline and progress bar
- Monthly **savings rate** = (income − expenses) / income

**Budgets**
- Monthly budget per category with progress indicator (green → amber → red)
- Alert when a category reaches 80% / 100%

**Dashboard**
- This month at a glance: income, spent, saved, remaining budget
- Spending by category (donut chart)
- Spending trend (last 6 months, bar/line chart)
- Upcoming recurring payments
- Low-stock items

**Home inventory**
- Items with name, category (Kitchen, Cleaning, Bathroom, Food staples, Furniture, Electronics), quantity, unit, location (room/shelf)
- **Minimum threshold:** item flagged "low" when quantity is below it
- Quick +/− buttons to adjust stock
- Auto **shopping list** built from low-stock items; check items off when bought, with an option to log the expense and restock in one step

### 3.2 Flatmate / Shared Home (phase 2)

- **Create a Home** and **invite a friend** by link or email
- Invitee accepts, then joins the shared Home as a member
- **Common expense toggle:** when logging an expense, mark it *Personal* or *Common*
  - Personal: visible only to you
  - Common: visible to both, counted in the split
- **Split rules:** 50/50 by default, or custom percentages / fixed amounts per expense
- **Who paid:** record who paid; app computes a running balance ("Friend owes you ৳1,250")
- **Settle up:** record a payment to zero the balance; keep history
- **Shared inventory:** common items (cleaning supplies, kitchen staples) visible to both; personal items remain private
- **Shared shopping list** with "I'll buy this" claiming
- Monthly shared summary: total common spend, each person's share, who owes whom
- Leave / end Home: settle, then archive

### 3.3 Later (nice to have)

- Receipt photo attachment
- Barcode scan to add inventory
- Expiry dates for food with reminders
- Export to CSV / PDF monthly report
- Move-in checklist (things to buy for a first studio) with estimated costs
- Rent / deposit tracker and utility bill reminders
- Push notifications (PWA)
- Multi-currency
- Dark mode (planned from the start, see palette)
- Support for more than 2 flatmates

---

## 4. Key Screens

1. **Onboarding:** currency, income, budget starter, "living alone / with a friend"
2. **Dashboard:** summary cards, charts, alerts
3. **Add Expense (bottom sheet):** big amount field, category chips, Personal/Common toggle
4. **Expenses:** list with filters and search
5. **Budgets & Savings:** category budgets, goals with progress
6. **Inventory:** grouped list, low-stock badges, quick adjust
7. **Shopping List**
8. **Home (shared):** members, balance, common expenses, settle up
9. **Settings:** profile, categories, currency, invites, data export

---

## 5. Data Model (draft)

```
users            (id, name, email, currency, month_start_day)
homes            (id, name, created_by)
home_members     (home_id, user_id, role, joined_at)
invitations      (id, home_id, email/token, status, expires_at)

categories       (id, user_id/home_id, name, icon, color, type)
expenses         (id, user_id, home_id?, amount, category_id, date, note,
                  payment_method, is_common, paid_by, split_json, recurring_id?)
incomes          (id, user_id, amount, source, date)
budgets          (id, user_id, category_id, month, limit_amount)
savings_goals    (id, user_id, name, target_amount, saved_amount, deadline)
recurring_rules  (id, user_id, template_json, frequency, next_date)

inventory_items  (id, user_id, home_id?, name, category, quantity, unit,
                  min_threshold, location, is_common)
shopping_items   (id, user_id, home_id?, name, qty, checked, claimed_by)
settlements      (id, home_id, from_user, to_user, amount, date)
```

**Privacy rule (enforced in the database):** an expense or item is readable by other users only if `is_common = true` and they are a member of that `home_id`.

---

## 6. Color Palette

Calm, warm and trustworthy. It should feel like a cozy home, not a bank.

| Role | Name | Hex |
|---|---|---|
| Primary | Deep Teal | `#0F766E` |
| Primary dark / hover | Midnight Teal | `#115E59` |
| Accent | Warm Amber | `#F59E0B` |
| Background | Soft Sand | `#FAF7F2` |
| Surface / cards | White | `#FFFFFF` |
| Text primary | Charcoal | `#1F2937` |
| Text secondary | Slate | `#6B7280` |
| Border | Linen | `#E7E2D9` |
| Success / savings | Fresh Green | `#16A34A` |
| Warning | Amber | `#D97706` |
| Danger / overspent | Coral Red | `#DC2626` |
| Info / common expense | Sky | `#0EA5E9` |

**Semantic usage**
- Green = money saved, on budget
- Amber = approaching limit, low stock
- Red = over budget, out of stock
- Sky blue = anything **shared / common** (so shared items are instantly recognisable)

**Dark mode**

| Role | Hex |
|---|---|
| Background | `#0B1412` |
| Surface | `#12201D` |
| Border | `#1F332F` |
| Text primary | `#ECFDF5` |
| Primary | `#2DD4BF` |
| Accent | `#FBBF24` |

**Typography:** *Inter* for UI and numbers (use tabular numerals for amounts), *Plus Jakarta Sans* for headings.

---

## 7. Technologies

| Layer | Choice | Why |
|---|---|---|
| Framework | **Vite + React + TypeScript** (React Router) | Pure client-side app: no server to pay for, and it wraps directly into a mobile app |
| Styling | **Tailwind CSS + shadcn/ui** | Fast, consistent, accessible components |
| Charts | **Recharts** | Simple donut / bar / line charts |
| Forms & validation | **React Hook Form + Zod** | Reliable input handling |
| Backend / DB | **Supabase (PostgreSQL)** | Auth, database, realtime and file storage in one, with a generous free tier |
| Auth | **Supabase Auth** (email + Google) | No custom auth code |
| Privacy / sharing | **Row Level Security (RLS) policies** | Enforces "only common expenses are shared" at the database level |
| Data fetching | **TanStack Query** | Caching and optimistic updates for instant-feeling logging |
| Realtime | **Supabase Realtime** | Flatmate sees common expenses and shopping list update live |
| Dates / money | **date-fns**, amounts stored as integers (poisha) | Avoids floating-point errors |
| PWA | **vite-plugin-pwa** | Installable on phone from the browser, works offline-ish, free |
| Mobile app | **Capacitor** (Android) | Wraps the same web app into a real Android app (APK). Free, open source, no rewrite |
| Hosting | **Cloudflare Pages** (or Netlify / Vercel free tier) + Supabase (data) | Free hosting for a static app, free `*.pages.dev` address, no domain purchase |
| Invitations | **Shareable invite link** (send via WhatsApp / Messenger) | Zero cost; avoids a paid email service. Email invites can be added later using a free tier |
| Fonts & icons | **Google Fonts, Lucide icons** | Free |
| Build tooling | **Node.js, Android Studio, GitHub** | All free |

### 7.1 Free-tier limits to design around

| Service | Limit to be aware of (check current numbers) | How we handle it |
|---|---|---|
| Supabase free | Small database (~500 MB), limited file storage, project **pauses after about a week of inactivity** | Plenty for text data; daily use keeps it awake; store no big images (receipt photos stay a "later" feature); add **CSV export** early as a backup |
| Hosting free tier | Bandwidth caps | A static app uses very little |
| Realtime (flatmate updates) | Connection limits | Only 2 users per home, well within limits |
| Google sign-in | Free, but more setup, especially inside the mobile wrapper | Start with **email + password**; add Google later |
| Push notifications | Native push needs extra setup | Use in-app alerts first |

### 7.2 Web to mobile path (all free)

1. **Phase A: Responsive web app** on Cloudflare Pages.
2. **Phase B: PWA.** Install it on your phone from the browser ("Add to Home Screen"). Works on Android and iPhone at no cost.
3. **Phase C: Android app with Capacitor.** `npm run build`, then `npx cap add android`, then open in Android Studio and build an **APK** to install directly on your phone and share with your flatmate.
4. **Not included (they cost money):** Google Play Store listing (one-time fee) and Apple App Store (yearly fee). The PWA and the APK cover your needs without them.
| Testing (later) | Vitest + Playwright | Core flows |

**Suggested project structure**
```
/src/pages        screens (dashboard, expenses, budgets, inventory, home, settings)
/src/components   UI + feature components
/src/lib          supabase client, utils, money helpers
/src/types        shared types
/db               SQL migrations + RLS policies
/android          generated by Capacitor in the mobile phase
```

---

## 8. Roadmap

| Phase | Goal | Deliverables |
|---|---|---|
| **0. Setup** | Foundations | Next.js + Tailwind + Supabase project, theme tokens, auth |
| **1. Personal core** | Know where money goes | Expenses, categories, income, dashboard |
| **2. Plan & save** | Control it | Budgets, savings goals, recurring expenses |
| **3. Home stock** | Know what you own | Inventory, low-stock flags, shopping list |
| **4. Flatmate mode** | Share the common stuff | Homes, invites, common toggle, splits, balance, settle up |
| **5. Polish** | Daily-use quality | PWA install, dark mode, CSV export, in-app alerts |
| **6. Mobile app** | Real Android app | Capacitor wrap, app icon and splash screen, APK build, safe-area and back-button fixes |

---

## 9. Open Questions (to decide before vibecoding)

1. **Name:** keep "Nestly" or choose another?
2. **Currency:** BDT only for now, or multi-currency from the start?
3. **Flatmate count:** strictly 2 people, or design for more?
4. **Split default:** always 50/50, or per-expense choice from day one?
5. **Language:** English only, or add Bengali / French later?
6. **Android only, or iPhone too?** Android APK is free to share directly. iPhone users can use the PWA at no cost.
7. **Offline logging:** is it important when internet is unstable?

---

## 10. Next Step

Confirm or adjust the open questions above, then we start **Phase 0 + 1** with vibecoding: project scaffold, theme, auth, and the Add Expense flow.
