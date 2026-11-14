import { z } from 'zod';
import { ORDER_STATUSES, ORDER_TYPES, PAYMENT_METHODS } from '../constants.js';
import { optionalTrimmedString, paginationSchema } from './common.js';
import { moneyString } from './menu.js';

export const orderItemInputSchema = z
  .object({
    menuItemId: z.string().trim().min(1),
    sizeId: z.string().trim().min(1).nullable().optional(),
    quantity: z.coerce.number().int().min(1).max(99).default(1),
    toppingIds: z.array(z.string().trim().min(1)).max(20).default([]),
    specialInstructions: optionalTrimmedString(300),
  })
  .strict();
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

/** One tendered amount. Cash may exceed its share (change is returned). */
export const orderPaymentInputSchema = z
  .object({
    method: z.enum(PAYMENT_METHODS),
    amount: moneyString.refine((value) => Number(value) > 0, 'Payment must be greater than zero'),
    reference: optionalTrimmedString(60),
  })
  .strict();
export type OrderPaymentInput = z.infer<typeof orderPaymentInputSchema>;

const uniquePaymentMethods = (payments: readonly { method: string }[]): boolean =>
  new Set(payments.map((payment) => payment.method)).size === payments.length;

export const orderCreateSchema = z
  .object({
    type: z.enum(ORDER_TYPES),
    customerId: z.string().trim().min(1).nullable().optional(),
    customerName: optionalTrimmedString(120),
    customerPhone: optionalTrimmedString(30),
    customerAddress: optionalTrimmedString(300),
    tableNumber: optionalTrimmedString(20),
    items: z.array(orderItemInputSchema).min(1, 'Add at least one item').max(80),
    discountId: z.string().trim().min(1).nullable().optional(),
    notes: optionalTrimmedString(600),
    payments: z
      .array(orderPaymentInputSchema)
      .min(1, 'Add at least one payment')
      .max(PAYMENT_METHODS.length)
      .refine(uniquePaymentMethods, 'Each payment method can only be used once'),
  })
  .strict()
  .refine(
    (value) => value.type !== 'DELIVERY' || Boolean(value.customerAddress),
    'A delivery address is required for delivery orders',
  );
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

export const orderQuerySchema = paginationSchema.extend({
  q: optionalTrimmedString(120),
  status: z.enum(ORDER_STATUSES).optional(),
  type: z.enum(ORDER_TYPES).optional(),
  from: optionalTrimmedString(10),
  to: optionalTrimmedString(10),
  cashierId: z.string().trim().min(1).optional(),
  today: z.coerce.boolean().optional(),
});
export type OrderQuery = z.infer<typeof orderQuerySchema>;

export const orderStatusUpdateSchema = z
  .object({
    status: z.enum(ORDER_STATUSES),
  })
  .strict();
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;

export const orderCancelSchema = z
  .object({
    reason: z.string().trim().min(3, 'Please provide a cancellation reason').max(400),
  })
  .strict();
export type OrderCancelInput = z.infer<typeof orderCancelSchema>;

export const invoiceQuerySchema = paginationSchema.extend({
  q: optionalTrimmedString(120),
  from: optionalTrimmedString(10),
  to: optionalTrimmedString(10),
});
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
