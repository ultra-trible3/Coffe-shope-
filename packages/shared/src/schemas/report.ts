import { z } from 'zod';
import { optionalTrimmedString } from './common.js';

export const reportRangeSchema = z.object({
  from: optionalTrimmedString(10),
  to: optionalTrimmedString(10),
});
export type ReportRangeQuery = z.infer<typeof reportRangeSchema>;

export const dashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(14),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const salesReportQuerySchema = reportRangeSchema.extend({
  granularity: z.enum(['day', 'month']).optional(),
});
export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
