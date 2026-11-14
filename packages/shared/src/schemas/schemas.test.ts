import { describe, expect, it } from 'vitest';
import { menuItemCreateSchema, orderCreateSchema, stockAdjustSchema } from '../index.js';

describe('restaurant schemas', () => {
  it('accepts a coffee with sizes', () => {
    const parsed = menuItemCreateSchema.parse({
      name: 'Cappuccino',
      nameAr: 'كابتشينو',
      categoryId: 'cat_1',
      basePrice: '75.00',
      kind: 'HOT_DRINK',
      hasSizes: true,
      sizes: [
        {
          name: 'Regular',
          nameAr: 'وسط',
          price: '75.00',
          ingredientMultiplier: 1,
          isDefault: true,
          sortOrder: 1,
        },
      ],
    });
    expect(parsed.sizes).toHaveLength(1);
  });

  it('rejects a delivery order without an address', () => {
    const result = orderCreateSchema.safeParse({
      type: 'DELIVERY',
      items: [{ menuItemId: 'item_1', quantity: 1 }],
      payments: [{ method: 'CASH', amount: '200.00' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a split payment with references', () => {
    const result = orderCreateSchema.safeParse({
      type: 'DINE_IN',
      items: [{ menuItemId: 'item_1', quantity: 1 }],
      payments: [
        { method: 'CASH', amount: '50.00', reference: 'CASH-12' },
        { method: 'WALLET', amount: '75.50', reference: 'TXN-9931' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects duplicate payment methods', () => {
    const result = orderCreateSchema.safeParse({
      type: 'DINE_IN',
      items: [{ menuItemId: 'item_1', quantity: 1 }],
      payments: [
        { method: 'CARD', amount: '50.00' },
        { method: 'CARD', amount: '25.00' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a zero stock adjustment', () => {
    expect(stockAdjustSchema.safeParse({ quantity: 0, reason: 'test' }).success).toBe(false);
  });
});
