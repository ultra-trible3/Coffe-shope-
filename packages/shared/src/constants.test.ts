import { describe, expect, it } from 'vitest';
import {
  ORDER_PROGRESS_STEPS,
  ORDER_STATUS_LABELS,
  canTransitionKitchenOrder,
  canTransitionOrder,
} from './constants.js';

describe('kitchen order workflow', () => {
  it('labels the kitchen queue as New and Accepted', () => {
    expect(ORDER_STATUS_LABELS.pending).toBe('New');
    expect(ORDER_STATUS_LABELS.confirmed).toBe('Accepted');
  });

  it('exposes the five-step customer progress timeline', () => {
    expect(ORDER_PROGRESS_STEPS.map((step) => step.status)).toEqual([
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'completed',
    ]);
  });

  it('moves kitchen orders forward one step at a time', () => {
    expect(canTransitionKitchenOrder('pending', 'confirmed')).toBe(true);
    expect(canTransitionKitchenOrder('confirmed', 'preparing')).toBe(true);
    expect(canTransitionKitchenOrder('preparing', 'ready')).toBe(true);
    expect(canTransitionKitchenOrder('ready', 'completed')).toBe(true);
  });

  it('blocks skipped, reversed and cancelled kitchen transitions', () => {
    expect(canTransitionKitchenOrder('pending', 'ready')).toBe(false);
    expect(canTransitionKitchenOrder('ready', 'preparing')).toBe(false);
    expect(canTransitionKitchenOrder('preparing', 'cancelled')).toBe(false);
    expect(canTransitionKitchenOrder('completed', 'preparing')).toBe(false);
  });

  it('keeps the administrator transition matrix unchanged', () => {
    expect(canTransitionOrder('pending', 'preparing')).toBe(true);
    expect(canTransitionOrder('confirmed', 'cancelled')).toBe(true);
  });
});
