/**
 * @pharmacy/shared
 *
 * Single source of truth for the restaurant domain constants, permission
 * matrix, DTO types, monetary helpers and Zod validation schemas used by both
 * the API server and the Electron desktop client.
 */

export * from './permissions.js';
export * from './constants.js';
export * from './i18n.js';
export * from './money.js';
export * from './types.js';

export * from './schemas/common.js';
export * from './schemas/auth.js';
export * from './schemas/user.js';
export * from './schemas/menu.js';
export * from './schemas/order.js';
export * from './schemas/kitchen.js';
export * from './schemas/inventory.js';
export * from './schemas/customer.js';
export * from './schemas/report.js';
export * from './schemas/settings.js';
