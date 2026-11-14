# Architecture

Qahwa Coffee House — a desktop-first coffee shop storefront, POS and management
system for an Egyptian specialty coffee house. English and Arabic, EGP money,
`Africa/Cairo` business dates.

## Repository layout

```
.
├── apps/
│   ├── server/          Node + Express + Prisma API (modular monolith)
│   ├── desktop/         Electron shell + React renderer
│   │   └── legacy-renderer/  retained old UI, excluded from builds and lint
│   └── server/legacy/        retained old pharmacy modules, not mounted
├── packages/
│   └── shared/          Types, Zod schemas, permissions, money helpers
├── scripts/             Local Postgres cluster, setup, migrations
├── .dev/                Local verification harnesses (not shipped)
└── docs/                This documentation
```

pnpm workspaces. `@pharmacy/shared` is consumed by all three runtimes and is
built as a **dual ESM/CJS** package:

| Consumer            | Resolution | Output     |
| ------------------- | ---------- | ---------- |
| API server (ESM)    | `import`   | `dist/esm` |
| Electron main (CJS) | `require`  | `dist/cjs` |
| Renderer (Vite/ESM) | `import`   | `dist/esm` |

`scripts/postbuild.mjs` writes `dist/cjs/package.json` so Node treats the CJS
output correctly inside an ESM package.

The internal `@pharmacy/*` scope, `window.pharmacy` bridge name and the
`pharmacy` development database name are retained for compatibility. They are
not shown to users.

## Process model

```
┌─────────────────────────── Electron ───────────────────────────┐
│  Main process (Node)                                           │
│   • ApiClient — owns tokens, talks HTTP to the API             │
│   • SessionStore — encrypted refresh token on disk             │
│   • ipcMain handlers — one per channel in `shared/ipc.ts`       │
│                                                                │
│        ▲  contextBridge (frozen object)   │  ipcRenderer        │
│        │                                  ▼                    │
│  Preload (sandboxed)  ─────────────────────────────► Renderer  │
│   window.pharmacy.{appInfo,health,auth,api,print}   React SPA   │
└────────────────────────────────────────────────────────────────┘
                                   │ HTTP (fetch)
                                   ▼
                      ┌────────────────────────────┐
                      │ Express API (127.0.0.1:4000)│
                      │ Prisma → PostgreSQL 55432   │
                      └────────────────────────────┘
```

### Token custody

The renderer never sees an access or refresh token. All API traffic is proxied
through `window.pharmacy.api.request({ method, path, body })`, which:

1. attaches the in-memory access token (`Authorization: Bearer …`),
2. on `401` performs **one** transparent refresh + retry,
3. returns a discriminated `ApiResponse<T>`.

The refresh token is encrypted with Electron `safeStorage` into
`userData/session.bin`; if OS encryption is unavailable it is not persisted.

## Server layering

```
routes → validate (Zod) → authorize (RBAC) → service → Prisma/SQL
```

* `middleware/` — request context + correlation id, authentication, JWT
  verification with session hydration, `authorize(permission)`,
  `validate({body,query,params})`, central errors, rate limiting.
* `lib/` — Argon2id, JWT signing, refresh-token hashing, audit trail, date
  helpers, settings access, typed `AppError` hierarchy.
* `modules/` — `auth`, `users`, `menu` (categories/items/sizes/recipes/toppings/
  discounts), `orders`, `invoices`, `customers`, `inventory`, `suppliers`,
  `reports`, `settings`, `audit`, `health`.

Errors use one envelope:

```json
{ "error": { "code": "CONFLICT", "message": "…", "details": [], "requestId": "…" } }
```

`ERROR_CODES` is shared so the client can branch on stable machine codes.

## RBAC

`packages/shared/src/permissions.ts` defines `ADMIN` and `CASHIER`. The server
re-checks every permission; renderer navigation and button states are cosmetic.

`CASHIER` permissions: `menu:read`, `orders:read:own`, `orders:create`,
`orders:update`, `discounts:apply`, `invoices:read`, `invoices:print`,
`customers:read`, `customers:write`.

