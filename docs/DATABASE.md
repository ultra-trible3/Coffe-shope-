# Database

PostgreSQL 18, accessed exclusively through Prisma. Schema:
[`apps/server/prisma/schema.prisma`](../apps/server/prisma/schema.prisma).

## Conventions

| Concern            | Choice                                                        |
| ------------------ | ------------------------------------------------------------- |
| Table names        | snake_case plural via `@@map` (`menu_items`, `order_items`)   |
| Column names       | camelCase, quoted                                             |
| Money              | `Decimal(14,2)` / `NUMERIC(14,2)` — never float               |
| Ingredient stock   | `Decimal(12,3)` (kg/L quantities can be fractional)           |
| IDs                | `TEXT` CUIDs (`cuid()`)                                       |
| Event timestamps   | `TIMESTAMP(3)` (`createdAt`, `updatedAt`)                     |
| Order identity     | Daily sequence (`ORD-YYYYMMDD-NNNN`) + invoice number         |

API-facing order statuses are lowercase (`confirmed`), Prisma enums are upper
case (`CONFIRMED`); mappers translate at the boundary.

## Enums

* `Role` — `ADMIN`, `CASHIER`
* `MenuKind` — `HOT_DRINK`, `COLD_DRINK`, `BAKERY`, `DESSERT`
* `OrderType` — `DINE_IN`, `TAKEAWAY`, `DELIVERY`
* `OrderStatus` — `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`
* `PaymentMethod` — `CASH`, `CARD`, `WALLET`
* `PaymentStatus` — `UNPAID`, `PAID`, `REFUNDED`
* `IngredientUnit` — `KG`, `G`, `L`, `ML`, `PIECE`, `PACK`
* `MovementType` — `PURCHASE`, `SALE_DEDUCTION`, `ADJUSTMENT`, `WASTE`, `RETURN`, `CANCELLATION_RETURN`
* `DiscountType` — `PERCENT`, `FIXED`

## Models

```
User ──< Session
User ──< AuditLog
User ──< Order (cashier)
User ──< InventoryMovement

Category ──< MenuItem ──< MenuItemSize
MenuItem ──  Recipe ──< RecipeItem >── Ingredient
MenuItem ──< OrderItem ──< OrderItemTopping >── Topping

Supplier ──< Ingredient ──< InventoryMovement
Ingredient ──< RecipeItem
Ingredient ──< Topping

Customer ──< Order >── Discount
Order ──< OrderItem ──< OrderItemTopping
Order ──< Payment
Order ──  Invoice
RestaurantSettings (single row, id = "default")
```

### Integrity and history

* `OrderItem` snapshots `menuItemName`, `sizeName`, `unitPrice`, `toppingsTotal`,
  `lineTotal` and `unitCost` so historical invoices and profit do not change when
  the menu or ingredient costs change.
* `OrderItemTopping` snapshots topping name and price.
* Menu items and ingredients referenced by orders/movements use `Restrict` on
  delete; the API returns 409 with guidance to mark them unavailable instead.
* `Order.inventoryDeducted` and `inventoryRestored` make stock changes idempotent.
* `InventoryMovement` is the stock ledger: negative `SALE_DEDUCTION` rows at
  checkout, positive `CANCELLATION_RETURN` rows on cancellation, and signed
  `ADJUSTMENT` rows for manual corrections.
* `RestaurantSettings` keeps tax rate, delivery fee and the cashier discount
  cap; checkout reads it server-side.

### Indexes

Every foreign key used for lists/filters is indexed: `orders` by status, type,
cashier, customer, createdAt, payment method and order number; `menu_items` by
category, kind, availability, featured and name; `ingredients` by name, active
and supplier; `inventory_movements` by `(ingredientId, createdAt)`, order, type
and createdAt; `audit_logs` by entity, user, createdAt and action.

## Migration

| Migration                            | Contents                                                    |
| ------------------------------------ | ----------------------------------------------------------- |
| `20261107230000_init_restaurant`     | Full restaurant schema: enums, 20 tables, FKs, unique keys, indexes, settings row |

The migration is additive (`CREATE SCHEMA IF NOT EXISTS`, no `DROP`); it replaces
the pharmacy domain without deleting the existing database. The local database
name remains `pharmacy` so an existing cluster/bootstrap does not need to be
destroyed.

## Databases

| Database        | Purpose                   | Env var             |
| --------------- | ------------------------- | ------------------- |
| `pharmacy`      | development / seeded demo | `DATABASE_URL`      |
| `pharmacy_test` | integration test target   | `TEST_DATABASE_URL` |

Both live on the repo-local cluster at `127.0.0.1:55432`.

## Commands

```bash
pnpm db:start          # start the local cluster
pnpm db:status         # show connection string + port
pnpm db:migrate        # create + apply a migration (dev)
pnpm db:migrate:test   # apply migrations to the test database
pnpm db:seed           # (re)seed demo data
pnpm db:reset          # drop, re-migrate and re-seed (development only)
pnpm db:stop           # stop the cluster
```

## Seed data

`prisma/seed.ts` creates:

* 4 staff users (`admin`, `cashier`, `omar`, `barista`; password `Qahwa@2024`);
* 3 categories and 19 menu items — 7 hot drinks, 6 cold drinks and 6 bakery /
  dessert items, each with sizes and a recipe;
* 10 toppings and 4 discounts;
* 27 ingredients across 2 suppliers, with stock levels that include low-stock
  examples;
* 14 customers;
* 30 days of completed/paid orders plus a live board of pending, confirmed,
  preparing and ready orders, with invoices, payments and stock movements.

The seed is deterministic enough for demos but uses randomized daily volumes to
make charts and reports look real.
