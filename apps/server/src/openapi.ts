/*
 * Hand-maintained OpenAPI 3.1 description of the HTTP surface.
 * Served at `GET /api/openapi.json` and browsable at `GET /api/docs`.
 */

const errorResponse = {
  description: 'Error envelope shared by every endpoint',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
              requestId: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

function op(
  tags: string[],
  summary: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    tags,
    summary,
    responses: {
      200: { description: 'Success' },
      400: errorResponse,
      401: errorResponse,
      403: errorResponse,
      404: errorResponse,
    },
    ...extra,
  };
}

function withBody(tags: string[], summary: string, body: string): Record<string, unknown> {
  return op(tags, summary, {
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: `#/components/schemas/${body}` } } },
    },
  });
}

export function buildOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Qahwa Coffee House POS API',
      version: '1.0.0',
      description:
        'Coffee shop point-of-sale and management API for Qahwa Coffee House. Authentication uses short-lived JWT access tokens plus rotating refresh tokens stored in the database.',
    },
    servers: [{ url: '/api/v1' }],
    tags: [
      { name: 'auth' },
      { name: 'users' },
      { name: 'categories' },
      { name: 'menu' },
      { name: 'discounts' },
      { name: 'orders' },
      { name: 'kitchen' },
      { name: 'invoices' },
      { name: 'customers' },
      { name: 'inventory' },
      { name: 'suppliers' },
      { name: 'reports' },
      { name: 'settings' },
      { name: 'audit' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: { username: { type: 'string' }, password: { type: 'string' } },
        },
        RefreshRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
        CreateOrderRequest: {
          type: 'object',
          required: ['type', 'payments', 'items'],
          properties: {
            type: { type: 'string', enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'] },
            customerId: { type: 'string', nullable: true },
            customerName: { type: 'string' },
            customerPhone: { type: 'string' },
            deliveryAddress: { type: 'string' },
            tableNumber: { type: 'string' },
            notes: { type: 'string' },
            discountCode: { type: 'string' },
            manualDiscountPct: { type: 'number' },
            payments: {
              type: 'array',
              minItems: 1,
              maxItems: 3,
              items: {
                type: 'object',
                required: ['method', 'amount'],
                properties: {
                  method: { type: 'string', enum: ['CASH', 'CARD', 'WALLET'] },
                  amount: { type: 'string' },
                  reference: { type: 'string', description: 'Card/wallet transaction reference' },
                },
              },
            },
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['menuItemId', 'quantity'],
                properties: {
                  menuItemId: { type: 'string' },
                  sizeId: { type: 'string', nullable: true },
                  quantity: { type: 'integer', minimum: 1 },
                  notes: { type: 'string' },
                  toppingIds: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        UpdateOrderStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
            },
          },
        },
        KitchenStatusUpdateRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['confirmed', 'preparing', 'ready', 'completed'],
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/auth/login': {
        post: withBody(['auth'], 'Sign in with username and password', 'LoginRequest'),
      },
      '/auth/refresh': {
        post: withBody(['auth'], 'Rotate the refresh token', 'RefreshRequest'),
      },
      '/auth/logout': { post: op(['auth'], 'Revoke the current session') },
      '/auth/me': { get: op(['auth'], 'Current authenticated user') },
      '/users': { get: op(['users'], 'List staff accounts (admin)') },
      '/users/{id}': {
        get: op(['users'], 'Fetch a staff account (admin)'),
        patch: op(['users'], 'Update a staff account (admin)'),
        delete: op(['users'], 'Deactivate a staff account (admin)'),
      },
      '/categories': { get: op(['categories'], 'List menu categories') },
      '/categories/{id}': {
        patch: op(['categories'], 'Update a category (admin)'),
        delete: op(['categories'], 'Delete an empty category (admin)'),
      },
      '/menu/catalog': { get: op(['menu'], 'Full sellable catalog with sizes, toppings and prices') },
      '/menu/items': {
        get: op(['menu'], 'Paginated menu items with filters'),
        post: op(['menu'], 'Create a menu item (admin)'),
      },
      '/menu/items/{id}': {
        get: op(['menu'], 'Fetch a menu item'),
        patch: op(['menu'], 'Update a menu item (admin)'),
        delete: op(['menu'], 'Delete an item without order history (admin)'),
      },
      '/menu/items/{id}/recipe': {
        get: op(['menu'], 'Read the ingredient recipe (admin)'),
        put: op(['menu'], 'Replace the ingredient recipe (admin)'),
      },
      '/menu/toppings': { get: op(['menu'], 'List toppings') },
      '/discounts': { get: op(['discounts'], 'List discounts (admin)') },
      '/orders': {
        get: op(['orders'], 'List orders (cashiers see their own)'),
        post: withBody(['orders'], 'Create an order and take payment', 'CreateOrderRequest'),
      },
      '/orders/{id}': { get: op(['orders'], 'Fetch an order') },
      '/orders/{id}/status': {
        patch: withBody(
          ['orders'],
          'Advance an order through the kitchen flow',
          'UpdateOrderStatusRequest',
        ),
      },
      '/orders/{id}/cancel': { post: op(['orders'], 'Cancel an order and restore stock (admin)') },
      '/kitchen/orders': {
        get: op(['kitchen'], 'Active kitchen tickets plus today\'s completed orders (kitchen staff/admin)'),
      },
      '/kitchen/orders/{id}/status': {
        patch: withBody(
          ['kitchen'],
          'Advance a kitchen ticket through the strict preparation flow',
          'KitchenStatusUpdateRequest',
        ),
      },
      '/invoices': { get: op(['invoices'], 'List invoices (cashiers see their own)') },
      '/invoices/by-order/{orderId}': { get: op(['invoices'], 'Invoice for an order') },
      '/invoices/{id}': { get: op(['invoices'], 'Fetch an invoice') },
      '/customers': {
        get: op(['customers'], 'Search customers with spend history'),
        post: op(['customers'], 'Create a customer'),
      },
      '/customers/{id}': {
        get: op(['customers'], 'Customer detail and order history'),
        patch: op(['customers'], 'Update a customer'),
        delete: op(['customers'], 'Delete a customer without orders'),
      },
      '/inventory/ingredients': {
        get: op(['inventory'], 'List ingredients and stock levels'),
        post: op(['inventory'], 'Create an ingredient (admin)'),
      },
      '/inventory/ingredients/low-stock': {
        get: op(['inventory'], 'Ingredients at or below threshold'),
      },
      '/inventory/ingredients/{id}': {
        get: op(['inventory'], 'Fetch an ingredient'),
        patch: op(['inventory'], 'Update an ingredient (admin)'),
        delete: op(['inventory'], 'Delete an unused ingredient (admin)'),
      },
      '/inventory/ingredients/{id}/adjust': {
        post: op(['inventory'], 'Record a manual stock adjustment (admin)'),
      },
      '/inventory/ingredients/{id}/purchase': {
        post: op(['inventory'], 'Receive purchased stock (admin)'),
      },
      '/inventory/movements': { get: op(['inventory'], 'Stock movement ledger (admin)') },
      '/suppliers': {
        get: op(['suppliers'], 'List suppliers (admin)'),
        post: op(['suppliers'], 'Create a supplier (admin)'),
      },
      '/suppliers/{id}': {
        patch: op(['suppliers'], 'Update a supplier (admin)'),
        delete: op(['suppliers'], 'Delete an unused supplier (admin)'),
      },
      '/reports/dashboard': {
        get: op(['reports'], 'KPI dashboard for today and the selected range'),
      },
      '/reports/sales': {
        get: op(['reports'], 'Aggregated sales, profit, products and cashier performance'),
      },
      '/settings': {
        get: op(['settings'], 'Restaurant settings'),
        patch: op(['settings'], 'Update restaurant settings (admin)'),
      },
      '/audit': { get: op(['audit'], 'Audit log (admin)') },
    },
  };
}

