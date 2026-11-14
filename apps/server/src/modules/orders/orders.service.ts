import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  canTransitionOrder,
  buildPaginated,
  fromMinorUnits,
  sumCurrency,
  toMinorUnits,
  type OrderCreateInput,
  type OrderQuery,
  type OrderStatus,
  type PaymentMethod,
  type Role,
} from '@pharmacy/shared';
import { prisma } from '../../prisma.js';
import type { PrismaLike } from '../../lib/audit.js';
import { recordAudit } from '../../lib/audit.js';
import { todayInBusinessTimezone, businessDayStart } from '../../lib/dates.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { toDbStatus, toOrderDto, orderInclude, toApiStatus } from '../../lib/mappers.js';
import { getSettings } from '../../lib/settings.js';

interface Actor {
  id: string;
  role: Role;
}

interface PreparedTopping {
  id: string;
  name: string;
  nameAr: string | null;
  price: string;
  ingredientId: string | null;
  ingredientQuantity: number;
  ingredientCost: number | null;
}

interface PreparedLine {
  menuItemId: string;
  menuItemName: string;
  menuItemNameAr: string | null;
  imageUrl: string | null;
  sizeId: string | null;
  sizeName: string | null;
  sizeNameAr: string | null;
  quantity: number;
  unitPrice: string;
  toppingPrice: string;
  lineTotal: string;
  unitCost: string;
  multiplier: number;
  specialInstructions: string | null;
  toppings: PreparedTopping[];
  recipe: Array<{ ingredientId: string; quantity: number; costPerUnit: number }>;
}

async function generateIdentifiers(client: PrismaLike = prisma): Promise<{
  orderNumber: string;
  invoiceNumber: string;
}> {
  const dayKey = todayInBusinessTimezone().replace(/-/gu, '');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    const orderNumber = `ORD-${dayKey}-${suffix}`;
    const invoiceNumber = `INV-${dayKey}-${suffix}`;
    const [existingOrder, existingInvoice] = await Promise.all([
      client.order.findUnique({ where: { orderNumber }, select: { id: true } }),
      client.invoice.findUnique({ where: { invoiceNumber }, select: { id: true } }),
    ]);
    if (!existingOrder && !existingInvoice) return { orderNumber, invoiceNumber };
  }
  throw new ConflictError('Could not allocate an order number, please retry');
}

function moneyMinor(value: string): number {
  return toMinorUnits(value);
}

