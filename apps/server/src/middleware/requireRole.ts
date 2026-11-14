import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@pharmacy/shared';
import { ForbiddenError, UnauthenticatedError } from '../lib/errors.js';

/**
 * Restricts a route to an exact set of roles. Unlike `authorize`, administrators
 * do not bypass this check, so role-scoped areas such as the kitchen board stay
 * limited to the people who actually work them.
 */
export function requireRole(...roles: readonly Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(new UnauthenticatedError());
      return;
    }
    if (!roles.includes(user.role)) {
      req.log.warn({ userId: user.id, role: user.role, requiredRoles: roles }, 'role denied');
      next(new ForbiddenError('Your role does not have access to this area'));
      return;
    }
    next();
  };
}
