import { Router } from 'express';
import { z } from 'zod';
import {
  buildPaginated,
  categoryCreateSchema,
  categoryUpdateSchema,
  discountCreateSchema,
  discountUpdateSchema,
  idSchema,
  menuItemCreateSchema,
  menuItemUpdateSchema,
  menuQuerySchema,
  pickLocalized,
  pickLocalizedNullable,
  recipeUpsertSchema,
  toppingCreateSchema,
  toppingUpdateSchema,
  type MenuItemCreateInput,
  type MenuItemUpdateInput,
  type MenuQuery,
  type MenuItemSizeInput,
} from '@pharmacy/shared';
import type { Prisma } from '@prisma/client';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { recordAudit } from '../../lib/audit.js';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import {
  menuItemInclude,
  toCategoryDto,
  toDiscountDto,
  toMenuItemDto,
  toToppingDto,
} from '../../lib/mappers.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../prisma.js';
import { currentLanguage } from '../../lib/request-language.js';

export const categoriesRouter = Router();
categoriesRouter.use(authenticate);

export const menuRouter = Router();
menuRouter.use(authenticate);

export const discountsRouter = Router();
discountsRouter.use(authenticate);

const idParams = z.object({ id: idSchema });

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

categoriesRouter.get(
  '/',
  authorize('menu:read'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.category.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.status(200).json(rows.map(toCategoryDto));
  }),
);

categoriesRouter.post(
  '/',
  authorize('menu:write'),
  validate({ body: categoryCreateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof categoryCreateSchema>;
    const clash = await prisma.category.findUnique({ where: { name: input.name } });
    if (clash) throw new ConflictError('A category with that name already exists');

    const created = await prisma.category.create({
      data: {
        name: input.name,
        nameAr: input.nameAr ?? null,
        description: input.description ?? null,
        descriptionAr: input.descriptionAr ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
      include: { _count: { select: { items: true } } },
    });
    await recordAudit(
      { action: 'category.created', entityType: 'Category', entityId: created.id, after: { name: created.name }, userId: req.user!.id },
      prisma,
    );
    res.status(201).json(toCategoryDto(created));
  }),
);

categoriesRouter.patch(
  '/:id',
  authorize('menu:write'),
  validate({ params: idParams, body: categoryUpdateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof categoryUpdateSchema>;
    const existing = await prisma.category.findUnique({ where: { id: req.params.id! } });
    if (!existing) throw new NotFoundError('Category not found');
    if (input.name && input.name !== existing.name) {
      const clash = await prisma.category.findUnique({ where: { name: input.name } });
      if (clash) throw new ConflictError('A category with that name already exists');
    }
    const updated = await prisma.category.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr ?? null } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.descriptionAr !== undefined ? { descriptionAr: input.descriptionAr ?? null } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: { _count: { select: { items: true } } },
    });
    await recordAudit(
      { action: 'category.updated', entityType: 'Category', entityId: updated.id, userId: req.user!.id },
      prisma,
    );
    res.status(200).json(toCategoryDto(updated));
  }),
);

