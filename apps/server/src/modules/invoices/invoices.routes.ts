import { Router } from 'express';
import { z } from 'zod';
import { buildPaginated, idSchema, invoiceQuerySchema } from '@pharmacy/shared';
import type { Prisma } from '@prisma/client';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { NotFoundError } from '../../lib/errors.js';
import { orderInclude, toOrderDto } from '../../lib/mappers.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../prisma.js';
import { invoiceWhere } from '../orders/orders.service.js';

export const invoicesRouter = Router();
invoicesRouter.use(authenticate);

const idParams = z.object({ id: idSchema });
const orderIdParams = z.object({ orderId: idSchema });

const invoiceInclude = { order: { include: orderInclude } } satisfies Prisma.InvoiceInclude;

type InvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

function toInvoiceWithOrder(invoice: InvoiceRow) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    orderId: invoice.orderId,
    issuedAt: invoice.issuedAt.toISOString(),
    order: toOrderDto(invoice.order),
  };
}

/** Cashiers may read invoices, but only for their own orders. */
function scopeFor(user: { role: string; id: string }): Prisma.InvoiceWhereInput {
  return user.role === 'CASHIER' ? { order: { cashierId: user.id } } : {};
}

invoicesRouter.get(
  '/',
  authorize('invoices:read'),
  validate({ query: invoiceQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof invoiceQuerySchema>;
    const where: Prisma.InvoiceWhereInput = {
      AND: [scopeFor(req.user!), invoiceWhere(query)],
    };

    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: invoiceInclude,
        orderBy: { issuedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);

    res
      .status(200)
      .json(buildPaginated(rows.map(toInvoiceWithOrder), total, query.page, query.pageSize));
  }),
);

invoicesRouter.get(
  '/by-order/:orderId',
  authorize('invoices:read'),
  validate({ params: orderIdParams }),
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { orderId: req.params.orderId! },
      include: invoiceInclude,
    });
    if (!invoice) throw new NotFoundError('Invoice not found for this order');
    if (req.user!.role === 'CASHIER' && invoice.order.cashierId !== req.user!.id) {
      throw new NotFoundError('Invoice not found for this order');
    }
    res.status(200).json(toInvoiceWithOrder(invoice));
  }),
);

invoicesRouter.get(
  '/:id',
  authorize('invoices:read'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id! },
      include: invoiceInclude,
    });
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (req.user!.role === 'CASHIER' && invoice.order.cashierId !== req.user!.id) {
      throw new NotFoundError('Invoice not found');
    }
    res.status(200).json(toInvoiceWithOrder(invoice));
  }),
);
