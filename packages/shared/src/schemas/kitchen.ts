import { z } from 'zod';
import { KITCHEN_ORDER_STATUSES } from '../constants.js';

export const kitchenStatusUpdateSchema = z
  .object({
    status: z.enum(KITCHEN_ORDER_STATUSES),
  })
  .strict();
export type KitchenStatusUpdateInput = z.infer<typeof kitchenStatusUpdateSchema>;
