import type {
  AuditEntryDto,
  CategoryDto,
  CategoryCreateInput,
  CustomerCreateInput,
  CustomerDto,
  CustomerUpdateInput,
  DashboardDto,
  DiscountDto,
  DiscountCreateInput,
  IngredientDto,
  IngredientInput,
  InventoryMovementDto,
  KitchenOrderDto,
  KitchenQueueDto,
  KitchenStatus,
  MenuItemCreateInput,
  MenuItemDto,
  MenuItemUpdateInput,
  OrderCreateInput,
  OrderDto,
  OrderStatus,
  Paginated,
  PaymentMethod,
  RecipeDto,
  RecipeUpsertInput,
  ReportDto,
  Role,
  SettingsDto,
  SettingsUpdateInput,
  StockAdjustInput,
  StockPurchaseInput,
  SupplierCreateInput,
  SupplierDto,
  ToppingCreateInput,
  ToppingDto,
  UserDto,
} from '@pharmacy/shared';
import type {
  ApiRequestPayload,
  AppInfo,
  PrintOptions,
  PrintResult,
  ServerHealth,
} from '../../shared/ipc';
import { getBridge } from './bridge';
import { getActiveLanguage } from './language';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface InvoiceWithOrder {
  id: string;
  invoiceNumber: string;
  orderId: string;
  issuedAt: string;
  order: OrderDto;
}

export interface CustomerDetail {
  customer: CustomerDto;
  orders: OrderDto[];
}

export interface MenuCatalog {
  categories: CategoryDto[];
  items: MenuItemDto[];
  toppings: ToppingDto[];
  discounts: DiscountDto[];
}

async function call<T>(payload: ApiRequestPayload): Promise<T> {
  const response = await getBridge().api.request<T>({
    ...payload,
    query: { ...payload.query, lang: getActiveLanguage() },
  });
  if (response.ok) return response.data;
  throw new ApiError(
    response.error.message,
    response.error.code,
    response.status,
    response.error.details,
  );
}

export interface CreateUserBody {
  username: string;
  fullName: string;
  email?: string;
  role: Role;
  password: string;
}

export interface UpdateUserBody {
  fullName?: string;
  email?: string | null;
  role?: Role;
  isActive?: boolean;
}