Everything else (dashboard, reports, financial detail, inventory, suppliers,
users, settings, audit, `orders:cancel`, `orders:read`) is administrator-only.
Order queries are additionally scoped so a cashier can only read orders where
`cashierId` is their own id.

## Checkout — the critical path

`modules/orders/orders.service.ts` builds an order inside a single Prisma
transaction:

1. Load menu items, sizes and toppings from the database. The request contains
   IDs and quantities only — never prices.
2. Validate availability, sizes, topping limits and quantities.
3. Compute `unitPrice + topping prices` per line, then subtotal in integer minor
   units.
4. Load the discount from the database; reject inactive discounts. Percentage
   discounts round `subtotal × value / 100`; fixed discounts are capped at the
   subtotal. Cashier percentage discounts above `maxCashierDiscountPct` fail
   with 403.
5. Tax is `round((subtotal − discount) × taxRate / 100)`; delivery adds the
   configured fee only for `DELIVERY`.
6. Validate payment: cash requires `amountPaid ≥ total`; card/wallet require the
   exact total. Change is `amountPaid − total`.
7. Create order, items, topping snapshots, payment, invoice and audit log, then
   deduct stock:
   * recipe `quantity × size multiplier × line quantity`, plus
   * topping `ingredientQuantity × line quantity`.
   Deduction writes negative `InventoryMovement` rows and decrements stock with
   Prisma `decrement` inside the transaction. `inventoryDeducted` marks success.
8. Commit; the API returns the fully mapped order including its invoice.

Because status changes never re-run deduction, and cancellation checks
`inventoryDeducted` and restores the recorded movements once, stock cannot be
double-deducted or double-restored by processing an order more than once.

## Order status rules

```
pending    → confirmed | preparing | cancelled
confirmed  → preparing | cancelled
preparing  → ready     | cancelled
ready      → completed | cancelled
completed  → (terminal)
cancelled  → (terminal)
```

Illegal transitions are rejected with 400/409. New POS orders start
`CONFIRMED`; cancellation requires a reason and administrator permission.

## Reports

`modules/reports/reports.service.ts` aggregates paid, non-cancelled orders from
PostgreSQL:

* revenue = order totals excluding tax;
* discounts and tax reported separately;
* food cost = snapshotted recipe ingredient cost at sale time;
* profit = revenue − discounts − food cost + delivery fees;
* category, payment, cashier, best-seller, discount and inventory-consumption
  breakdowns come from the same paid-order set.

The dashboard uses the same data at a shorter range. No metric is hardcoded.

## Security posture

| Control                | Setting                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `contextIsolation`     | `true`                                                      |
| `nodeIntegration`      | `false`                                                     |
| `sandbox`              | `true`                                                      |
| Renderer → Node access | none (frozen preload object, channel allow-list)            |
| Navigation / new windows | denied; external `https:` links open in the browser       |
| SQL                    | Prisma parameterised queries                                |
| Passwords              | Argon2id                                                    |
| Refresh tokens         | random bytes; only SHA-256 hash stored; rotation on refresh |
| JWT                    | HS256, short-lived access token, issuer `qahwa-pos`         |
| Login throttling       | per-IP rate limit and per-account lockout                   |
| Audit                  | mutation + audit row in the same transaction                |

## Testing

| Scope                | Tool                          | Location                              |
| -------------------- | ----------------------------- | ------------------------------------- |
| Shared money/schemas/permissions | Vitest             | `packages/shared/src/**/*.test.ts`    |
| Server date/domain helpers       | Vitest             | `apps/server/src/**/*.test.ts`        |
| Renderer formatting/labels       | Vitest + RTL + jsdom | `apps/desktop/src/renderer/**/*.test.ts(x)` |
| Live API behaviour               | Node script (fetch)          | `.dev/verify.mjs` (51 checks)         |

The live verification script exercises both roles, RBAC denials, order pricing,
discount caps, payment validation, invoice creation, idempotent stock, stock
restoration on cancellation, report aggregation, customer lifecycle and settings.
