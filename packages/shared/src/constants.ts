/** Domain enumerations and labels shared by the API and the desktop client. */

export const BRAND = {
  name: 'Qahwa',
  fullName: 'Qahwa Coffee House',
  tagline: 'Your daily dose of happiness.',
} as const;

export const ORDER_TYPES = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  DINE_IN: 'Dine-in',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery',
};

/** API-facing order statuses are lowercase (e.g. `preparing`). */
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'New',
  confirmed: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Customer-facing prep timeline shown on the staff order detail sheet. */
export const ORDER_PROGRESS_STEPS = [
  { status: 'pending', label: 'Order received' },
  { status: 'confirmed', label: 'Order accepted' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'ready', label: 'Ready' },
  { status: 'completed', label: 'Completed' },
] as const satisfies readonly { status: OrderStatus; label: string }[];

/** Legal status transitions. Terminal states allow no further changes. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'preparing', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuses the kitchen can move an order into (never cancel or rewind). */
export const KITCHEN_ORDER_STATUSES = ['confirmed', 'preparing', 'ready', 'completed'] as const;
export type KitchenStatus = (typeof KITCHEN_ORDER_STATUSES)[number];

/**
 * The kitchen follows a strict linear workflow; it cannot skip preparation
 * steps or cancel an order. Administrator and cashier flows keep the more
 * permissive matrix above.
 */
export const KITCHEN_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed'],
  confirmed: ['preparing'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransitionKitchenOrder(from: OrderStatus, to: OrderStatus): boolean {
  return KITCHEN_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export const PAYMENT_METHODS = ['CASH', 'CARD', 'WALLET'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  WALLET: 'Mobile wallet',
};

export const MENU_KINDS = ['HOT_DRINK', 'COLD_DRINK', 'BAKERY', 'DESSERT'] as const;
export type MenuKind = (typeof MENU_KINDS)[number];

export const MENU_KIND_LABELS: Record<MenuKind, string> = {
  HOT_DRINK: 'Hot drink',
  COLD_DRINK: 'Cold drink',
  BAKERY: 'Bakery',
  DESSERT: 'Dessert',
};

export const INGREDIENT_UNITS = ['KG', 'G', 'L', 'ML', 'PIECE', 'PACK'] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export const INGREDIENT_UNIT_LABELS: Record<IngredientUnit, string> = {
  KG: 'kg',
  G: 'g',
  L: 'L',
  ML: 'ml',
  PIECE: 'pcs',
  PACK: 'pack',
};

export const INVENTORY_MOVEMENT_TYPES = [
  'PURCHASE',
  'SALE_DEDUCTION',
  'ADJUSTMENT',
  'WASTE',
  'RETURN',
  'CANCELLATION_RETURN',
] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const INVENTORY_MOVEMENT_LABELS: Record<InventoryMovementType, string> = {
  PURCHASE: 'Purchase / restock',
  SALE_DEDUCTION: 'Order deduction',
  ADJUSTMENT: 'Stock adjustment',
  WASTE: 'Waste',
  RETURN: 'Supplier return',
  CANCELLATION_RETURN: 'Order cancellation',
};

export const DISCOUNT_TYPES = ['PERCENT', 'FIXED'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

/** Restaurant defaults. The live values live in RestaurantSettings. */
export const BUSINESS_DEFAULTS = {
  timezone: 'Africa/Cairo',
  locale: 'en-EG',
  currency: 'EGP',
  taxRate: '14.00',
  deliveryFee: '25.00',
  maxCashierDiscountPct: '20.00',
} as const;

/** Supported Electron IPC channel names. */
export const IPC_CHANNELS = {
  appInfo: 'app:info',
  authLogin: 'auth:login',
  authLogout: 'auth:logout',
  authSession: 'auth:session',
  apiRequest: 'api:request',
} as const;
export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
