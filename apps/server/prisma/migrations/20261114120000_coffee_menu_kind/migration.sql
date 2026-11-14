-- Coffee shop menu taxonomy: replace the pizza-era kinds with drink/bakery kinds.
ALTER TYPE "MenuKind" RENAME TO "MenuKind_old";
CREATE TYPE "MenuKind" AS ENUM ('HOT_DRINK', 'COLD_DRINK', 'BAKERY', 'DESSERT');

ALTER TABLE "menu_items" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TABLE "menu_items" ALTER COLUMN "kind" TYPE "MenuKind" USING (
  CASE "kind"::text
    WHEN 'PIZZA' THEN 'HOT_DRINK'
    WHEN 'DRINK' THEN 'COLD_DRINK'
    WHEN 'SIDE' THEN 'BAKERY'
    WHEN 'APPETIZER' THEN 'BAKERY'
    WHEN 'SAUCE' THEN 'DESSERT'
    WHEN 'DESSERT' THEN 'DESSERT'
  END
)::"MenuKind";
ALTER TABLE "menu_items" ALTER COLUMN "kind" SET DEFAULT 'HOT_DRINK';
DROP TYPE "MenuKind_old";

ALTER TABLE "restaurant_settings" ALTER COLUMN "name" SET DEFAULT 'Qahwa Coffee House';
