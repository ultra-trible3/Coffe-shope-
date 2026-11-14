import { Router } from 'express';
import { z } from 'zod';
import {
  buildPaginated,
  idSchema,
  paginationSchema,
  supplierCreateSchema,
  supplierUpdateSchema,
  type SupplierCreateInput,
} from '@pharmacy/shared';
import type { Prisma } from '@prisma/client';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { recordAudit } from '../../lib/audit.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { toSupplierDto } from '../../lib/mappers.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../prisma.js';

export const suppliersRouter = Router();
suppliersRouter.use(authenticate);

const idParams = z.object({ id: idSchema });
const supplierQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  isActive: z.coerce.boolean().optional(),
});

suppliersRouter.get(
  '/',
  authorize('inventory:read'),
  validate({ query: supplierQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof supplierQuerySchema>;
    const where: Prisma.SupplierWhereInput = {
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { nameAr: { contains: query.q, mode: 'insensitive' } },
              { phone: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.supplier.count({ where }),
    ]);
    res.status(200).json(buildPaginated(rows.map(toSupplierDto), total, query.page, query.pageSize));
  }),
);

suppliersRouter.post(
  '/',
  authorize('inventory:write'),
  validate({ body: supplierCreateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as SupplierCreateInput;
    const created = await prisma.supplier.create({
      data: {
        name: input.name,
        nameAr: input.nameAr ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
        isActive: input.isActive,
      },
    });
    await recordAudit(
      { action: 'supplier.created', entityType: 'Supplier', entityId: created.id, after: { name: created.name }, userId: req.user!.id },
      prisma,
    );
    res.status(201).json(toSupplierDto(created));
  }),
);

suppliersRouter.patch(
  '/:id',
  authorize('inventory:write'),
  validate({ params: idParams, body: supplierUpdateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as Partial<SupplierCreateInput>;
    const existing = await prisma.supplier.findUnique({ where: { id: req.params.id! } });
    if (!existing) throw new NotFoundError('Supplier not found');
    const updated = await prisma.supplier.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr ?? null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
        ...(input.email !== undefined ? { email: input.email ?? null } : {}),
        ...(input.address !== undefined ? { address: input.address ?? null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await recordAudit(
      { action: 'supplier.updated', entityType: 'Supplier', entityId: updated.id, userId: req.user!.id },
      prisma,
    );
    res.status(200).json(toSupplierDto(updated));
  }),
);

suppliersRouter.delete(
  '/:id',
  authorize('inventory:write'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.supplier.findUnique({
      where: { id: req.params.id! },
      include: { _count: { select: { ingredients: true } } },
    });
    if (!existing) throw new NotFoundError('Supplier not found');
    if (existing._count.ingredients > 0) {
      throw new ConflictError('This supplier is linked to ingredients. Deactivate it instead.');
    }
    await prisma.supplier.delete({ where: { id: existing.id } });
    await recordAudit(
      { action: 'supplier.deleted', entityType: 'Supplier', entityId: existing.id, before: { name: existing.name }, userId: req.user!.id },
      prisma,
    );
    res.status(200).json({ ok: true });
  }),
);
