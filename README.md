# Qahwa Coffee House — Coffee Shop POS & Storefront

A desktop-first **coffee shop point-of-sale, storefront and management system**.
The Electron + React client opens on a premium coffee storefront, and the same
process runs the barista register, the live drink board, the back-office menu,
inventory, orders, invoices and reporting — all over a PostgreSQL API with
authoritative server-side pricing and transactional inventory deduction.

**Brand:** Qahwa Coffee House · **Tagline:** Your daily dose of happiness.  
**Currency:** EGP · **Timezone:** Africa/Cairo · **Locale:** English + Arabic

## What is implemented

### Storefront (home)

* Full-bleed hero with the headline **"Your Daily Dose of Happiness"**, opening
  hours, rating and location, a Shop Now call to action and an Explore Menu jump.
* Category tiles for Hot Drinks, Cold Drinks and Food & Desserts that deep-link
  into the register with the category preselected.
* Featured coffee grid built from live catalogue data: image, kind, rating,
  description, starting price and an Add to Cart action that drops the product
  straight into the open ticket.
* Dark Best Sellers band, Special Offers cards, About Our Coffee story, customer
  reviews and a footer with address, hours, phone, email and social links.
* Everything is driven by the seeded catalogue, so editing a price in the admin
  panel updates the storefront prices immediately.

### Point of sale (cashier / barista)

* Three-pane register: category rail, searchable menu grid (name, SKU,
  description, `F2` focus), and the current ticket.
* Drink sizes with per-size prices, multi-select toppings and milk swaps, special
  instructions, quantities, and live price build-up.
* Dine-in, takeaway and delivery service types, table numbers, guest profiles.
* Authorised discounts from the active discount list, with the cashier cap shown
  in the register.
* Cash, card and mobile-wallet payments; quick-cash denominations, exact amount
  and change calculation.
* Checkout creates the order, payment, invoice and inventory movements in one
  database transaction, then opens the invoice viewer.
* Cashiers can only read their own orders and invoices.

### Barista board

* Live ticket board polled every five seconds, with automatic arrival alerts and
  overdue highlighting.
* Tabs for new, preparing, ready and completed tickets, with order number,
  drinks, quantities, sizes, add-ons, item notes and the order note.
* Strict workflow: New → Accepted → Preparing → Ready → Completed, enforced on
  the server with concurrency-safe status updates.
* Ticket data is intentionally limited to preparation-relevant fields; prices,
  payments and customer contact details are never sent to barista staff.
* Administrators see the same progress tracker in the staff order detail dialog.

### Menu and catalogue (administrator)

* Categories, menu items, sizes, toppings and discounts.
* Per-item availability, featured flag, kind (hot drink, cold drink, bakery,
  dessert), SKU, prep time, image URL, food cost and recipe multiplier per size.
* Recipe editor linking ingredients to menu items.
* Deleting an item or category used by past orders is blocked (409); mark it
  sold out instead.

### Inventory and suppliers (administrator)

* Ingredient stock, minimum levels, units, supplier and cost per unit.
* Stock value, low-stock indicators, movement ledger, manual adjustments and
  restocking.
* Suppliers CRUD.
* Order checkout deducts recipe quantities × size multiplier × line quantity,
  plus topping ingredient quantities.
* Cancelling an order restores stock exactly once via a cancellation movement.

### Orders, invoices and customers

* Order board with search, status/type/date filters and pagination.
* Legal status transitions only; admins can cancel with a required reason.
* A4 invoice and 80 mm receipt renderings, print through Electron, and PDF
  export for either layout.
* Customer profiles with order history, totals and last-order dates; the server
  blocks deleting customers that have orders.

### Dashboard, reports and administration (administrator)

* Dashboard KPIs, revenue/orders/profit trend, payment mix, category sales, best
  sellers, recent orders, low-stock alerts and audit activity — all aggregated
  from live data.
* Sales report presets (today, 7 days, month, previous month, year) and custom
  ranges, with daily/monthly trends, financial breakdown, category and payment
  splits, best sellers, cashier performance, discounts and ingredient usage.
* Staff accounts: create, edit role/status, reset passwords; administrators
  cannot demote, reset or deactivate their own account in the UI.
* Coffee house settings: identity, tax rate, delivery fee, cashier discount cap
  and receipt footer.

## The menu

| Category            | Items                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| **Hot Drinks**      | Espresso, Americano, Cappuccino, Latte, Mocha, Flat White, Hot Chocolate     |
| **Cold Drinks**     | Iced Latte, Iced Americano, Iced Mocha, Frappuccino, Cold Brew, Iced Matcha  |
| **Food & Desserts** | Croissant, Muffin, Cheesecake, Cookies, Brownies, Donuts                     |

