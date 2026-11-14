import type { OrderDto } from '@pharmacy/shared';

const FALLBACK_PREP_MINUTES = 5;

/** Drinks and pastries are prepared in parallel, so the order takes as long as its slowest item. */
export function estimatePrepMinutes(order: Pick<OrderDto, 'items'>): number {
  const longest = order.items.reduce((max, item) => Math.max(max, item.prepMinutes), 0);
  return longest > 0 ? longest : FALLBACK_PREP_MINUTES;
}

export function estimatedReadyAt(order: Pick<OrderDto, 'items' | 'createdAt'>): Date {
  return new Date(new Date(order.createdAt).getTime() + estimatePrepMinutes(order) * 60_000);
}
