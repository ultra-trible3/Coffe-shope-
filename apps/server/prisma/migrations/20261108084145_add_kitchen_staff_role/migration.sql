-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'KITCHEN_STAFF';

-- DropIndex
DROP INDEX "orders_status_idx";

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");