categoriesRouter.delete(
  '/:id',
  authorize('menu:delete'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.category.findUnique({
      where: { id: req.params.id! },
      include: { _count: { select: { items: true } } },
    });
    if (!existing) throw new NotFoundError('Category not found');
    if (existing._count.items > 0) {
      throw new ConflictError('Move or delete the menu items in this category first');
    }
    await prisma.category.delete({ where: { id: existing.id } });
    await recordAudit(
      { action: 'category.deleted', entityType: 'Category', entityId: existing.id, before: { name: existing.name }, userId: req.user!.id },
      prisma,
    );
    res.status(200).json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Menu items
// ---------------------------------------------------------------------------

function slugSku(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 28);
  return base || 'ITEM';
}

async function uniqueSku(base: string, ignoreId?: string): Promise<string> {
  let candidate = base;
  let suffix = 1;
  for (;;) {
    const clash = await prisma.menuItem.findUnique({ where: { sku: candidate } });
    if (!clash || clash.id === ignoreId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

function normaliseSizes(sizes: MenuItemSizeInput[]): MenuItemSizeInput[] {
  if (sizes.length === 0) return sizes;
  const names = new Set<string>();
  for (const size of sizes) {
    const key = size.name.trim().toLowerCase();
    if (names.has(key)) throw new ValidationError('Size names must be unique');
    names.add(key);
  }
  const defaults = sizes.filter((size) => size.isDefault);
  if (defaults.length > 1) throw new ValidationError('Only one size can be the default');
  if (defaults.length === 0) {
    return sizes.map((size, index) => ({ ...size, isDefault: index === 0 }));
  }
  return sizes;
}

menuRouter.get(
  '/catalog',
  authorize('menu:read'),
  asyncHandler(async (req, res) => {
    const includeCost = req.user!.role === 'ADMIN';
    const [categories, items, toppings, discounts] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.menuItem.findMany({
        include: menuItemInclude,
        orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
      }),
      prisma.topping.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      prisma.discount.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    ]);

    const language = currentLanguage();
    res.status(200).json({
      categories: categories.map((category) => ({
        id: category.id,
        name: pickLocalized(language, category.name, category.nameAr),
        nameEn: category.name,
        nameAr: category.nameAr,
        description: pickLocalizedNullable(language, category.description, category.descriptionAr),
        descriptionEn: category.description,
        descriptionAr: category.descriptionAr,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      })),
      items: items.map((item) => toMenuItemDto(item, includeCost)),
      toppings: toppings.map(toToppingDto),
      discounts: discounts.map(toDiscountDto),
    });
  }),
);

menuRouter.get(
  '/items',
  authorize('menu:read'),
  validate({ query: menuQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as MenuQuery;
    const where: Prisma.MenuItemWhereInput = {
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { nameAr: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
              { descriptionAr: { contains: query.q, mode: 'insensitive' } },
              { sku: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.isAvailable !== undefined ? { isAvailable: query.isAvailable } : {}),
      ...(query.featured !== undefined ? { isFeatured: query.featured } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        include: menuItemInclude,
        orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.menuItem.count({ where }),
    ]);

    const includeCost = req.user!.role === 'ADMIN';
    res
      .status(200)
      .json(buildPaginated(rows.map((row) => toMenuItemDto(row, includeCost)), total, query.page, query.pageSize));
  }),
);

menuRouter.get(
  '/items/:id',
  authorize('menu:read'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const row = await prisma.menuItem.findUnique({
      where: { id: req.params.id! },
      include: menuItemInclude,
    });
    if (!row) throw new NotFoundError('Menu item not found');
    res.status(200).json(toMenuItemDto(row, req.user!.role === 'ADMIN'));
  }),
);

menuRouter.post(
  '/items',
  authorize('menu:write'),
  rateLimit({ name: 'menu:create', windowMs: 60_000, max: 60 }),
  validate({ body: menuItemCreateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as MenuItemCreateInput;
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new ValidationError('Select a valid category');

    const hasSizes = input.hasSizes && input.sizes.length > 0;
    const sizes = hasSizes ? normaliseSizes(input.sizes) : [];
    const sku = input.sku ? await uniqueSku(input.sku.toUpperCase()) : await uniqueSku(slugSku(input.name));

    const created = await prisma.menuItem.create({
      data: {
        sku,
        name: input.name,
        nameAr: input.nameAr ?? null,
        description: input.description ?? null,
        descriptionAr: input.descriptionAr ?? null,
        imageUrl: input.imageUrl ?? null,
        categoryId: input.categoryId,
        kind: input.kind,
        basePrice: input.basePrice,
        costPrice: input.costPrice,
        prepMinutes: input.prepMinutes,
        isAvailable: input.isAvailable,
        isFeatured: input.isFeatured,
        hasSizes,
        sizes: hasSizes
          ? {
              create: sizes.map((size) => ({
                name: size.name,
                nameAr: size.nameAr ?? null,
                price: size.price,
                ingredientMultiplier: size.ingredientMultiplier,
                isDefault: size.isDefault,
                sortOrder: size.sortOrder,
              })),
            }
          : undefined,
      },
      include: menuItemInclude,
    });
    await recordAudit(
      {
        action: 'menu.item.created',
        entityType: 'MenuItem',
        entityId: created.id,
        after: { name: created.name, sku: created.sku, basePrice: created.basePrice.toString() },
        userId: req.user!.id,
      },
      prisma,
    );
    res.status(201).json(toMenuItemDto(created));
  }),
);

menuRouter.patch(
  '/items/:id',
  authorize('menu:write'),
  validate({ params: idParams, body: menuItemUpdateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as MenuItemUpdateInput;
    const existing = await prisma.menuItem.findUnique({
      where: { id: req.params.id! },
      include: { sizes: true },
    });
    if (!existing) throw new NotFoundError('Menu item not found');
    if (input.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!category) throw new ValidationError('Select a valid category');
    }

    const nextHasSizes =
      input.hasSizes !== undefined ? input.hasSizes : existing.hasSizes;
    const sizes = input.sizes !== undefined ? normaliseSizes(input.sizes) : undefined;
    if (nextHasSizes && sizes !== undefined && sizes.length === 0) {
      throw new ValidationError('Add at least one size when the item is sold by size');
    }
    if (nextHasSizes && sizes === undefined && existing.sizes.length === 0) {
      throw new ValidationError('Add at least one size when the item is sold by size');
    }
    const sku =
      input.sku && input.sku.toUpperCase() !== existing.sku
        ? await uniqueSku(input.sku.toUpperCase(), existing.id)
        : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.menuItem.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.nameAr !== undefined ? { nameAr: input.nameAr ?? null } : {}),
          ...(input.description !== undefined ? { description: input.description ?? null } : {}),
          ...(input.descriptionAr !== undefined ? { descriptionAr: input.descriptionAr ?? null } : {}),
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl ?? null } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.kind !== undefined ? { kind: input.kind } : {}),
          ...(sku ? { sku } : {}),
          ...(input.basePrice !== undefined ? { basePrice: input.basePrice } : {}),
          ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
          ...(input.prepMinutes !== undefined ? { prepMinutes: input.prepMinutes } : {}),
          ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
          ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
          ...(input.hasSizes !== undefined || input.sizes !== undefined ? { hasSizes: nextHasSizes } : {}),
        },
      });

      if (sizes !== undefined || nextHasSizes === false) {
        await tx.menuItemSize.deleteMany({ where: { menuItemId: existing.id } });
        if (nextHasSizes && sizes && sizes.length > 0) {
          await tx.menuItemSize.createMany({
            data: sizes.map((size) => ({
              menuItemId: existing.id,
              name: size.name,
              nameAr: size.nameAr ?? null,
              price: size.price,
              ingredientMultiplier: size.ingredientMultiplier,
              isDefault: size.isDefault,
              sortOrder: size.sortOrder,
            })),
          });
        }
      }

      return tx.menuItem.findUniqueOrThrow({
        where: { id: existing.id },
        include: menuItemInclude,
      });
    });

    await recordAudit(
      {
        action: 'menu.item.updated',
        entityType: 'MenuItem',
        entityId: updated.id,
        before: { name: existing.name, basePrice: existing.basePrice.toString(), isAvailable: existing.isAvailable },
        after: { name: updated.name, basePrice: updated.basePrice.toString(), isAvailable: updated.isAvailable },
        userId: req.user!.id,
      },
      prisma,
    );
    res.status(200).json(toMenuItemDto(updated));
  }),
);