export async function createOrder(input: OrderCreateInput, actor: Actor): Promise<ReturnType<typeof toOrderDto>> {
  const settings = await getSettings();

  const menuItemIds = [...new Set(input.items.map((item) => item.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    include: {
      sizes: true,
      recipe: { include: { items: { include: { ingredient: true } } } },
    },
  });
  const menuById = new Map(menuItems.map((item) => [item.id, item]));

  const toppingIds = [...new Set(input.items.flatMap((item) => item.toppingIds))];
  const toppingRows =
    toppingIds.length > 0
      ? await prisma.topping.findMany({
          where: { id: { in: toppingIds } },
          include: { ingredient: true },
        })
      : [];
  const toppingById = new Map(toppingRows.map((topping) => [topping.id, topping]));

  let customer: { id: string; name: string; phone: string | null; address: string | null } | null = null;
  if (input.customerId) {
    customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true, name: true, phone: true, address: true },
    });
    if (!customer) throw new ValidationError('Select a valid customer');
  }

  let discount = null as null | {
    id: string;
    name: string;
    nameAr: string | null;
    type: 'PERCENT' | 'FIXED';
    value: Prisma.Decimal;
    isActive: boolean;
  };
  if (input.discountId) {
    discount = await prisma.discount.findUnique({
      where: { id: input.discountId },
      select: { id: true, name: true, nameAr: true, type: true, value: true, isActive: true },
    });
    if (!discount || !discount.isActive) throw new ValidationError('That discount is no longer available');
  }

  const prepared: PreparedLine[] = input.items.map((line) => {
    const menuItem = menuById.get(line.menuItemId);
    if (!menuItem) throw new ValidationError('One or more menu items are no longer available');
    if (!menuItem.isAvailable) throw new ConflictError(`${menuItem.name} is currently marked as sold out`);

    let sizeId: string | null = null;
    let sizeName: string | null = null;
    let sizeNameAr: string | null = null;
    let multiplier = 1;
    let unitPrice: string;

    if (menuItem.hasSizes) {
      if (!line.sizeId) throw new ValidationError(`Choose a size for ${menuItem.name}`);
      const size = menuItem.sizes.find((candidate) => candidate.id === line.sizeId);
      if (!size) throw new ValidationError(`That size is not available for ${menuItem.name}`);
      sizeId = size.id;
      sizeName = size.name;
      sizeNameAr = size.nameAr;
      multiplier = Number(size.ingredientMultiplier);
      unitPrice = Number(size.price).toFixed(2);
    } else {
      if (line.sizeId) throw new ValidationError(`${menuItem.name} is not sold by size`);
      unitPrice = Number(menuItem.basePrice).toFixed(2);
    }

    const selectedToppings: PreparedTopping[] = [];
    const seen = new Set<string>();
    for (const toppingId of line.toppingIds) {
      if (seen.has(toppingId)) continue;
      seen.add(toppingId);
      const topping = toppingById.get(toppingId);
      if (!topping || !topping.isAvailable) {
        throw new ValidationError('One or more selected toppings are unavailable');
      }
      selectedToppings.push({
        id: topping.id,
        name: topping.name,
        nameAr: topping.nameAr,
        price: Number(topping.price).toFixed(2),
        ingredientId: topping.ingredientId,
        ingredientQuantity: Number(topping.ingredientQuantity),
        ingredientCost: topping.ingredient ? Number(topping.ingredient.costPerUnit) : null,
      });
    }

    const toppingPrice = sumCurrency(selectedToppings.map((topping) => topping.price));
    const lineTotal = sumCurrency(
      Array.from({ length: line.quantity }, () => sumCurrency([unitPrice, toppingPrice])),
    );

    const recipe = (menuItem.recipe?.items ?? []).map((recipeLine) => ({
      ingredientId: recipeLine.ingredientId,
      quantity: Number(recipeLine.quantity),
      costPerUnit: Number(recipeLine.ingredient.costPerUnit),
    }));
    const recipeCost = recipe.reduce((sum, recipeLine) => sum + recipeLine.quantity * recipeLine.costPerUnit, 0);
    const toppingCostTotal = selectedToppings.reduce(
      (sum, topping) => sum + topping.ingredientQuantity * (topping.ingredientCost ?? 0),
      0,
    );
    const unitCost = (recipeCost * multiplier + toppingCostTotal).toFixed(2);

    return {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      menuItemNameAr: menuItem.nameAr,
      imageUrl: menuItem.imageUrl,
      sizeId,
      sizeName,
      sizeNameAr,
      quantity: line.quantity,
      unitPrice,
      toppingPrice,
      lineTotal,
      unitCost,
      multiplier,
      specialInstructions: line.specialInstructions ?? null,
      toppings: selectedToppings,
      recipe,
    };
  });

  const subtotalMinor = prepared.reduce((sum, line) => sum + moneyMinor(line.lineTotal), 0);
  let discountMinor = 0;
  if (discount) {
    discountMinor =
      discount.type === 'PERCENT'
        ? Math.round((subtotalMinor * Number(discount.value)) / 100)
        : Math.min(moneyMinor(Number(discount.value).toFixed(2)), subtotalMinor);
    if (actor.role === 'CASHIER') {
      const capMinor = Math.round((subtotalMinor * Number(settings.maxCashierDiscountPct)) / 100);
      if (discountMinor > capMinor) {
        throw new ForbiddenError(
          `This discount exceeds your authorised limit of ${Number(settings.maxCashierDiscountPct).toFixed(2)}%`,
        );
      }
    }
  }
  const taxableMinor = Math.max(subtotalMinor - discountMinor, 0);
  const taxMinor = Math.round((taxableMinor * Number(settings.taxRate)) / 100);
  const deliveryMinor = input.type === 'DELIVERY' ? moneyMinor(Number(settings.deliveryFee).toFixed(2)) : 0;
  const totalMinor = taxableMinor + taxMinor + deliveryMinor;

  const cashPayment = input.payments.find((payment) => payment.method === 'CASH') ?? null;
  const cashTenderedMinor = cashPayment ? toMinorUnits(cashPayment.amount) : 0;
  const nonCashPayments = input.payments.filter((payment) => payment.method !== 'CASH');
  const nonCashMinor = nonCashPayments.reduce(
    (sum, payment) => sum + toMinorUnits(payment.amount),
    0,
  );
  if (nonCashMinor > totalMinor) {
    throw new ValidationError('Card and wallet amounts exceed the order total');
  }
  const appliedCashMinor = totalMinor - nonCashMinor;
  if (cashPayment) {
    if (cashTenderedMinor < appliedCashMinor) {
      throw new ValidationError('Cash received is less than the remaining order total');
    }
    if (appliedCashMinor === 0) {
      throw new ValidationError('Card and wallet amounts already cover the order total');
    }
  } else if (nonCashMinor !== totalMinor) {
    throw new ValidationError('Payments must add up to the order total');
  }
  const amountPaidMinor = cashTenderedMinor + nonCashMinor;
  const changeMinor = amountPaidMinor - totalMinor;
  const primaryMethod = input.payments[0]?.method ?? 'CASH';
  const paymentRows: Array<{
    method: PaymentMethod;
    amount: string;
    reference: string | null;
  }> = [
    ...nonCashPayments.map((payment) => ({
      method: payment.method,
      amount: fromMinorUnits(toMinorUnits(payment.amount)),
      reference: payment.reference ?? null,
    })),
    ...(cashPayment
      ? [
          {
            method: 'CASH' as const,
            amount: fromMinorUnits(appliedCashMinor),
            reference: cashPayment.reference ?? null,
          },
        ]
      : []),
  ];

  const { orderNumber, invoiceNumber } = await generateIdentifiers();

  const createData: Prisma.OrderCreateInput = {
    orderNumber,
    type: input.type,
    status: 'PENDING',
    ...(customer ? { customer: { connect: { id: customer.id } } } : {}),
    customerName: customer?.name ?? input.customerName ?? null,
    customerPhone: customer?.phone ?? input.customerPhone ?? null,
    customerAddress: customer?.address ?? input.customerAddress ?? null,
    tableNumber: input.tableNumber ?? null,
    cashier: { connect: { id: actor.id } },
    subtotal: fromMinorUnits(subtotalMinor),
    discount: fromMinorUnits(discountMinor),
    discountLabel: discount?.name ?? null,
    discountLabelAr: discount?.nameAr ?? null,
    ...(discount ? { discountRel: { connect: { id: discount.id } } } : {}),
    tax: fromMinorUnits(taxMinor),
    deliveryFee: fromMinorUnits(deliveryMinor),
    total: fromMinorUnits(totalMinor),
    amountPaid: fromMinorUnits(amountPaidMinor),
    changeDue: fromMinorUnits(changeMinor),
    paymentMethod: primaryMethod,
    paymentStatus: 'PAID',
    notes: input.notes ?? null,
    inventoryDeducted: true,
    items: {
      create: prepared.map((line) => ({
        menuItemId: line.menuItemId,
        menuItemName: line.menuItemName,
        menuItemNameAr: line.menuItemNameAr,
        imageUrl: line.imageUrl,
        sizeId: line.sizeId,
        sizeName: line.sizeName,
        sizeNameAr: line.sizeNameAr,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        toppingsTotal: line.toppingPrice,
        lineTotal: line.lineTotal,
        unitCost: line.unitCost,
        specialInstructions: line.specialInstructions,
        toppings: {
          create: line.toppings.map((topping) => ({
            toppingId: topping.id,
            name: topping.name,
            nameAr: topping.nameAr,
            price: topping.price,
          })),
        },
      })),
    },
  };

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: createData,
      include: { items: true },
    });

    await tx.payment.createMany({
      data: paymentRows.map((row) => ({ orderId: created.id, ...row })),
    });

    await tx.invoice.create({
      data: { orderId: created.id, invoiceNumber, issuedAt: created.createdAt },
    });

    const requisitions = new Map<string, { quantity: number; unitCost: number; note: string }>();
    const addRequisition = (ingredientId: string, quantity: number, unitCost: number, note: string) => {
      const existing = requisitions.get(ingredientId);
      if (existing) existing.quantity += quantity;
      else requisitions.set(ingredientId, { quantity, unitCost, note });
    };

    for (const line of prepared) {
      for (const recipeLine of line.recipe) {
        addRequisition(
          recipeLine.ingredientId,
          recipeLine.quantity * line.multiplier * line.quantity,
          recipeLine.costPerUnit,
          line.menuItemName,
        );
      }
      for (const topping of line.toppings) {
        if (!topping.ingredientId) continue;
        addRequisition(
          topping.ingredientId,
          topping.ingredientQuantity * line.quantity,
          topping.ingredientCost ?? 0,
          `${line.menuItemName} + ${topping.name}`,
        );
      }
    }

    if (requisitions.size > 0) {
      await tx.inventoryMovement.createMany({
        data: [...requisitions.entries()].map(([ingredientId, entry]) => ({
          ingredientId,
          orderId: created.id,
          type: 'SALE_DEDUCTION',
          quantity: (-entry.quantity).toFixed(3),
          unitCost: entry.unitCost.toFixed(2),
          note: entry.note,
          userId: actor.id,
        })),
      });
      for (const [ingredientId, entry] of requisitions.entries()) {
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: { currentStock: { decrement: entry.quantity.toFixed(3) } },
        });
      }
    }

    await recordAudit(
      {
        action: 'order.created',
        entityType: 'Order',
        entityId: created.id,
        after: {
          orderNumber: created.orderNumber,
          total: created.total.toString(),
          type: created.type,
          paymentMethod: created.paymentMethod,
        },
        userId: actor.id,
      },
      tx,
    );

    return tx.order.findUniqueOrThrow({ where: { id: created.id }, include: orderInclude });
  });

  return toOrderDto(order);
}

