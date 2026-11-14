import { z } from 'zod';
import { ROLES } from '../permissions.js';
import { paginationSchema } from './common.js';

export const userRoleSchema = z.enum(ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200)
  .regex(/[A-Za-z]/u, 'Password must contain a letter')
  .regex(/\d/u, 'Password must contain a number');

export const createUserSchema = z
  .object({
    username: z.string().trim().min(3, 'Username is required').max(64).toLowerCase(),
    fullName: z.string().trim().min(2, 'Full name is required').max(128),
    email: z.string().trim().email('Invalid email address').max(255).optional().or(z.literal('')),
    role: userRoleSchema,
    password: passwordSchema,
  })
  .strict();
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(128).optional(),
    email: z.string().trim().email().max(255).optional().or(z.literal('')).nullable(),
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    mustChangePassword: z.boolean().default(true),
  })
  .strict();
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const userQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(128).optional(),
  role: userRoleSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z
    .enum(['username', 'fullName', 'role', 'isActive', 'lastLoginAt', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type UserQuery = z.infer<typeof userQuerySchema>;