menuRouter.delete(
  '/items/:id',
  authorize('menu:delete'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.menuItem.findUnique({
      where: { id: req.params.id! },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!existing) throw new NotFoundError('Menu item not found');
    if (existing._count.orderItems > 0) {
      throw new ConflictError('This item appears on past orders. Mark it unavailable instead of deleting it.');
    }
    await prisma.menuItem.delete({ where: { id: existing.id } });
    await recordAudit(
      { action: 'menu.item.deleted', entityType: 'MenuItem', entityId: existing.id, before: { name: existing.name, sku: existing.sku }, userId: req.user!.id },
      prisma,
    );
    res.status(200).json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

menuRouter.get(
  '/items/:id/recipe',
  authorize('recipes:read'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const item = await prisma.menuItem.findUnique({
      where: { id: req.params.id! },
      include: menuItemInclude,
    });
    if (!item) throw new NotFoundError('Menu item not found');
    res.status(200).json(toMenuItemDto(item).recipe);
  }),
);

menuRouter.put(
  '/items/:id/recipe',
  authorize('recipes:write'),
  validate({ params: idParams, body: recipeUpsertSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof recipeUpsertSchema>;
    const item = await prisma.menuItem.findUnique({ where: { id: req.params.id! } });
    if (!item) throw new NotFoundError('Menu item not found');

    const ingredientIds = [...new Set(input.items.map((line) => line.ingredientId))];
    const found = await prisma.ingredient.count({ where: { id: { in: ingredientIds } } });
    if (found !== ingredientIds.length) throw new ValidationError('One or more ingredients do not exist');

    await prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.upsert({
        where: { menuItemId: item.id },
        update: { notes: input.notes ?? null },
        create: { menuItemId: item.id, notes: input.notes ?? null },
      });
      await tx.recipeItem.deleteMany({ where: { recipeId: recipe.id } });
      if (input.items.length > 0) {
        await tx.recipeItem.createMany({
          data: input.items.map((line) => ({
            recipeId: recipe.id,
            ingredientId: line.ingredientId,
            quantity: line.quantity,
          })),
        });
      }
    });

    await recordAudit(
      { action: 'menu.recipe.updated', entityType: 'MenuItem', entityId: item.id, after: { lines: input.items.length }, userId: req.user!.id },
      prisma,
    );
    res.status(200).json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Toppings
// ---------------------------------------------------------------------------

menuRouter.get(
  '/toppings',
  authorize('menu:read'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.topping.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    res.status(200).json(rows.map(toToppingDto));
  }),
);

menuRouter.post(
  '/toppings',
  authorize('toppings:manage'),
  validate({ body: toppingCreateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof toppingCreateSchema>;
    const clash = await prisma.topping.findUnique({ where: { name: input.name } });
    if (clash) throw new ConflictError('A topping with that name already exists');
    if (input.ingredientId) {
      const ingredient = await prisma.ingredient.findUnique({ where: { id: input.ingredientId } });
      if (!ingredient) throw new ValidationError('Select a valid ingredient');
    }
    const created = await prisma.topping.create({
      data: {
        name: input.name,
        nameAr: input.nameAr ?? null,
        price: input.price,
        ingredientId: input.ingredientId ?? null,
        ingredientQuantity: input.ingredientQuantity,
        isAvailable: input.isAvailable,
        sortOrder: input.sortOrder,
      },
    });
    await recordAudit(
      { action: 'menu.topping.created', entityType: 'Topping', entityId: created.id, after: { name: created.name, price: created.price.toString() }, userId: req.user!.id },
      prisma,
    );
    res.status(201).json(toToppingDto(created));
  }),
);

menuRouter.patch(
  '/toppings/:id',
  authorize('toppings:manage'),
  validate({ params: idParams, body: toppingUpdateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof toppingUpdateSchema>;
    const existing = await prisma.topping.findUnique({ where: { id: req.params.id! } });
    if (!existing) throw new NotFoundError('Topping not found');
    if (input.name && input.name !== existing.name) {
      const clash = await prisma.topping.findUnique({ where: { name: input.name } });
      if (clash) throw new ConflictError('A topping with that name already exists');
    }
    if (input.ingredientId) {
      const ingredient = await prisma.ingredient.findUnique({ where: { id: input.ingredientId } });
      if (!ingredient) throw new ValidationError('Select a valid ingredient');
    }
    const updated = await prisma.topping.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr ?? null } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.ingredientId !== undefined ? { ingredientId: input.ingredientId } : {}),
        ...(input.ingredientQuantity !== undefined ? { ingredientQuantity: input.ingredientQuantity } : {}),
        ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });
    await recordAudit(
      { action: 'menu.topping.updated', entityType: 'Topping', entityId: updated.id, userId: req.user!.id },
      prisma,
    );
    res.status(200).json(toToppingDto(updated));
  }),
);