export function renderDocsPage(): string {
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Qahwa POS API — OpenAPI</title>
<style>
  :root { color-scheme: dark; }
  body { font-family: "Segoe UI", Tahoma, sans-serif; margin: 0; padding: 24px; background: #171412; color: #f3ede7; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.sub { color: #a89a8c; margin: 0 0 16px; font-size: 13px; }
  a { color: #f08a3c; }
  details { border: 1px solid #332b25; border-radius: 8px; margin-bottom: 8px; background: #1f1a16; }
  summary { cursor: pointer; padding: 10px 14px; font-weight: 600; font-size: 14px; }
  .op { padding: 8px 14px 12px; border-top: 1px solid #332b25; font-size: 13px; }
  .method { display: inline-block; min-width: 62px; font-weight: 700; text-transform: uppercase; }
  .get { color: #4ade80; } .post { color: #60a5fa; } .patch { color: #fbbf24; } .delete { color: #f87171; }
</style>
</head>
<body>
  <h1>Qahwa Coffee House POS API</h1>
  <p class="sub">OpenAPI document — <a href="/api/openapi.json">/api/openapi.json</a></p>
  <div id="doc">Loading…</div>
  <script>
    fetch('/api/openapi.json')
      .then(function (r) { return r.json(); })
      .then(function (spec) {
        var root = document.getElementById('doc');
        root.innerHTML = '';
        Object.keys(spec.paths).forEach(function (path) {
          var item = spec.paths[path];
          var d = document.createElement('details');
          var s = document.createElement('summary');
          s.textContent = path;
          d.appendChild(s);
          Object.keys(item).forEach(function (method) {
            var operation = item[method];
            var div = document.createElement('div');
            div.className = 'op';
            var m = document.createElement('span');
            m.className = 'method ' + method;
            m.textContent = method;
            div.appendChild(m);
            div.appendChild(document.createTextNode(' ' + (operation.summary || '')));
            d.appendChild(div);
          });
          root.appendChild(d);
        });
      })
      .catch(function () { document.getElementById('doc').textContent = 'Failed to load the document'; });
  </script>
</body>
</html>`;
}
