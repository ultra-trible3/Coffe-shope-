import { z } from 'zod';
import { optionalTrimmedString, paginationSchema } from './common.js';

export const customerCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Customer name is required').max(120),
    phone: optionalTrimmedString(30),
    address: optionalTrimmedString(300),
    notes: optionalTrimmedString(500),
  })
  .strict();
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export const customerUpdateSchema = z
  .object({
    name: z.string().trim().min(2, 'Customer name is required').max(120).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    address: z.string().trim().max(300).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No fields to update',
  });
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export const customerQuerySchema = paginationSchema.extend({
  q: optionalTrimmedString(120),
});
export type CustomerQuery = z.infer<typeof customerQuerySchema>;
