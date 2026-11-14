import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLES, hasPermission, permissionsForRole } from './permissions.js';

describe('permission matrix', () => {
  it('grants the administrator every permission', () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission('ADMIN', permission)).toBe(true);
    }
  });

  it('never leaks administration rights to the cashier', () => {
    expect(hasPermission('CASHIER', 'menu:read')).toBe(true);
    expect(hasPermission('CASHIER', 'orders:create')).toBe(true);
    expect(hasPermission('CASHIER', 'users:manage')).toBe(false);
    expect(hasPermission('CASHIER', 'menu:write')).toBe(false);
    expect(hasPermission('CASHIER', 'inventory:adjust')).toBe(false);
    expect(hasPermission('CASHIER', 'reports:financial')).toBe(false);
    expect(hasPermission('CASHIER', 'settings:manage')).toBe(false);
  });

  it('gives kitchen staff only the kitchen board', () => {
    for (const permission of permissionsForRole('KITCHEN_STAFF')) {
      expect(permission === 'kitchen:view' || permission === 'kitchen:update').toBe(true);
    }
    expect(hasPermission('KITCHEN_STAFF', 'kitchen:view')).toBe(true);
    expect(hasPermission('KITCHEN_STAFF', 'kitchen:update')).toBe(true);
    expect(hasPermission('KITCHEN_STAFF', 'orders:create')).toBe(false);
    expect(hasPermission('KITCHEN_STAFF', 'orders:read:own')).toBe(false);
    expect(hasPermission('KITCHEN_STAFF', 'orders:cancel')).toBe(false);
    expect(hasPermission('KITCHEN_STAFF', 'customers:read')).toBe(false);
    expect(hasPermission('KITCHEN_STAFF', 'users:manage')).toBe(false);
    expect(hasPermission('KITCHEN_STAFF', 'reports:view')).toBe(false);
    expect(hasPermission('KITCHEN_STAFF', 'settings:manage')).toBe(false);
  });

  it('materialises a permission list for every role', () => {
    for (const role of ROLES) {
      expect(permissionsForRole(role).length).toBeGreaterThan(0);
    }
  });
});
