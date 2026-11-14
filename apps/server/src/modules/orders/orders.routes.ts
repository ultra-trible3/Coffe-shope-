import { Router } from 'express';
import { z } from 'zod';
import {
  idSchema,
  orderCancelSchema,
  orderCreateSchema,
  orderQuerySchema,
  orderStatusUpdateSchema,
  type OrderCreateInput,
  type OrderQuery,
  type OrderStatus,
  type OrderStatusUpdateInput,
  type OrderCancelInput,
} from '@pharmacy/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import * as ordersService from './orders.service.js';

export const ordersRouter = Router();
ordersRouter.use(authenticate);

const idParams = z.object({ id: idSchema });

ordersRouter.get(
  '/',
  authorize('orders:read:own'),
  validate({ query: orderQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await ordersService.listOrders(req.query as unknown as OrderQuery, req.user!);
    res.status(200).json(result);
  }),
);

ordersRouter.post(
  '/',
  authorize('orders:create'),
  rateLimit({ name: 'orders:create', windowMs: 60_000, max: 90 }),
  validate({ body: orderCreateSchema }),
  asyncHandler(async (req, res) => {
    const order = await ordersService.createOrder(req.body as OrderCreateInput, req.user!);
    res.status(201).json(order);
  }),
);

ordersRouter.get(
  '/:id',
  authorize('orders:read:own'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const order = await ordersService.getOrder(req.params.id!, req.user!);
    res.status(200).json(order);
  }),
);

ordersRouter.patch(
  '/:id/status',
  authorize('orders:update'),
  validate({ params: idParams, body: orderStatusUpdateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as OrderStatusUpdateInput;
    const order = await ordersService.updateOrderStatus(
      req.params.id!,
      input.status as OrderStatus,
      req.user!,
    );
    res.status(200).json(order);
  }),
);

ordersRouter.post(
  '/:id/cancel',
  authorize('orders:cancel'),
  validate({ params: idParams, body: orderCancelSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as OrderCancelInput;
    const order = await ordersService.cancelOrder(req.params.id!, input.reason, req.user!);
    res.status(200).json(order);
  }),
);
