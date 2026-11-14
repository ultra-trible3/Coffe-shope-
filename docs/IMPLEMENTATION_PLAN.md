# Implementation Plan & Status

This document states **what actually exists and how it was verified** versus what
remains. Nothing is marked complete on the strength of code alone.

## Verification snapshot

Executed against this checkout:

| Check                                                   | Result                          |
| ------------------------------------------------------- | ------------------------------- |
| `pnpm build:shared`                                     | pass                            |
| `pnpm typecheck` (shared + server + desktop)            | pass                            |
| `pnpm lint`                                             | pass (0 problems)               |
| `pnpm test` (shared + server + desktop)                 | 42 passed / 6 files             |
| `pnpm build` (shared + server + desktop)                | pass                            |
| `prisma migrate status`                                 | up to date                      |
| Live API verification — `.dev/verify.mjs`               | 51/51 checks passed             |
| Cashier UI flow through the real renderer + API         | pass (DOM-verified)             |
| Administrator UI flow through the real renderer + API   | pass (DOM-verified)             |

### What the live API suite covers

* **RBAC** — cashier denied menu writes, inventory, reports, users, settings,
  audit, dashboard, order-wide reads and cancellation; admin denied nothing.
* **Order scoping** — cashier sees only their own orders/invoices.
* **Server-side pricing** — prices, sizes and toppings come from the database;
  client-supplied prices are ignored/rejected.
* **Money** — subtotal, discount, 14% tax, delivery fee, change and total.
* **Checkout transaction** — order, invoice and payment created; stock deducted
  exactly once; repeated status processing does not deduct again.
* **Transitions** — illegal jumps rejected; legal transitions accepted.
* **Cancellation** — cashier forbidden; admin succeeds; stock restored exactly
  once; a second cancellation is rejected.
* **Discount cap** — a cashier percentage discount above the configured limit
  returns 403.
* **Reports/dashboard** — revenue and series come from paid orders in the
  database; cashier performance and items sold match created orders.
* **Customers** — create, clear optional fields, delete when order-free; delete
  blocked when orders exist.
* **Settings** — load and administrator save.

### UI verification detail

The renderer was served in a browser harness with a preload bridge that proxies
to the real API on port 4001. Pointer/screenshot tooling was unavailable because
the in-app browser reported a hidden 0×0 viewport, so flows were driven through
DOM events and verified with DOM assertions and page snapshots:

* **Cashier** — signed in; only POS, Orders and Invoices appear in navigation;
  35 menu items and 11 categories rendered; Margherita offered Small/Medium/
  Large/Extra Large; topping selection and quantity worked; Medium + Extra
  Mozzarella produced subtotal EGP 135.00, tax EGP 18.90, total EGP 153.90; a
  guest name and cash EGP 200 were entered; Charge opened the invoice viewer with
  A4 and 80 mm views, Print and Save PDF actions, invoice number, cashier, paid
  and change amounts; the order appeared at the top of the cashier's order list
  and in invoices; inventory showed the corresponding ingredient deductions.
* **Administrator** — all ten navigation entries present; dashboard displayed
  live today revenue/orders/average/profit, 35/35 menu items, 14 customers,
  open orders, low-stock alerts and audit activity; Reports rendered 448 paid
  orders, revenue, profit, payment mix, categories and best sellers for a custom
  range; a test menu item was created through the dialog (sizes 99/119/139) and
  then deleted, restoring the 35-item list; Inventory, Customers, Staff accounts
  and Settings rendered real data; the new shared dialog close control dismissed
  the invoice viewer.
* Screenshots could not be captured; no visual-pixel claims are made.

## Phase 1 — Inspection and domain design

* Inspected the existing pharmacy monorepo (Electron + React + Express + Prisma)
  and preserved its working infrastructure: workspace layout, dual ESM/CJS
  shared package, local PostgreSQL scripts, Electron security model, token
  custody, audit pattern and design primitives.
* Replaced the pharmacy domain with restaurant contracts: roles, permissions,
  menu kinds, order types/statuses, payment methods, discounts, ingredient
  units, movement types and restaurant settings.

## Phase 2 — Shared contracts

* Zod schemas for auth/users, categories, menu items/sizes/toppings/discounts/
  recipes/ingredients, orders, invoices, customers, reports and settings.
* Money helpers (`Decimal` strings, minor-unit rounding), order transition
  matrix, labels and permission matrix shared by server and client.

## Phase 3 — Data layer

* New Prisma schema with 20 models and 9 enums.
* Additive migration `20261107230000_init_restaurant` (no `DROP`).
* Seed: staff, 3 categories, 19 menu items, 3 sizes per drink, recipes,
  10 toppings, 27 ingredients, 2 suppliers, 4 discounts, 14 customers and 30
  days of orders plus an open barista board.

## Phase 4 — API server

* Modular routes for auth, users, menu, discounts, orders, invoices, customers,
  inventory, suppliers, reports, settings, audit and health.
* Argon2id passwords, JWT access tokens, rotating hashed refresh tokens,
  per-IP rate limiting, per-account lockout, audit logs.
* Server-authoritative pricing, discount cap, tax and payment validation.
* Transactional checkout with idempotent stock deduction and cancellation
  restoration.
* Reports and dashboard aggregated from paid, non-cancelled orders.

## Phase 5 — Desktop client

* Premium Qahwa design system: espresso-brown primary, caramel and cream
  accents, warm off-white background, serif display type, cards and subtle
  shadows, desktop-first responsive layouts.
* Login, role-aware shell and navigation.
* Pages: POS, Orders, Invoices, Menu & pricing, Inventory, Customers, Reports,
  Staff accounts, Settings, Dashboard.
* A4 and 80 mm invoice rendering, print through Electron, A4 PDF export, Excel
  export for reports where applicable.
* Admin dialogs for menu items/sizes, recipes, toppings, discounts, inventory,
  suppliers, customers and users; explicit close control on every dialog.
* Strict TypeScript, no unused imports/variables, no placeholder pages.

## Known limitations

These are real constraints of the current build, not future-work placeholders
shown inside the app:

1. **Deployment bundling** — the desktop client expects the API at
   `QAHWA_API_URL` (default `http://127.0.0.1:4000`) and a running PostgreSQL.
   It does not spawn or bundle them.
2. **Installer and signing** — `electron-forge make` has not been run; builds are
   not code-signed. `electron-forge package` remains available.
3. **PDF coverage** — “Save PDF” supports both the A4 invoice and the 80 mm
   receipt, but the generated PDFs were not opened during UI verification (the
   browser harness cannot automate document downloads/printing).
4. **Automated UI coverage** — shared/server/renderer unit tests plus the
   51-check live API script exist; there is no checked-in browser E2E suite or
   CI pipeline.
5. **Legacy directories** — old pharmacy modules/renderer are retained under
   `apps/server/legacy` and `apps/desktop/legacy-renderer`, excluded from builds
   and lint. Internal `@pharmacy/*` package names and the `window.pharmacy`
   bridge name are also retained for compatibility.
6. **No offline sync** — the app requires a reachable API; there is no offline
   order queue.

## How to run

```bash
pnpm install
pnpm bootstrap       # start DB, create databases, write .env, migrate, seed
pnpm dev             # API + Electron together
```

Use `pnpm bootstrap`, **not** `pnpm setup` (the latter reconfigures pnpm itself).

Demo accounts (password `Qahwa@2024`): `admin` (administrator), `cashier` and
`omar` (cashiers), `barista` (barista board).
