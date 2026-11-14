/** DTOs returned by the API and consumed by the desktop client. */
import type {
  DiscountType,
  IngredientUnit,
  InventoryMovementType,
  MenuKind,
  OrderStatus,
  OrderType,
  PaymentMethod,
} from './constants.js';
import type { Role } from './permissions.js';
import type { Paginated } from './schemas/common.js';

export type { Paginated };

export interface AuthUserDto {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

export interface UserDto extends AuthUserDto {
  email: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDto {
  id: string;
  /** Localized display value for the language the request asked for. */
  name: string;
  nameEn: string;
  nameAr: string | null;
  description: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  sortOrder: number;
  isActive: boolean;
  itemCount: number;
}

export interface MenuItemSizeDto {
  id: string;
  name: string;
  nameEn: string;
  nameAr: string | null;
  price: string;
  ingredientMultiplier: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface RecipeItemDto {
  id: string;
  ingredientId: string;
  ingredientName: string;
  unit: IngredientUnit;
  quantity: number;
  costPerUnit: string;
}

export interface RecipeDto {
  id: string;
  menuItemId: string;
  notes: string | null;
  items: RecipeItemDto[];
}

export interface MenuItemDto {
  id: string;
  sku: string;
  name: string;
  nameEn: string;
  nameAr: string | null;
  description: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string | null;
  categoryNameEn: string | null;
  categoryNameAr: string | null;
  kind: MenuKind;
  basePrice: string;
  costPrice: string;
  prepMinutes: number;
  isAvailable: boolean;
  isFeatured: boolean;
  hasSizes: boolean;
  sizes: MenuItemSizeDto[];
  recipe: RecipeDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface ToppingDto {
  id: string;
  name: string;
  nameEn: string;
  nameAr: string | null;
  price: string;
  ingredientId: string | null;
  ingredientQuantity: number;
  isAvailable: boolean;
  sortOrder: number;
}

export interface DiscountDto {
  id: string;
  name: string;
  nameEn: string;
  nameAr: string | null;
  type: DiscountType;
  value: string;
  isActive: boolean;
  createdAt: string;
}

export interface SupplierDto {
  id: string;
  name: string;
  nameEn: string;
  nameAr: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface IngredientDto {
  id: string;
  sku: string;
  name: string;
  nameEn: string;
  nameAr: string | null;
  unit: IngredientUnit;
  currentStock: number;
  minStock: number;
  costPerUnit: string;
  stockValue: string;
  supplierId: string | null;
  supplierName: string | null;
  isActive: boolean;
  isLowStock: boolean;
  updatedAt: string;
}

export interface InventoryMovementDto {
  id: string;
  ingredientId: string;
  ingredientName: string;
  unit: IngredientUnit;
  type: InventoryMovementType;
  quantity: number;
  unitCost: string | null;
  reference: string | null;
  note: string | null;
  orderId: string | null;
  userName: string | null;
  createdAt: string;
}

export interface CustomerDto {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  ordersCount: number;
  totalSpent: string;
  lastOrderAt: string | null;
  createdAt: string;
}

export interface OrderItemToppingDto {
  id: string;
  toppingId: string | null;
  name: string;
  nameEn: string;
  nameAr: string | null;
  price: string;
}

export interface OrderItemDto {
  id: string;
  menuItemId: string;
  name: string;
  nameEn: string;
  nameAr: string | null;
  imageUrl: string | null;
  sizeId: string | null;
  sizeName: string | null;
  sizeNameEn: string | null;
  sizeNameAr: string | null;
  quantity: number;
  prepMinutes: number;
  unitPrice: string;
  toppingsTotal: string;
  lineTotal: string;
  unitCost: string;
  specialInstructions: string | null;
  toppings: OrderItemToppingDto[];
}

export interface PaymentDto {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference: string | null;
  createdAt: string;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  orderId: string;
  issuedAt: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  tableNumber: string | null;
  cashierId: string;
  cashierName: string;
  subtotal: string;
  discount: string;
  discountLabel: string | null;
  discountLabelEn: string | null;
  discountLabelAr: string | null;
  tax: string;
  deliveryFee: string;
  total: string;
  amountPaid: string;
  changeDue: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  notes: string | null;
  items: OrderItemDto[];
  payments: PaymentDto[];
  invoice: InvoiceDto | null;
  inventoryDeducted: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface KitchenOrderItemDto {
  id: string;
  name: string;
  quantity: number;
  sizeName: string | null;
  toppings: string[];
  specialInstructions: string | null;
  prepMinutes: number;
}

/** Deliberately excludes prices, payments and customer contact details. */
export interface KitchenOrderDto {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  tableNumber: string | null;
  notes: string | null;
  items: KitchenOrderItemDto[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface KitchenQueueDto {
  generatedAt: string;
  orders: KitchenOrderDto[];
}

export interface SettingsDto {
  name: string;
  nameEn: string;
  nameAr: string | null;
  tagline: string | null;
  taglineEn: string | null;
  taglineAr: string | null;
  address: string | null;
  addressEn: string | null;
  addressAr: string | null;
  phone: string | null;
  email: string | null;
  taxRate: string;
  deliveryFee: string;
  maxCashierDiscountPct: string;
  receiptFooter: string | null;
  receiptFooterEn: string | null;
  receiptFooterAr: string | null;
  currency: string;
  updatedAt: string;
}

export interface DashboardOverview {
  todayRevenue: string;
  todayOrders: number;
  averageOrderValue: string;
  totalProducts: number;
  activeProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  lowStockIngredients: number;
  todayProfit: string;
  revenueChangePct: number | null;
}

export interface RevenuePoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  profit: number;
}

export interface CategorySalesRow {
  categoryId: string;
  name: string;
  revenue: string;
  units: number;
  orders: number;
}

export interface BestSellerRow {
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  categoryName: string | null;
  units: number;
  revenue: string;
}

export interface PaymentDistributionRow {
  method: PaymentMethod;
  amount: string;
  count: number;
  percent: number;
}

export interface LowStockRow {
  id: string;
  name: string;
  unit: IngredientUnit;
  currentStock: number;
  minStock: number;
}

export interface DashboardDto {
  generatedAt: string;
  rangeDays: number;
  overview: DashboardOverview;
  revenueSeries: RevenuePoint[];
  salesByCategory: CategorySalesRow[];
  bestSellers: BestSellerRow[];
  paymentDistribution: PaymentDistributionRow[];
  recentOrders: OrderDto[];
  lowStock: LowStockRow[];
}

export interface ReportSummary {
  revenue: string;
  orders: number;
  itemsSold: number;
  averageOrderValue: string;
  discounts: string;
  tax: string;
  deliveryFees: string;
  cost: string;
  profit: string;
  marginPct: number | null;
}

export interface CashierPerformanceRow {
  userId: string;
  name: string;
  orders: number;
  revenue: string;
  averageOrderValue: string;
}

export interface ReportRow {
  key: string;
  label: string;
  orders: number;
  units: number;
  revenue: string;
}

export interface ReportDto {
  range: { from: string; to: string; days: number };
  summary: ReportSummary;
  daily: RevenuePoint[];
  byCategory: CategorySalesRow[];
  bestSellers: BestSellerRow[];
  byCashier: CashierPerformanceRow[];
  payments: PaymentDistributionRow[];
  discounts: Array<{ label: string; orders: number; amount: string }>;
  inventoryConsumption: Array<{
    ingredientId: string;
    name: string;
    unit: IngredientUnit;
    quantity: number;
    cost: string;
  }>;
  ordersByType: ReportRow[];
}

export interface AuditEntryDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  terminalId: string | null;
  createdAt: string;
  user: { id: string; fullName: string; username: string } | null;
}
