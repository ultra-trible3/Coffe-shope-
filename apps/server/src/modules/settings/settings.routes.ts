import { Router } from 'express';
import { settingsUpdateSchema, type SettingsUpdateInput } from '@pharmacy/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { recordAudit } from '../../lib/audit.js';
import { toSettingsDto } from '../../lib/mappers.js';
import { getSettings } from '../../lib/settings.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../prisma.js';

export const settingsRouter = Router();
settingsRouter.use(authenticate);

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const settings = await getSettings();
    res.status(200).json(toSettingsDto(settings));
  }),
);

settingsRouter.patch(
  '/',
  authorize('settings:manage'),
  validate({ body: settingsUpdateSchema }),
  asyncHandler(async (req, res) => {
    const input = req.body as SettingsUpdateInput;
    const existing = await getSettings();

    const updated = await prisma.restaurantSettings.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr ?? null } : {}),
        ...(input.tagline !== undefined ? { tagline: input.tagline ?? null } : {}),
        ...(input.taglineAr !== undefined ? { taglineAr: input.taglineAr ?? null } : {}),
        ...(input.address !== undefined ? { address: input.address ?? null } : {}),
        ...(input.addressAr !== undefined ? { addressAr: input.addressAr ?? null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
        ...(input.email !== undefined ? { email: input.email ?? null } : {}),
        ...(input.taxRate !== undefined ? { taxRate: input.taxRate.toFixed(2) } : {}),
        ...(input.deliveryFee !== undefined ? { deliveryFee: input.deliveryFee } : {}),
        ...(input.maxCashierDiscountPct !== undefined
          ? { maxCashierDiscountPct: input.maxCashierDiscountPct.toFixed(2) }
          : {}),
        ...(input.receiptFooter !== undefined ? { receiptFooter: input.receiptFooter ?? null } : {}),
        ...(input.receiptFooterAr !== undefined
          ? { receiptFooterAr: input.receiptFooterAr ?? null }
          : {}),
        ...(input.currency !== undefined ? { currency: input.currency.toUpperCase() } : {}),
      },
    });

    await recordAudit(
      {
        action: 'settings.updated',
        entityType: 'RestaurantSettings',
        entityId: updated.id,
        before: {
          taxRate: existing.taxRate.toString(),
          deliveryFee: existing.deliveryFee.toString(),
          maxCashierDiscountPct: existing.maxCashierDiscountPct.toString(),
        },
        after: {
          taxRate: updated.taxRate.toString(),
          deliveryFee: updated.deliveryFee.toString(),
          maxCashierDiscountPct: updated.maxCashierDiscountPct.toString(),
        },
        userId: req.user!.id,
      },
      prisma,
    );

    res.status(200).json(toSettingsDto(updated));
  }),
);