menuRouter.delete(
  '/toppings/:id',
  authorize('toppings:manage'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.topping.findUnique({ where: { id: req.params.id! } });
    if (!existing) throw new NotFoundError('Topping not found');
    await prisma.topping.delete({ where: { id: existing.id } });
    await recordAudit(
      { action: 'menu.topping.deleted', entityType: 'Topping', entityId: existing.id, before: { name: existing.name }, userId: req.user!.id },
      prisma,
    );
    res.status(200).json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Discounts
// ---------------------------------------------------------------------------

discountsRouter.get(
  '/',
  authorize('discounts:apply'),
  asyncHandler(async (req, res) => {
    const rows = await prisma.discount.findMany({
      where: req.user!.role === 'ADMIN' ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(rows.map(toDiscountDto));
  }),
);

discountsRouter.post(
  '/',
  authorize('discounts:manage'),
  validate({ body: discountCreateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof discountCreateSchema>;
    const created = await prisma.discount.create({
      data: {
        name: input.name,
        nameAr: input.nameAr ?? null,
        type: input.type,
        value: input.value,
        isActive: input.isActive,
      },
    });
    await recordAudit(
      { action: 'discount.created', entityType: 'Discount', entityId: created.id, after: { name: created.name, type: created.type, value: created.value.toString() }, userId: req.user!.id },
      prisma,
    );
    res.status(201).json(toDiscountDto(created));
  }),
);

discountsRouter.patch(
  '/:id',
  authorize('discounts:manage'),
  validate({ params: idParams, body: discountUpdateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof discountUpdateSchema>;
    const existing = await prisma.discount.findUnique({ where: { id: req.params.id! } });
    if (!existing) throw new NotFoundError('Discount not found');
    const updated = await prisma.discount.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr ?? null } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.value !== undefined ? { value: input.value } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await recordAudit(
      { action: 'discount.updated', entityType: 'Discount', entityId: updated.id, userId: req.user!.id },
      prisma,
    );
    res.status(200).json(toDiscountDto(updated));
  }),
);

discountsRouter.delete(
  '/:id',
  authorize('discounts:manage'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.discount.findUnique({ where: { id: req.params.id! } });
    if (!existing) throw new NotFoundError('Discount not found');
    await prisma.discount.delete({ where: { id: existing.id } });
    await recordAudit(
      { action: 'discount.deleted', entityType: 'Discount', entityId: existing.id, before: { name: existing.name }, userId: req.user!.id },
      prisma,
    );
    res.status(200).json({ ok: true });
  }),
);