export const api = {
  appInfo: (): Promise<AppInfo> => getBridge().appInfo(),
  health: (): Promise<ServerHealth> => getBridge().health(),
  session: () => getBridge().auth.session(),
  login: async (username: string, password: string) => {
    const response = await getBridge().auth.login({
      username,
      password,
      language: getActiveLanguage(),
    });
    if (response.ok) return response.data;
    throw new ApiError(response.error.message, response.error.code, response.status);
  },
  logout: (): Promise<void> => getBridge().auth.logout(),
  print: (options?: PrintOptions): Promise<PrintResult> =>
    getBridge().print({ ...options, language: getActiveLanguage() }),

  categories: {
    list: () => call<CategoryDto[]>({ method: 'GET', path: '/categories' }),
    create: (body: CategoryCreateInput) =>
      call<CategoryDto>({ method: 'POST', path: '/categories', body }),
    update: (id: string, body: Partial<CategoryCreateInput>) =>
      call<CategoryDto>({ method: 'PATCH', path: `/categories/${id}`, body }),
    remove: (id: string) =>
      call<{ ok: boolean }>({ method: 'DELETE', path: `/categories/${id}` }),
  },

  menu: {
    catalog: () => call<MenuCatalog>({ method: 'GET', path: '/menu/catalog' }),
    items: (params: ListParams) =>
      call<Paginated<MenuItemDto>>({ method: 'GET', path: '/menu/items', query: params }),
    item: (id: string) => call<MenuItemDto>({ method: 'GET', path: `/menu/items/${id}` }),
    create: (body: MenuItemCreateInput) =>
      call<MenuItemDto>({ method: 'POST', path: '/menu/items', body }),
    update: (id: string, body: MenuItemUpdateInput) =>
      call<MenuItemDto>({ method: 'PATCH', path: `/menu/items/${id}`, body }),
    remove: (id: string) =>
      call<{ ok: boolean }>({ method: 'DELETE', path: `/menu/items/${id}` }),
    recipe: (id: string) => call<RecipeDto>({ method: 'GET', path: `/menu/items/${id}/recipe` }),
    saveRecipe: (id: string, body: RecipeUpsertInput) =>
      call<RecipeDto>({ method: 'PUT', path: `/menu/items/${id}/recipe`, body }),
    toppings: () => call<ToppingDto[]>({ method: 'GET', path: '/menu/toppings' }),
    createTopping: (body: ToppingCreateInput) =>
      call<ToppingDto>({ method: 'POST', path: '/menu/toppings', body }),
    updateTopping: (
      id: string,
      body: Omit<Partial<ToppingCreateInput>, 'ingredientId'> & { ingredientId?: string | null },
    ) => call<ToppingDto>({ method: 'PATCH', path: `/menu/toppings/${id}`, body }),
    removeTopping: (id: string) =>
      call<{ ok: boolean }>({ method: 'DELETE', path: `/menu/toppings/${id}` }),
  },

  discounts: {
    list: () => call<DiscountDto[]>({ method: 'GET', path: '/discounts' }),
    create: (body: DiscountCreateInput) =>
      call<DiscountDto>({ method: 'POST', path: '/discounts', body }),
    update: (id: string, body: Partial<DiscountCreateInput>) =>
      call<DiscountDto>({ method: 'PATCH', path: `/discounts/${id}`, body }),
    remove: (id: string) =>
      call<{ ok: boolean }>({ method: 'DELETE', path: `/discounts/${id}` }),
  },

  orders: {
    list: (params: ListParams) =>
      call<Paginated<OrderDto>>({ method: 'GET', path: '/orders', query: params }),
    get: (id: string) => call<OrderDto>({ method: 'GET', path: `/orders/${id}` }),
    create: (body: OrderCreateInput) =>
      call<OrderDto>({ method: 'POST', path: '/orders', body }),
    updateStatus: (id: string, status: OrderStatus) =>
      call<OrderDto>({ method: 'PATCH', path: `/orders/${id}/status`, body: { status } }),
    cancel: (id: string, reason: string) =>
      call<OrderDto>({ method: 'POST', path: `/orders/${id}/cancel`, body: { reason } }),
  },

  invoices: {
    list: (params: ListParams) =>
      call<Paginated<InvoiceWithOrder>>({ method: 'GET', path: '/invoices', query: params }),
    get: (id: string) => call<InvoiceWithOrder>({ method: 'GET', path: `/invoices/${id}` }),
    byOrder: (orderId: string) =>
      call<InvoiceWithOrder>({ method: 'GET', path: `/invoices/by-order/${orderId}` }),
  },

  kitchen: {
    queue: () => call<KitchenQueueDto>({ method: 'GET', path: '/kitchen/orders' }),
    updateStatus: (id: string, status: KitchenStatus) =>
      call<KitchenOrderDto>({
        method: 'PATCH',
        path: `/kitchen/orders/${id}/status`,
        body: { status },
      }),
  },

  customers: {
    list: (params: ListParams) =>
      call<Paginated<CustomerDto>>({ method: 'GET', path: '/customers', query: params }),
    get: (id: string) => call<CustomerDetail>({ method: 'GET', path: `/customers/${id}` }),
    create: (body: CustomerCreateInput) =>
      call<CustomerDto>({ method: 'POST', path: '/customers', body }),
    update: (id: string, body: CustomerUpdateInput) =>
      call<CustomerDto>({ method: 'PATCH', path: `/customers/${id}`, body }),
    remove: (id: string) =>
      call<{ ok: boolean }>({ method: 'DELETE', path: `/customers/${id}` }),
  },

  inventory: {
    ingredients: (params: ListParams) =>
      call<Paginated<IngredientDto>>({ method: 'GET', path: '/inventory/ingredients', query: params }),
    lowStock: () => call<IngredientDto[]>({ method: 'GET', path: '/inventory/ingredients/low-stock' }),
    ingredient: (id: string) =>
      call<IngredientDto>({ method: 'GET', path: `/inventory/ingredients/${id}` }),
    createIngredient: (body: IngredientInput) =>
      call<IngredientDto>({ method: 'POST', path: '/inventory/ingredients', body }),
    updateIngredient: (id: string, body: Partial<IngredientInput>) =>
      call<IngredientDto>({ method: 'PATCH', path: `/inventory/ingredients/${id}`, body }),
    removeIngredient: (id: string) =>
      call<{ ok: boolean }>({ method: 'DELETE', path: `/inventory/ingredients/${id}` }),
    adjust: (id: string, body: StockAdjustInput) =>
      call<IngredientDto>({ method: 'POST', path: `/inventory/ingredients/${id}/adjust`, body }),
    purchase: (id: string, body: StockPurchaseInput) =>
      call<IngredientDto>({ method: 'POST', path: `/inventory/ingredients/${id}/purchase`, body }),
    movements: (params: ListParams) =>
      call<Paginated<InventoryMovementDto>>({ method: 'GET', path: '/inventory/movements', query: params }),
  },

  suppliers: {
    list: (params: ListParams) =>
      call<Paginated<SupplierDto>>({ method: 'GET', path: '/suppliers', query: params }),
    create: (body: SupplierCreateInput) =>
      call<SupplierDto>({ method: 'POST', path: '/suppliers', body }),
    update: (id: string, body: Partial<SupplierCreateInput>) =>
      call<SupplierDto>({ method: 'PATCH', path: `/suppliers/${id}`, body }),
    remove: (id: string) =>
      call<{ ok: boolean }>({ method: 'DELETE', path: `/suppliers/${id}` }),
  },

  reports: {
    dashboard: (days: number) =>
      call<DashboardDto>({ method: 'GET', path: '/reports/dashboard', query: { days } }),
    sales: (params: { from?: string; to?: string; granularity?: 'day' | 'month' }) =>
      call<ReportDto>({ method: 'GET', path: '/reports/sales', query: params }),
  },

  settings: {
    get: () => call<SettingsDto>({ method: 'GET', path: '/settings' }),
    update: (body: SettingsUpdateInput) =>
      call<SettingsDto>({ method: 'PATCH', path: '/settings', body }),
  },

  users: {
    list: (params: ListParams) =>
      call<Paginated<UserDto>>({ method: 'GET', path: '/users', query: params }),
    create: (body: CreateUserBody) =>
      call<UserDto>({ method: 'POST', path: '/users', body }),
    update: (id: string, body: UpdateUserBody) =>
      call<UserDto>({ method: 'PATCH', path: `/users/${id}`, body }),
    resetPassword: (id: string, newPassword: string) =>
      call<void>({
        method: 'POST',
        path: `/users/${id}/reset-password`,
        body: { newPassword, mustChangePassword: true },
      }),
    deactivate: (id: string) =>
      call<void>({ method: 'DELETE', path: `/users/${id}` }),
  },

  audit: {
    list: (params: ListParams) =>
      call<Paginated<AuditEntryDto>>({ method: 'GET', path: '/audit', query: params }),
  },
};

export type { PaymentMethod };
