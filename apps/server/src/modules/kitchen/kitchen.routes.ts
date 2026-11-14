import { Router } from 'express';
import { z } from 'zod';
import {
  idSchema,
  kitchenStatusUpdateSchema,
  type KitchenStatusUpdateInput,
} from '@pharmacy/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import * as kitchenService from './kitchen.service.js';

export const kitchenRouter = Router();

kitchenRouter.use(authenticate, requireRole('ADMIN', 'KITCHEN_STAFF'));

const idParams = z.object({ id: idSchema });

kitchenRouter.get(
  '/orders',
  authorize('kitchen:view'),
  asyncHandler(async (_req, res) => {
    res.status(200).json(await kitchenService.listKitchenOrders());
  }),
);

kitchenRouter.patch(
  '/orders/:id/status',
  authorize('kitchen:update'),
  validate({ params: idParams, body: kitchenStatusUpdateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as KitchenStatusUpdateInput;
    const order = await kitchenService.updateKitchenOrderStatus(
      req.params.id!,
      input.status,
      req.user!,
    );
    res.status(200).json(order);
  }),
);