function assertCanAccess(order: { cashierId: string }, actor: Actor): void {
  if (actor.role === 'CASHIER' && order.cashierId !== actor.id) {
    throw new ForbiddenError('You can only access your own orders');
  }
}

export async function listOrders(
  query: OrderQuery,
  actor: Actor,
): Promise<ReturnType<typeof buildPaginated>> {
  const where: Prisma.OrderWhereInput = {
    ...(actor.role === 'CASHIER' ? { cashierId: actor.id } : {}),
    ...(query.status ? { status: toDbStatus(query.status) } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.cashierId && actor.role === 'ADMIN' ? { cashierId: query.cashierId } : {}),
    ...(query.q
      ? {
          OR: [
            { orderNumber: { contains: query.q, mode: 'insensitive' } },
            { customerName: { contains: query.q, mode: 'insensitive' } },
            { customerPhone: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  if (query.today) {
    const today = todayInBusinessTimezone();
    where.createdAt = { gte: businessDayStart(today) };
  } else if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: businessDayStart(query.from) } : {}),
      ...(query.to ? { lt: new Date(businessDayStart(query.to).getTime() + 86_400_000) } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: [{ createdAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return buildPaginated(rows.map(toOrderDto), total, query.page, query.pageSize);
}

export async function getOrder(orderId: string, actor: Actor): Promise<ReturnType<typeof toOrderDto>> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) throw new NotFoundError('Order not found');
  assertCanAccess(order, actor);
  return toOrderDto(order);
}

export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  actor: Actor,
): Promise<ReturnType<typeof toOrderDto>> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError('Order not found');
  assertCanAccess(order, actor);

  const currentStatus = toApiStatus(order.status);
  if (currentStatus === nextStatus) {
    throw new ConflictError('The order is already in that status');
  }
  if (!canTransitionOrder(currentStatus, nextStatus)) {
    throw new ConflictError(`Cannot move an order from ${currentStatus} to ${nextStatus}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: {
        status: toDbStatus(nextStatus),
        ...(nextStatus === 'completed' ? { completedAt: new Date() } : {}),
      },
    });
    if (result.count === 0) {
      throw new ConflictError('The order changed while you were updating it. Refresh and try again.');
    }
    if (nextStatus === 'completed') {
      const invoiceNumber = `INV-${order.orderNumber.slice(4)}`;
      await tx.invoice.upsert({
        where: { orderId: order.id },
        update: {},
        create: { orderId: order.id, invoiceNumber, issuedAt: new Date() },
      });
    }
    await recordAudit(
      {
        action: 'order.status.updated',
        entityType: 'Order',
        entityId: order.id,
        before: { status: currentStatus },
        after: { status: nextStatus },
        userId: actor.id,
      },
      tx,
    );
    return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
  });

  return toOrderDto(updated);
}

export async function cancelOrder(
  orderId: string,
  reason: string,
  actor: Actor,
): Promise<ReturnType<typeof toOrderDto>> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { inventoryMovements: { where: { type: 'SALE_DEDUCTION' } } },
  });
  if (!order) throw new NotFoundError('Order not found');
  assertCanAccess(order, actor);

  const currentStatus = toApiStatus(order.status);
  if (currentStatus === 'cancelled') throw new ConflictError('This order is already cancelled');
  if (currentStatus === 'completed') {
    throw new ConflictError('Completed orders cannot be cancelled');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: {
        id: order.id,
        status: order.status,
        inventoryRestored: false,
      },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED',
        notes: [order.notes, `Cancelled: ${reason}`].filter(Boolean).join('\n'),
      },
    });
    if (claimed.count === 0) {
      throw new ConflictError('This order was already processed. Refresh and try again.');
    }

    if (order.inventoryDeducted && order.inventoryMovements.length > 0) {
      const restore = new Map<string, { quantity: number; unitCost: number | null }>();
      for (const movement of order.inventoryMovements) {
        const existing = restore.get(movement.ingredientId);
        const quantity = Math.abs(Number(movement.quantity));
        if (existing) existing.quantity += quantity;
        else restore.set(movement.ingredientId, {
          quantity,
          unitCost: movement.unitCost === null ? null : Number(movement.unitCost),
        });
      }
      await tx.inventoryMovement.createMany({
        data: [...restore.entries()].map(([ingredientId, entry]) => ({
          ingredientId,
          orderId: order.id,
          type: 'CANCELLATION_RETURN',
          quantity: entry.quantity.toFixed(3),
          unitCost: entry.unitCost === null ? null : entry.unitCost.toFixed(2),
          note: `Cancelled order ${order.orderNumber}`,
          userId: actor.id,
        })),
      });
      for (const [ingredientId, entry] of restore.entries()) {
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: { currentStock: { increment: entry.quantity.toFixed(3) } },
        });
      }
      await tx.order.update({ where: { id: order.id }, data: { inventoryRestored: true } });
    }

    await recordAudit(
      {
        action: 'order.cancelled',
        entityType: 'Order',
        entityId: order.id,
        before: { status: currentStatus },
        after: { status: 'cancelled', reason },
        userId: actor.id,
      },
      tx,
    );

    return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
  });

  return toOrderDto(updated);
}

/** Helper for invoice listings: filters invoices by number / order number / customer. */
export function invoiceWhere(query: {
  q?: string;
  from?: string;
  to?: string;
}): Prisma.InvoiceWhereInput {
  return {
    ...(query.q
      ? {
          OR: [
            { invoiceNumber: { contains: query.q, mode: 'insensitive' } },
            { order: { orderNumber: { contains: query.q, mode: 'insensitive' } } },
            { order: { customerName: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(query.from || query.to
      ? {
          issuedAt: {
            ...(query.from ? { gte: businessDayStart(query.from) } : {}),
            ...(query.to ? { lt: new Date(businessDayStart(query.to).getTime() + 86_400_000) } : {}),
          },
        }
      : {}),
  };
}

export type { PaymentMethod };
