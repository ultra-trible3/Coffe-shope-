import { describe, expect, it } from 'vitest';
import {
  businessDayStart,
  daysUntil,
  parseDateOnly,
  todayInBusinessTimezone,
  toDateOnly,
} from './dates.js';

describe('date-only helpers', () => {
  it('normalises timestamps and strings to YYYY-MM-DD', () => {
    expect(toDateOnly('2026-11-07T23:36:00.000Z')).toBe('2026-11-07');
    expect(toDateOnly(new Date('2026-03-01T00:00:00.000Z'))).toBe('2026-03-01');
  });

  it('parses a calendar date as UTC midnight', () => {
    const date = parseDateOnly('2026-11-07');
    expect(date.toISOString()).toBe('2026-11-07T00:00:00.000Z');
  });

  it('rejects malformed calendar dates', () => {
    expect(() => parseDateOnly('07/11/2026')).toThrow(RangeError);
    expect(() => parseDateOnly('')).toThrow(RangeError);
  });

  it('computes day differences from a supplied trading day', () => {
    expect(daysUntil('2026-11-07', '2026-11-07')).toBe(0);
    expect(daysUntil('2026-11-10', '2026-11-07')).toBe(3);
    expect(daysUntil('2026-11-01', '2026-11-07')).toBe(-6);
  });

  it('resolves local midnight across a DST offset change', () => {
    expect(businessDayStart('2026-11-07').toISOString()).toBe('2026-11-06T22:00:00.000Z');
    expect(businessDayStart('2026-01-15').toISOString()).toBe('2026-01-14T22:00:00.000Z');
  });

  it('returns a business-timezone calendar date', () => {
    expect(todayInBusinessTimezone(new Date('2026-11-07T22:30:00.000Z'))).toBe('2026-11-08');
    expect(todayInBusinessTimezone(new Date('2026-11-07T10:00:00.000Z'))).toBe('2026-11-07');
  });
});