Each item ships with a bundled 900×900 image resolved through the
`qahwa-asset:` key scheme, English and Arabic copy, a starting price and a
recipe that deducts real ingredients when an order is checked out.

## Roles

| Role              | Access                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Administrator** | Everything: storefront, dashboard, menu, inventory, suppliers, customers, orders, invoices, reports, staff and settings. |
| **Cashier**       | Storefront, point of sale, own orders, own invoices, customer lookup/create/edit. No menu, inventory, reports, users or settings. |
| **Barista**       | Barista board only: view incoming tickets and advance their status. No admin, POS, customer, payment or price access.     |

The permission matrix lives in `packages/shared/src/permissions.ts`. It is
enforced **server-side on every protected route** — hiding navigation is only a
convenience. Cashiers additionally cannot cancel orders, exceed the configured
discount cap, or change menu/inventory data.

### Demo accounts

Password for all seeded accounts: **`Qahwa@2024`**

| Username  | Name          | Role          |
| --------- | ------------- | ------------- |
| `admin`   | Mariam Adel   | Administrator |
| `cashier` | Layla Hassan  | Cashier       |
| `omar`    | Omar Khaled   | Cashier       |
| `barista` | Nadia Farouk  | Barista       |

## Stack

| Layer      | Technology                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| Desktop    | Electron 33, React 18, TypeScript (strict), Vite, Electron Forge           |
| UI         | Tailwind CSS 3, Radix Dialog/Label/Select, TanStack Query 5, Zustand, RHF + Zod, lucide-react |
| API        | Node.js, Express 4, TypeScript ESM, Pino, Zod, OpenAPI at `/api/docs`      |
| Data       | PostgreSQL 18 (repo-local cluster, port 55432), Prisma 6, versioned migrations |
| Security   | Argon2id, JWT access tokens, rotating hashed refresh tokens, per-IP and per-account throttling |
| Documents  | Electron print pipeline, `html2pdf.js` for A4 and 80 mm PDF               |
| Testing    | Vitest, React Testing Library, live API and real-renderer verification scripts |

Internal package names (`@pharmacy/*`) and the `window.pharmacy` preload bridge
were intentionally retained to avoid breaking existing tooling or destroying the
local database. All user-facing branding and domain behaviour is
coffee-house-specific.

## How to run

### 1. Install the prerequisites

* **Node.js 20.11+** — check with `node --version`.
* **pnpm 9**:
  ```bash
  corepack enable
  corepack prepare pnpm@9.7.0 --activate
  ```
* **PostgreSQL 17+ installed locally**. No running Windows service is needed:
  the repo creates and controls its own isolated cluster in `.dev/pgdata` on
  port **55432**.
  * On Windows the binaries are auto-detected under
    `C:\Program Files\PostgreSQL\<version>\bin`.
  * On macOS/Linux, or a custom install location, point
    `PG_DEV_BIN_DIR` at the PostgreSQL `bin` directory:
    ```bash
    export PG_DEV_BIN_DIR=/usr/local/opt/postgresql@18/bin   # example
    ```
* Free ports: **4000** (API), **5173** (Vite dev server, desktop only) and
  **55432** (repo-local PostgreSQL).

### 2. First-time setup

From the repository root:

```bash
pnpm install
pnpm bootstrap
```

`pnpm bootstrap` is idempotent and does the following:

1. verifies Node and installed dependencies,
2. creates and starts the project-local PostgreSQL cluster on port 55432,
3. creates the `pharmacy` and `pharmacy_test` databases,
4. writes `apps/server/.env` with the generated database password and a fresh
   JWT secret (an existing `.env` is never overwritten),
5. applies Prisma migrations to both databases and loads the demo seed.

Use **`pnpm bootstrap`**, not `pnpm setup` (`setup` is a built-in pnpm command
that reconfigures pnpm itself).

### 3. Start the app

```bash
pnpm dev
```

This starts the API and the Electron desktop client together. The window opens
the storefront (administrators) or the register (cashiers) once the API is ready.

Alternatively, run the pieces in separate terminals:

```bash
pnpm db:start      # start the local PostgreSQL cluster
pnpm dev:server    # API only, http://127.0.0.1:4000
pnpm dev:desktop   # Electron only (expects the API to be running)
```

The API docs are available at `http://127.0.0.1:4000/api/docs`.

### 4. Sign in

Use one of the seeded demo accounts with the shared password **`Qahwa@2024`**:

| Username  | Role          |
| --------- | ------------- |
| `admin`   | Administrator |
| `cashier` | Cashier       |
| `omar`    | Cashier       |
| `barista` | Barista       |

