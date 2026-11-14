import { z } from 'zod';
import {
  DISCOUNT_TYPES,
  INGREDIENT_UNITS,
  MENU_KINDS,
} from '../constants.js';
import { optionalTrimmedString, paginationSchema } from './common.js';

export const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/u, 'Enter a valid amount with up to 2 decimals');

const positiveMoneyString = moneyString.refine((value) => Number(value) > 0, 'Must be greater than zero');

export const categoryCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Category name is required').max(80),
    nameAr: z.string().trim().min(1, 'Arabic category name is required').max(80),
    description: optionalTrimmedString(300),
    descriptionAr: optionalTrimmedString(300),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    nameAr: optionalTrimmedString(80),
    description: optionalTrimmedString(300),
    descriptionAr: optionalTrimmedString(300),
    sortOrder: z.coerce.number().int().min(0).max(999).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');

export const menuItemSizeInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, 'Size name is required').max(40),
  nameAr: z.string().trim().min(1, 'Arabic size name is required').max(40),
  price: positiveMoneyString,
  ingredientMultiplier: z.coerce.number().min(0.1).max(10).default(1),
  isDefault: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(99).default(0),
});
export type MenuItemSizeInput = z.infer<typeof menuItemSizeInputSchema>;

export const menuItemCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Item name is required').max(120),
    nameAr: z.string().trim().min(1, 'Arabic item name is required').max(120),
    description: optionalTrimmedString(600),
    descriptionAr: optionalTrimmedString(600),
    imageUrl: optionalTrimmedString(500),
    categoryId: z.string().trim().min(1, 'Category is required'),
    kind: z.enum(MENU_KINDS).default('HOT_DRINK'),
    sku: z.string().trim().min(2).max(40).optional(),
    basePrice: positiveMoneyString,
    costPrice: moneyString.default('0.00'),
    prepMinutes: z.coerce.number().int().min(1).max(180).default(15),
    isAvailable: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    hasSizes: z.boolean().default(false),
    sizes: z.array(menuItemSizeInputSchema).max(8).default([]),
  })
  .strict()
  .refine((value) => !value.hasSizes || value.sizes.length > 0, {
    message: 'Add at least one size when the item is sold by size',
    path: ['sizes'],
  });
export type MenuItemCreateInput = z.infer<typeof menuItemCreateSchema>;

export const menuItemUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    nameAr: optionalTrimmedString(120),
    description: optionalTrimmedString(600),
    descriptionAr: optionalTrimmedString(600),
    imageUrl: optionalTrimmedString(500),
    categoryId: z.string().trim().min(1).optional(),
    kind: z.enum(MENU_KINDS).optional(),
    sku: z.string().trim().min(2).max(40).optional(),
    basePrice: positiveMoneyString.optional(),
    costPrice: moneyString.optional(),
    prepMinutes: z.coerce.number().int().min(1).max(180).optional(),
    isAvailable: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    hasSizes: z.boolean().optional(),
    sizes: z.array(menuItemSizeInputSchema).max(8).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');
export type MenuItemUpdateInput = z.infer<typeof menuItemUpdateSchema>;

export const toppingCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Topping name is required').max(80),
    nameAr: z.string().trim().min(1, 'Arabic topping name is required').max(80),
    price: positiveMoneyString,
    ingredientId: z.string().trim().min(1).optional(),
    ingredientQuantity: z.coerce.number().min(0).max(1000).default(0),
    isAvailable: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  })
  .strict();
export type ToppingCreateInput = z.infer<typeof toppingCreateSchema>;

export const toppingUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    nameAr: optionalTrimmedString(80),
    price: positiveMoneyString.optional(),
    ingredientId: z.string().trim().min(1).nullable().optional(),
    ingredientQuantity: z.coerce.number().min(0).max(1000).optional(),
    isAvailable: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');

export const discountCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Discount name is required').max(80),
    nameAr: z.string().trim().min(1, 'Arabic discount name is required').max(80),
    type: z.enum(DISCOUNT_TYPES),
    value: positiveMoneyString,
    isActive: z.boolean().default(true),
  })
  .strict()
  .refine((value) => value.type !== 'PERCENT' || Number(value.value) <= 100, {
    message: 'Percentage discounts cannot exceed 100',
    path: ['value'],
  });
export type DiscountCreateInput = z.infer<typeof discountCreateSchema>;

export const discountUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    nameAr: optionalTrimmedString(80),
    type: z.enum(DISCOUNT_TYPES).optional(),
    value: positiveMoneyString.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');

export const menuQuerySchema = paginationSchema.extend({
  q: optionalTrimmedString(120),
  categoryId: z.string().trim().min(1).optional(),
  kind: z.enum(MENU_KINDS).optional(),
  isAvailable: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
});
export type MenuQuery = z.infer<typeof menuQuerySchema>;

export const recipeUpsertSchema = z
  .object({
    notes: optionalTrimmedString(500),
    items: z
      .array(
        z.object({
          ingredientId: z.string().trim().min(1),
          quantity: z.coerce.number().min(0.001, 'Quantity must be greater than zero').max(100000),
        }),
      )
      .max(60),
  })
  .strict();
export type RecipeUpsertInput = z.infer<typeof recipeUpsertSchema>;

export const ingredientInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingredient name is required').max(120),
    nameAr: z.string().trim().min(1, 'Arabic ingredient name is required').max(120),
    sku: z.string().trim().min(2).max(40).optional(),
    unit: z.enum(INGREDIENT_UNITS),
    currentStock: z.coerce.number().min(0).max(1000000).default(0),
    minStock: z.coerce.number().min(0).max(1000000).default(0),
    costPerUnit: moneyString.default('0.00'),
    supplierId: z.string().trim().min(1).nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .strict();
export type IngredientInput = z.infer<typeof ingredientInputSchema>;

export const ingredientUpdateSchema = ingredientInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');
