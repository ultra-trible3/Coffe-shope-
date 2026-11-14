import {
  PAYMENT_METHODS,
  type IngredientUnit,
  type InventoryMovementType,
  type MenuKind,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type Role,
} from '@pharmacy/shared';
import { translate, type TranslationKey } from '../i18n/dictionaries';
import { getActiveLanguage } from './language';

const TIME_ZONE = 'Africa/Cairo';

const DATE_LOCALES = { en: 'en-GB', ar: 'ar-EG' } as const;
const NUMBER_LOCALES = { en: 'en-EG', ar: 'ar-EG' } as const;
const CURRENCY_LABELS = { en: 'EGP', ar: 'ج.م' } as const;

function numberLocale(): string {
  return NUMBER_LOCALES[getActiveLanguage()];
}

function dateLocale(): string {
  return DATE_LOCALES[getActiveLanguage()];
}

export function formatMoney(value: string | number | null | undefined): string {
  const amount = typeof value === 'string' ? Number(value) : (value ?? 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = safe.toLocaleString(numberLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const currency = CURRENCY_LABELS[getActiveLanguage()];
  return getActiveLanguage() === 'ar' ? `${formatted} ${currency}` : `${currency} ${formatted}`;
}

export function formatMoneyShort(value: string | number | null | undefined): string {
  const amount = typeof value === 'string' ? Number(value) : (value ?? 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString(numberLocale(), { maximumFractionDigits: 0 });
}

export function formatNumber(value: number): string {
  return value.toLocaleString(numberLocale());
}

export function formatDecimal(value: number, digits = 2): string {
  return value.toLocaleString(numberLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(dateLocale(), {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(dateLocale(), {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function formatDayLabel(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat(dateLocale(), {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
  }).format(date);
}

/** Short month label for a `YYYY-MM` key, in the active language. */
export function formatMonthKey(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(dateLocale(), {
    timeZone: TIME_ZONE,
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, 15)));
}

/** Compact chart axis values, e.g. `12.5k` / `١٢٫٥ ألف`. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat(numberLocale(), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** `YYYY-MM-DD` for "today" in the restaurant business timezone. */
export function todayIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts;
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function orderStatusLabel(status: OrderStatus): string {
  return translate(getActiveLanguage(), `labels.orderStatus.${status}`);
}

export function orderTypeLabel(type: OrderType): string {
  return translate(getActiveLanguage(), `labels.orderType.${type}`);
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return translate(getActiveLanguage(), `labels.paymentMethod.${method}`);
}

/** `Cash + Card` for split payments; a single label otherwise. */
export function paymentSummaryLabel(
  payments: ReadonlyArray<{ method: PaymentMethod }>,
  fallback: PaymentMethod,
): string {
  const present = new Set(payments.map((payment) => payment.method));
  const methods = PAYMENT_METHODS.filter((method) => present.has(method));
  return (methods.length > 0 ? methods : [fallback])
    .map((method) => paymentMethodLabel(method))
    .join(' + ');
}

export function menuKindLabel(kind: MenuKind): string {
  return translate(getActiveLanguage(), `labels.menuKind.${kind}`);
}

export function unitLabel(unit: IngredientUnit): string {
  return translate(getActiveLanguage(), `labels.unit.${unit}`);
}

export function movementLabel(type: InventoryMovementType): string {
  return translate(getActiveLanguage(), `labels.movement.${type}`);
}

export function roleLabel(role: Role): string {
  return translate(getActiveLanguage(), `labels.role.${role}`);
}

export function roleDescription(role: Role): string {
  return translate(getActiveLanguage(), `labels.roleDescription.${role}`);
}

const AUDIT_ACTION_KEYS: Record<string, TranslationKey> = {
  'auth.login.failed': 'audit.actions.authLoginFailed',
  'auth.login.success': 'audit.actions.authLoginSuccess',
  'auth.logout': 'audit.actions.authLogout',
  'auth.password.changed': 'audit.actions.authPasswordChanged',
  'auth.refresh': 'audit.actions.authRefresh',
  'category.created': 'audit.actions.categoryCreated',
  'category.deleted': 'audit.actions.categoryDeleted',
  'category.updated': 'audit.actions.categoryUpdated',
  'customer.created': 'audit.actions.customerCreated',
  'customer.deleted': 'audit.actions.customerDeleted',
  'customer.updated': 'audit.actions.customerUpdated',
  'discount.created': 'audit.actions.discountCreated',
  'discount.deleted': 'audit.actions.discountDeleted',
  'discount.updated': 'audit.actions.discountUpdated',
  'inventory.adjusted': 'audit.actions.inventoryAdjusted',
  'inventory.ingredient.created': 'audit.actions.ingredientCreated',
  'inventory.ingredient.deleted': 'audit.actions.ingredientDeleted',
  'inventory.ingredient.updated': 'audit.actions.ingredientUpdated',
  'inventory.purchased': 'audit.actions.inventoryPurchased',
  'menu.item.created': 'audit.actions.menuItemCreated',
  'menu.item.deleted': 'audit.actions.menuItemDeleted',
  'menu.item.updated': 'audit.actions.menuItemUpdated',
  'menu.recipe.updated': 'audit.actions.recipeUpdated',
  'menu.topping.created': 'audit.actions.toppingCreated',
  'menu.topping.deleted': 'audit.actions.toppingDeleted',
  'menu.topping.updated': 'audit.actions.toppingUpdated',
  'order.cancelled': 'audit.actions.orderCancelled',
  'order.created': 'audit.actions.orderCreated',
  'order.status.updated': 'audit.actions.orderStatusUpdated',
  'settings.updated': 'audit.actions.settingsUpdated',
  'supplier.created': 'audit.actions.supplierCreated',
  'supplier.deleted': 'audit.actions.supplierDeleted',
  'supplier.updated': 'audit.actions.supplierUpdated',
  'user.created': 'audit.actions.userCreated',
  'user.deactivated': 'audit.actions.userDeactivated',
  'user.password.reset': 'audit.actions.userPasswordReset',
  'user.updated': 'audit.actions.userUpdated',
};

/** Falls back to a readable form for action codes the dictionary does not know yet. */
export function auditActionLabel(action: string): string {
  const key = AUDIT_ACTION_KEYS[action];
  if (key) return translate(getActiveLanguage(), key);
  return action
    .replace(/\./gu, ' ')
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

export type StatusTone = 'amber' | 'blue' | 'orange' | 'green' | 'red' | 'neutral';

export const ORDER_STATUS_TONES: Record<OrderStatus, StatusTone> = {
  pending: 'amber',
  confirmed: 'blue',
  preparing: 'orange',
  ready: 'green',
  completed: 'green',
  cancelled: 'red',
};

export function initials(name: string | null | undefined): string {
  return (name ?? '')
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function percentChange(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const magnitude = Math.abs(value).toLocaleString(numberLocale(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${sign}${magnitude}%`;
}