### 5. Stop everything

Press `Ctrl+C` in the `pnpm dev` terminal, then stop the database:

```bash
pnpm db:stop
```

### Troubleshooting

* **`PostgreSQL binaries were not found`** — install PostgreSQL or set
  `PG_DEV_BIN_DIR` to its `bin` directory before running `pnpm bootstrap`.
* **`Dependencies are not installed`** — run `pnpm install` first.
* **Port 55432 already in use** — stop the other instance with
  `pnpm db:stop`, or start the cluster on another port:
  `PG_DEV_PORT=55433 pnpm bootstrap` (then update `DATABASE_URL` in
  `apps/server/.env` accordingly).
* **Port 4000 already in use** — stop the process using it, or point the
  desktop client elsewhere with `QAHWA_API_URL`.
* **Reset the database** — `pnpm db:reset` wipes the local databases,
  re-applies migrations and re-seeds the demo data. This is destructive to
  local data.
* **Desktop cannot reach the API** — set `QAHWA_API_URL` (default
  `http://127.0.0.1:4000`) in the environment that starts the desktop app.

## Common commands

```bash
pnpm dev                 # API + desktop
pnpm dev:server          # API only
pnpm dev:desktop         # Electron only

pnpm test                # shared + server + desktop test suites
pnpm typecheck           # all packages
pnpm lint                # ESLint flat config
pnpm build               # shared → server → desktop renderer

pnpm db:start / db:stop / db:status
pnpm db:migrate / db:seed / db:reset
```

The desktop client reads `QAHWA_API_URL` (default `http://127.0.0.1:4000`).

## Domain rules that protect money and stock

* **The server owns every price.** The client sends menu item IDs, size IDs,
  topping IDs and quantities only. Unit prices, topping prices, subtotal,
  discount, tax, delivery fee, change and total are computed from the database.
* **Money is decimal.** `NUMERIC(14,2)` in PostgreSQL and fixed two-decimal
  strings on the wire; rounding happens in integer minor units server-side.
* **Checkout is one transaction.** Order, payment, invoice, line-cost snapshots
  and inventory movements commit together or not at all.
* **Stock is deducted once.** `inventoryDeducted` gates deduction; legal
  transitions never deduct again, and cancellation restores the recorded
  movements once.
* **Discount limits are enforced server-side.** Percentage discounts above
  `maxCashierDiscountPct` are rejected with 403; fixed discounts are capped at
  the subtotal.
* **Reports are real.** Dashboard and report figures aggregate paid,
  non-cancelled orders from PostgreSQL. Profit subtracts ingredient cost plus
  discounts and includes delivery fees; it is never estimated or hardcoded.
* **Every mutation is audited** in `audit_logs` within the same transaction.

## Verification snapshot

| Check                                              | Result                          |
| -------------------------------------------------- | ------------------------------- |
| `pnpm typecheck`                                   | pass (3 packages)               |
| `pnpm lint`                                        | pass (0 problems)               |
| `pnpm test`                                        | pass — 51 tests in 7 files      |
| `pnpm build`                                       | pass (shared, server, renderer) |
| Prisma migration status                            | up to date                      |
| Live API verification, barista workflow and RBAC   | pass — 51/51 checks             |
| Storefront, register, invoices, responsive and dark mode | pass (real Electron window, English + Arabic RTL, light + dark, 390–1424 px) |

The register was exercised in the real Electron window against the live API:
an Americano (Regular) at 65.00 plus 9.10 tax produced a 74.10 total; exact-cash
payment created order `ORD-20261114-A260AE` and invoice `INV-20261114-A260AE`
with the coffee-branded receipt, and inventory and order history reflected it.
The admin dashboard and reports rendered live database aggregates. The same
build was checked in English and Arabic (RTL), light and dark themes, and at
390 px and 1424 px widths with no page-level horizontal overflow.

## Known limitations

* The desktop app expects the API at `QAHWA_API_URL`; it does not bundle or
  spawn its own PostgreSQL/server.
* `electron-forge make` (Squirrel installer) has not been run and builds are not
  code-signed.
* PDF export supports the A4 invoice and the 80 mm receipt, but the export path
  was not exercised in the browser harness (printing cannot be automated there).
* Automated coverage currently focuses on shared contracts/helpers plus the
  live API script; there is no full browser-E2E test runner in CI.
* Internal package names still use the `@pharmacy/*` scope (non-user-facing).
* Historical Prisma migrations under `apps/server/prisma` still contain the
  original enum literals from the restaurant-era schema; they are applied
  migration history only and are never shown in the UI.

## License

UNLICENSED — private project.
