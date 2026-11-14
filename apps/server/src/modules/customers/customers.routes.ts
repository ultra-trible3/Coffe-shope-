import { Router } from 'express';
import { z } from 'zod';
import {
  buildPaginated,
  customerCreateSchema,
  customerQuerySchema,
  customerUpdateSchema,
  idSchema,
  sumCurrency,
  type CustomerCreateInput,
  type CustomerQuery,
  type CustomerUpdateInput,
} from '@pharmacy/shared';
import type { Prisma } from '@prisma/client';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { recordAudit } from '../../lib/audit.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { orderInclude, toCustomerDto, toOrderDto } from '../../lib/mappers.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../prisma.js';

export const customersRouter = Router();
customersRouter.use(authenticate);

const idParams = z.object({ id: idSchema });

const customerSummaryInclude = {
  orders: {
    where: { paymentStatus: 'PAID' },
    select: { total: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.CustomerInclude;

type CustomerWithOrders = Prisma.CustomerGetPayload<{ include: typeof customerSummaryInclude }>;

function toSummary(customer: CustomerWithOrders) {
  const totalSpent = sumCurrency(
    customer.orders.map((order) => Number(order.total).toFixed(2)),
  );
  return toCustomerDto({
    ...customer,
    ordersCount: customer.orders.length,
    totalSpent,
    lastOrderAt: customer.orders[0]?.createdAt ?? null,
  });
}

customersRouter.get(
  '/',
  authorize('customers:read'),
  validate({ query: customerQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as CustomerQuery;
    const where: Prisma.CustomerWhereInput = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { phone: { contains: query.q, mode: 'insensitive' } },
            { address: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: customerSummaryInclude,
        orderBy: [{ name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    res
      .status(200)
      .json(buildPaginated(rows.map(toSummary), total, query.page, query.pageSize));
  }),
);

customersRouter.get(
  '/:id',
  authorize('customers:read'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id! },
      include: {
        orders: {
          include: orderInclude,
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!customer) throw new NotFoundError('Customer not found');

    const summary = toSummary({
      ...customer,
      orders: customer.orders
        .filter((order) => order.paymentStatus === 'PAID')
        .map((order) => ({ total: order.total, createdAt: order.createdAt })),
    });

    res.status(200).json({
      customer: summary,
      orders: customer.orders.map(toOrderDto),
    });
  }),
);

customersRouter.post(
  '/',
  authorize('customers:write'),
  validate({ body: customerCreateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as CustomerCreateInput;
    if (input.phone) {
      const clash = await prisma.customer.findUnique({ where: { phone: input.phone } });
      if (clash) throw new ConflictError(`That phone number is already saved for ${clash.name}`);
    }
    const created = await prisma.customer.create({
      data: {
        name: input.name,
        phone: input.phone ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
      },
    });
    await recordAudit(
      { action: 'customer.created', entityType: 'Customer', entityId: created.id, after: { name: created.name, phone: created.phone }, userId: req.user!.id },
      prisma,
    );
    res.status(201).json(toSummary({ ...created, orders: [] }));
  }),
);

customersRouter.patch(
  '/:id',
  authorize('customers:write'),
  validate({ params: idParams, body: customerUpdateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as CustomerUpdateInput;
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id! } });
    if (!existing) throw new NotFoundError('Customer not found');

    if (input.phone && input.phone !== existing.phone) {
      const clash = await prisma.customer.findUnique({ where: { phone: input.phone } });
      if (clash) throw new ConflictError(`That phone number is already saved for ${clash.name}`);
    }

    const updated = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
        ...(input.address !== undefined ? { address: input.address ?? null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      },
      include: customerSummaryInclude,
    });
    await recordAudit(
      {
        action: 'customer.updated',
        entityType: 'Customer',
        entityId: updated.id,
        before: { name: existing.name, phone: existing.phone },
        after: { name: updated.name, phone: updated.phone },
        userId: req.user!.id,
      },
      prisma,
    );
    res.status(200).json(toSummary(updated));
  }),
);

customersRouter.delete(
  '/:id',
  authorize('customers:write'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.customer.findUnique({
      where: { id: req.params.id! },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) throw new NotFoundError('Customer not found');
    if (existing._count.orders > 0) {
      throw new ConflictError(`This customer has ${existing._count.orders} orders and cannot be deleted`);
    }
    await prisma.customer.delete({ where: { id: existing.id } });
    await recordAudit(
      { action: 'customer.deleted', entityType: 'Customer', entityId: existing.id, before: { name: existing.name, phone: existing.phone }, userId: req.user!.id },
      prisma,
    );
    res.status(200).json({ ok: true });
  }),
);
