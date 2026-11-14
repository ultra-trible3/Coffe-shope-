import { z } from 'zod';
import { INVENTORY_MOVEMENT_TYPES } from '../constants.js';
import { optionalTrimmedString, paginationSchema } from './common.js';
import { moneyString } from './menu.js';

export const ingredientQuerySchema = paginationSchema.extend({
  q: optionalTrimmedString(120),
  lowStock: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});
export type IngredientQuery = z.infer<typeof ingredientQuerySchema>;

export const stockAdjustSchema = z
  .object({
    quantity: z.coerce
      .number()
      .min(-1000000)
      .max(1000000)
      .refine((value) => value !== 0, 'Adjustment cannot be zero'),
    reason: z.string().trim().min(3, 'Please provide a reason').max(300),
  })
  .strict();
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;

export const stockPurchaseSchema = z
  .object({
    quantity: z.coerce.number().positive('Quantity must be greater than zero').max(1000000),
    unitCost: moneyString.optional(),
    supplierId: z.string().trim().min(1).nullable().optional(),
    reference: optionalTrimmedString(120),
    note: optionalTrimmedString(300),
  })
  .strict();
export type StockPurchaseInput = z.infer<typeof stockPurchaseSchema>;

export const movementQuerySchema = paginationSchema.extend({
  ingredientId: z.string().trim().min(1).optional(),
  type: z.enum(INVENTORY_MOVEMENT_TYPES).optional(),
  from: optionalTrimmedString(10),
  to: optionalTrimmedString(10),
});
export type MovementQuery = z.infer<typeof movementQuerySchema>;

export const supplierCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Supplier name is required').max(120),
    nameAr: z.string().trim().min(1, 'Arabic supplier name is required').max(120),
    phone: optionalTrimmedString(30),
    email: optionalTrimmedString(160),
    address: optionalTrimmedString(300),
    notes: optionalTrimmedString(500),
    isActive: z.boolean().default(true),
  })
  .strict();
export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;

export const supplierUpdateSchema = supplierCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');
