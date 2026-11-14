import { Router } from 'express';
import { z } from 'zod';
import {
  buildPaginated,
  idSchema,
  ingredientInputSchema,
  ingredientQuerySchema,
  ingredientUpdateSchema,
  movementQuerySchema,
  stockAdjustSchema,
  stockPurchaseSchema,
  type IngredientInput,
  type IngredientQuery,
  type MovementQuery,
  type StockAdjustInput,
  type StockPurchaseInput,
} from '@pharmacy/shared';
import type { Prisma } from '@prisma/client';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { recordAudit } from '../../lib/audit.js';
import { businessDayStart } from '../../lib/dates.js';
import { ConflictError, InsufficientStockError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { toIngredientDto, toMovementDto } from '../../lib/mappers.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../prisma.js';

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

const idParams = z.object({ id: idSchema });

function slugSku(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 28);
  return base ? `ING-${base}` : 'ING-ITEM';
}

async function uniqueSku(base: string, ignoreId?: string): Promise<string> {
  let candidate = base;
  let suffix = 1;
  for (;;) {
    const clash = await prisma.ingredient.findUnique({ where: { sku: candidate } });
    if (!clash || clash.id === ignoreId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

inventoryRouter.get(
  '/ingredients',
  authorize('inventory:read'),
  validate({ query: ingredientQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as IngredientQuery;
    const where: Prisma.IngredientWhereInput = {
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { nameAr: { contains: query.q, mode: 'insensitive' } },
              { sku: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.lowStock
        ? { currentStock: { lte: prisma.ingredient.fields.minStock } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.ingredient.findMany({
        where,
        include: { supplier: true },
        orderBy: [{ name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.ingredient.count({ where }),
    ]);

    res
      .status(200)
      .json(buildPaginated(rows.map(toIngredientDto), total, query.page, query.pageSize));
  }),
);

inventoryRouter.get(
  '/ingredients/low-stock',
  authorize('inventory:read'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.ingredient.findMany({
      where: {
        isActive: true,
        currentStock: { lte: prisma.ingredient.fields.minStock },
      },
      include: { supplier: true },
      orderBy: [{ currentStock: 'asc' }],
      take: 50,
    });
    res.status(200).json(rows.map(toIngredientDto));
  }),
);

inventoryRouter.get(
  '/ingredients/:id',
  authorize('inventory:read'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const row = await prisma.ingredient.findUnique({
      where: { id: req.params.id! },
      include: { supplier: true },
    });
    if (!row) throw new NotFoundError('Ingredient not found');
    res.status(200).json(toIngredientDto(row));
  }),
);

inventoryRouter.post(
  '/ingredients',
  authorize('inventory:write'),
  validate({ body: ingredientInputSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as IngredientInput;
    if (input.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
      if (!supplier) throw new ValidationError('Select a valid supplier');
    }
    const sku = input.sku ? await uniqueSku(input.sku.toUpperCase()) : await uniqueSku(slugSku(input.name));
    const created = await prisma.ingredient.create({
      data: {
        sku,
        name: input.name,
        nameAr: input.nameAr ?? null,
        unit: input.unit,
        currentStock: input.currentStock,
        minStock: input.minStock,
        costPerUnit: input.costPerUnit,
        supplierId: input.supplierId ?? null,
        isActive: input.isActive,
      },
      include: { supplier: true },
    });
    await recordAudit(
      { action: 'inventory.ingredient.created', entityType: 'Ingredient', entityId: created.id, after: { name: created.name, sku: created.sku }, userId: req.user!.id },
      prisma,
    );
    res.status(201).json(toIngredientDto(created));
  }),
);

inventoryRouter.patch(
  '/ingredients/:id',
  authorize('inventory:write'),
  validate({ params: idParams, body: ingredientUpdateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as Partial<IngredientInput>;
    const existing = await prisma.ingredient.findUnique({ where: { id: req.params.id! } });
    if (!existing) throw new NotFoundError('Ingredient not found');
    if (input.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
      if (!supplier) throw new ValidationError('Select a valid supplier');
    }
    const sku =
      input.sku && input.sku.toUpperCase() !== existing.sku
        ? await uniqueSku(input.sku.toUpperCase(), existing.id)
        : undefined;
    const updated = await prisma.ingredient.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr ?? null } : {}),
        ...(sku ? { sku } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.currentStock !== undefined ? { currentStock: input.currentStock } : {}),
        ...(input.minStock !== undefined ? { minStock: input.minStock } : {}),
        ...(input.costPerUnit !== undefined ? { costPerUnit: input.costPerUnit } : {}),
        ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: { supplier: true },
    });
    await recordAudit(
      { action: 'inventory.ingredient.updated', entityType: 'Ingredient', entityId: updated.id, userId: req.user!.id },
      prisma,
    );
    res.status(200).json(toIngredientDto(updated));
  }),
);

inventoryRouter.delete(
  '/ingredients/:id',
  authorize('inventory:write'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.ingredient.findUnique({
      where: { id: req.params.id! },
      include: { _count: { select: { movements: true, recipeItems: true, toppings: true } } },
    });
    if (!existing) throw new NotFoundError('Ingredient not found');
    if (
      existing._count.movements > 0 ||
      existing._count.recipeItems > 0 ||
      existing._count.toppings > 0
    ) {
      throw new ConflictError('This ingredient is used by recipes, toppings or stock history. Deactivate it instead.');
    }
    await prisma.ingredient.delete({ where: { id: existing.id } });
    await recordAudit(
      { action: 'inventory.ingredient.deleted', entityType: 'Ingredient', entityId: existing.id, before: { name: existing.name }, userId: req.user!.id },
      prisma,
    );
    res.status(200).json({ ok: true });
  }),
);

inventoryRouter.post(
  '/ingredients/:id/adjust',
  authorize('inventory:adjust'),
  validate({ params: idParams, body: stockAdjustSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as StockAdjustInput;
    const ingredient = await prisma.ingredient.findUnique({ where: { id: req.params.id! } });
    if (!ingredient) throw new NotFoundError('Ingredient not found');

    const nextStock = Number(ingredient.currentStock) + input.quantity;
    if (nextStock < 0) {
      throw new InsufficientStockError(
        `Adjustment would leave ${ingredient.name} at ${nextStock.toFixed(3)}. Available: ${Number(ingredient.currentStock).toFixed(3)}`,
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.ingredient.update({
        where: { id: ingredient.id },
        data: { currentStock: nextStock.toFixed(3) },
        include: { supplier: true },
      });
      await tx.inventoryMovement.create({
        data: {
          ingredientId: ingredient.id,
          type: 'ADJUSTMENT',
          quantity: input.quantity.toFixed(3),
          unitCost: ingredient.costPerUnit,
          note: input.reason,
          userId: req.user!.id,
        },
      });
      await recordAudit(
        {
          action: 'inventory.adjusted',
          entityType: 'Ingredient',
          entityId: ingredient.id,
          before: { currentStock: Number(ingredient.currentStock) },
          after: { currentStock: nextStock, reason: input.reason },
          userId: req.user!.id,
        },
        tx,
      );
      return updated;
    });

    res.status(200).json(toIngredientDto(result));
  }),
);

inventoryRouter.post(
  '/ingredients/:id/purchase',
  authorize('inventory:write'),
  validate({ params: idParams, body: stockPurchaseSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as StockPurchaseInput;
    const ingredient = await prisma.ingredient.findUnique({ where: { id: req.params.id! } });
    if (!ingredient) throw new NotFoundError('Ingredient not found');
    if (input.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
      if (!supplier) throw new ValidationError('Select a valid supplier');
    }

    const unitCost = input.unitCost ?? Number(ingredient.costPerUnit).toFixed(2);
    const nextStock = Number(ingredient.currentStock) + input.quantity;

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.ingredient.update({
        where: { id: ingredient.id },
        data: {
          currentStock: nextStock.toFixed(3),
          ...(input.unitCost !== undefined ? { costPerUnit: input.unitCost } : {}),
          ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
        },
        include: { supplier: true },
      });
      await tx.inventoryMovement.create({
        data: {
          ingredientId: ingredient.id,
          type: 'PURCHASE',
          quantity: input.quantity.toFixed(3),
          unitCost,
          reference: input.reference ?? null,
          note: input.note ?? null,
          userId: req.user!.id,
        },
      });
      await recordAudit(
        {
          action: 'inventory.purchased',
          entityType: 'Ingredient',
          entityId: ingredient.id,
          before: { currentStock: Number(ingredient.currentStock) },
          after: { currentStock: nextStock, quantity: input.quantity },
          userId: req.user!.id,
        },
        tx,
      );
      return row;
    });

    res.status(200).json(toIngredientDto(updated));
  }),
);

inventoryRouter.get(
  '/movements',
  authorize('inventory:read'),
  validate({ query: movementQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as MovementQuery;
    const where: Prisma.InventoryMovementWhereInput = {
      ...(query.ingredientId ? { ingredientId: query.ingredientId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: businessDayStart(query.from) } : {}),
              ...(query.to ? { lt: new Date(businessDayStart(query.to).getTime() + 86_400_000) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: { ingredient: true, user: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    res
      .status(200)
      .json(buildPaginated(rows.map(toMovementDto), total, query.page, query.pageSize));
  }),
);
