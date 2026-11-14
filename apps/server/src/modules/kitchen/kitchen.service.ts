import {
  canTransitionKitchenOrder,
  type KitchenOrderDto,
  type KitchenQueueDto,
  type KitchenStatusUpdateInput,
} from '@pharmacy/shared';
import { prisma } from '../../prisma.js';
import { recordAudit } from '../../lib/audit.js';
import { businessDayStart, todayInBusinessTimezone } from '../../lib/dates.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import {
  kitchenOrderInclude,
  toApiStatus,
  toDbStatus,
  toKitchenOrderDto,
} from '../../lib/mappers.js';

const ACTIVE_KITCHEN_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] as const;

interface Actor {
  id: string;
}

/**
 * Returns everything still in the kitchen plus the orders completed during the
 * current business day, oldest first so the most urgent ticket is on top.
 */
export async function listKitchenOrders(): Promise<KitchenQueueDto> {
  const dayStart = businessDayStart(todayInBusinessTimezone());
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { status: { in: [...ACTIVE_KITCHEN_STATUSES] } },
        { status: 'COMPLETED', completedAt: { gte: dayStart } },
      ],
    },
    include: kitchenOrderInclude,
    orderBy: [{ createdAt: 'asc' }],
  });

  return {
    generatedAt: new Date().toISOString(),
    orders: orders.map(toKitchenOrderDto),
  };
}

export async function updateKitchenOrderStatus(
  orderId: string,
  nextStatus: KitchenStatusUpdateInput['status'],
  actor: Actor,
): Promise<KitchenOrderDto> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, status: true },
  });
  if (!order) throw new NotFoundError('Order not found');

  const currentStatus = toApiStatus(order.status);
  if (currentStatus === nextStatus) {
    throw new ConflictError('The order is already in that status');
  }
  if (!canTransitionKitchenOrder(currentStatus, nextStatus)) {
    throw new ConflictError(
      `The kitchen cannot move this order from ${currentStatus} to ${nextStatus}`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: {
        status: toDbStatus(nextStatus),
        ...(nextStatus === 'completed' ? { completedAt: new Date() } : {}),
      },
    });
    if (claimed.count === 0) {
      throw new ConflictError('Another user already updated this order. Refresh and try again.');
    }

    if (nextStatus === 'completed') {
      await tx.invoice.upsert({
        where: { orderId: order.id },
        update: {},
        create: {
          orderId: order.id,
          invoiceNumber: `INV-${order.orderNumber.slice(4)}`,
          issuedAt: new Date(),
        },
      });
    }

    await recordAudit(
      {
        action: 'order.status.updated',
        entityType: 'Order',
        entityId: order.id,
        before: { status: currentStatus },
        after: { status: nextStatus, source: 'kitchen' },
        userId: actor.id,
      },
      tx,
    );

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: kitchenOrderInclude,
    });
  });

  return toKitchenOrderDto(updated);
}
