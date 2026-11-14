import { z } from 'zod';
import { moneyString } from './menu.js';

export const settingsUpdateSchema = z
  .object({
    name: z.string().trim().min(2, 'Restaurant name is required').max(120).optional(),
    nameAr: z.string().trim().max(120).nullable().optional(),
    tagline: z.string().trim().max(160).nullable().optional(),
    taglineAr: z.string().trim().max(160).nullable().optional(),
    address: z.string().trim().max(300).nullable().optional(),
    addressAr: z.string().trim().max(300).nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    email: z.string().trim().max(160).nullable().optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    deliveryFee: moneyString.optional(),
    maxCashierDiscountPct: z.coerce.number().min(0).max(100).optional(),
    receiptFooter: z.string().trim().max(300).nullable().optional(),
    receiptFooterAr: z.string().trim().max(300).nullable().optional(),
    currency: z.string().trim().min(2).max(8).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
