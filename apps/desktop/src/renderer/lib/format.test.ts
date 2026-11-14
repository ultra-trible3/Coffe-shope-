import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  formatMoney,
  initials,
  orderStatusLabel,
  percentChange,
  paymentMethodLabel,
  paymentSummaryLabel,
  ORDER_STATUS_TONES,
} from './format';

describe('formatMoney', () => {
  it('formats decimal strings as EGP with two decimals', () => {
    expect(formatMoney('153.90')).toBe('EGP 153.90');
    expect(formatMoney('1248.3')).toBe('EGP 1,248.30');
    expect(formatMoney(0)).toBe('EGP 0.00');
  });

  it('falls back to zero for unusable values', () => {
    expect(formatMoney(null)).toBe('EGP 0.00');
    expect(formatMoney(undefined)).toBe('EGP 0.00');
    expect(formatMoney('not-a-number')).toBe('EGP 0.00');
  });
});

describe('order labels', () => {
  it('maps API status values to display labels', () => {
    expect(orderStatusLabel('pending')).toBe('New');
    expect(orderStatusLabel('confirmed')).toBe('Accepted');
    expect(orderStatusLabel('cancelled')).toBe('Cancelled');
  });

  it('maps payment methods to display labels', () => {
    expect(paymentMethodLabel('CASH')).toBe('Cash');
    expect(paymentMethodLabel('WALLET')).toBe('Mobile wallet');
  });

  it('summarises split payments in a stable order', () => {
    expect(
      paymentSummaryLabel([{ method: 'CARD' }, { method: 'CASH' }], 'CASH'),
    ).toBe('Cash + Card');
    expect(paymentSummaryLabel([], 'WALLET')).toBe('Mobile wallet');
  });

  it('gives every status a tone', () => {
    expect(ORDER_STATUS_TONES.completed).toBe('green');
    expect(ORDER_STATUS_TONES.cancelled).toBe('red');
  });
});

describe('small helpers', () => {
  it('builds initials from the first two names', () => {
    expect(initials('Layla Hassan')).toBe('LH');
    expect(initials('  marco  rossi ')).toBe('MR');
    expect(initials(null)).toBe('');
  });

  it('formats percent changes with an explicit sign', () => {
    expect(percentChange(11.3)).toBe('+11.3%');
    expect(percentChange(-4)).toBe('-4.0%');
    expect(percentChange(null)).toBe('—');
  });

  it('adds calendar days to an ISO date', () => {
    expect(addDaysIso('2026-11-07', 1)).toBe('2026-11-08');
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2026-11-01', -1)).toBe('2026-10-31');
  });
});
