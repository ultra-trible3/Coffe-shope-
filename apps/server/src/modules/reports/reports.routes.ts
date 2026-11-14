import { Router } from 'express';
import { dashboardQuerySchema, salesReportQuerySchema, type DashboardQuery, type SalesReportQuery } from '@pharmacy/shared';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as reportsService from './reports.service.js';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

reportsRouter.get(
  '/dashboard',
  authorize('reports:view'),
  validate({ query: dashboardQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as DashboardQuery;
    const result = await reportsService.getDashboard(query.days);
    res.status(200).json(result);
  }),
);

reportsRouter.get(
  '/sales',
  authorize('reports:view'),
  validate({ query: salesReportQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await reportsService.getSalesReport(req.query as unknown as SalesReportQuery);
    res.status(200).json(result);
  }),
);
