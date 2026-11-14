import cors, { type CorsOptions } from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env, isProduction } from './env.js';
import { accessLog, requestContext } from './middleware/requestContext.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { language } from './middleware/language.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/auth/users.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { customersRouter } from './modules/customers/customers.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { invoicesRouter } from './modules/invoices/invoices.routes.js';
import { kitchenRouter } from './modules/kitchen/kitchen.routes.js';
import { categoriesRouter, discountsRouter, menuRouter } from './modules/menu/menu.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { suppliersRouter } from './modules/suppliers/suppliers.routes.js';
import { buildOpenApiDocument, renderDocsPage } from './openapi.js';

function corsOptions(): CorsOptions {
  const configured = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      // Native clients (Electron main process, curl, tests) send no Origin.
      if (!origin) return callback(null, true);
      if (!isProduction || configured.includes('*') || configured.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: true,
    exposedHeaders: ['x-request-id', 'x-ratelimit-remaining', 'retry-after'],
  };
}

/** Builds the fully-wired Express application (no I/O side effects). */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      contentSecurityPolicy: false,
    }),
  );
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: '2mb' }));
  app.use(requestContext);
  app.use(accessLog);
  app.use(language);

  // Liveness/readiness at the root for infrastructure probes.
  app.use('/', healthRouter);

  app.get('/api/openapi.json', (_req, res) => {
    res.status(200).json(buildOpenApiDocument());
  });
  app.get('/api/docs', (_req, res) => {
    res
      .status(200)
      .setHeader('content-type', 'text/html; charset=utf-8')
      .setHeader(
        'content-security-policy',
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      )
      .send(renderDocsPage());
  });

  const v1 = express.Router();
  v1.use('/auth', authRouter);
  v1.use('/users', usersRouter);
  v1.use('/categories', categoriesRouter);
  v1.use('/menu', menuRouter);
  v1.use('/discounts', discountsRouter);
  v1.use('/orders', ordersRouter);
  v1.use('/kitchen', kitchenRouter);
  v1.use('/invoices', invoicesRouter);
  v1.use('/customers', customersRouter);
  v1.use('/inventory', inventoryRouter);
  v1.use('/suppliers', suppliersRouter);
  v1.use('/reports', reportsRouter);
  v1.use('/settings', settingsRouter);
  v1.use('/audit', auditRouter);

  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
