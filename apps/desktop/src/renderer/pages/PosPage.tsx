import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgePercent,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  PAYMENT_METHODS,
  type CategoryDto,
  type CustomerDto,
  type DiscountDto,
  type MenuItemDto,
  type OrderDto,
  type OrderType,
  type PaymentMethod,
  type ToppingDto,
} from '@pharmacy/shared';
import { InvoiceViewer } from '../components/invoice/InvoiceViewer';
import { PaymentSuccessDialog } from '../components/orders/PaymentSuccessDialog';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { Input, Select, Textarea } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Spinner } from '../components/ui/badge';
import { EmptyPanel, ErrorState } from '../components/ui/states';
import { Skeleton } from '../components/ui/skeleton';
import { PosSkeleton } from '../components/skeletons/PosSkeleton';
import { toast } from '../components/ui/toast';
import { api } from '../lib/api';
import { resolveImageUrl } from '../lib/images';
import {
  formatDecimal,
  formatMoney,
  formatMoneyShort,
  formatNumber,
  menuKindLabel,
  orderTypeLabel,
  paymentMethodLabel,
} from '../lib/format';
import { cn } from '../lib/utils';
import type { PageKey } from '../components/layout/AppShell';
import { useAuthStore } from '../store/auth';
import { useI18n } from '../i18n';

interface CartTopping {
  id: string;
  name: string;
  price: number;
}

interface CartLine {
  key: string;
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  sizeId: string | null;
  sizeName: string | null;
  unitPrice: number;
  toppings: CartTopping[];
  quantity: number;
  specialInstructions: string;
}

interface CustomerForm {
  id: string | null;
  name: string;
  phone: string;
  address: string;
}

const EMPTY_CUSTOMER: CustomerForm = { id: null, name: '', phone: '', address: '' };

function itemPrice(item: MenuItemDto): number {
  if (item.hasSizes && item.sizes.length > 0) {
    return Math.min(...item.sizes.map((size) => Number(size.price)));
  }
  return Number(item.basePrice);
}

function money(value: number): number {
  return Math.round(value * 100);
}

function fromMinor(value: number): string {
  return (value / 100).toFixed(2);
}

interface PaymentLine {
  key: string;
  method: PaymentMethod;
  amount: string;
  reference: string;
}

function newPaymentLine(method: PaymentMethod): PaymentLine {
  return {
    key: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    method,
    amount: '',
    reference: '',
  };
}

function lineUnitPrice(line: CartLine): number {
  return line.unitPrice + line.toppings.reduce((sum, topping) => sum + topping.price, 0);
}

function lineTotal(line: CartLine): number {
  return lineUnitPrice(line) * line.quantity;
}

export function PosPage({ onNavigate }: { onNavigate: (page: PageKey) => void }): ReactElement {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const isAdmin = useAuthStore((state) => state.user?.role === 'ADMIN');
  const searchRef = useRef<HTMLInputElement>(null);

  const [categoryId, setCategoryId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MenuItemDto | null>(null);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [tableNumber, setTableNumber] = useState('');
  const [customer, setCustomer] = useState<CustomerForm>(EMPTY_CUSTOMER);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [discountId, setDiscountId] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>(() => [newPaymentLine('CASH')]);
  const [lastOrder, setLastOrder] = useState<OrderDto | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const catalog = useQuery({
    queryKey: ['pos', 'catalog'],
    queryFn: () => api.menu.catalog(),
    staleTime: 30_000,
  });
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
    staleTime: 60_000,
  });
  const customersQuery = useQuery({
    queryKey: ['customers', 'picker', customerQuery],
    queryFn: () => api.customers.list({ q: customerQuery || undefined, page: 1, pageSize: 12 }),
    enabled: customerOpen,
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'F2') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const categories = useMemo(() => catalog.data?.categories ?? [], [catalog.data]);
  const items = useMemo(() => catalog.data?.items ?? [], [catalog.data]);
  const toppings = useMemo(() => catalog.data?.toppings ?? [], [catalog.data]);
  const discounts = useMemo(
    () => (catalog.data?.discounts ?? []).filter((discount) => discount.isActive),
    [catalog.data],
  );
  const settings = settingsQuery.data;

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryId !== 'all' && item.categoryId !== categoryId) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term)
      );
    });
  }, [items, categoryId, search]);

  const groupedCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    return categories.map((category: CategoryDto) => ({
      ...category,
      count: counts.get(category.id) ?? category.itemCount,
    }));
  }, [categories, items]);

  useEffect(() => {
    if (!catalog.data) return;

    const pendingCategory = sessionStorage.getItem('qahwa-shop-category');
    if (pendingCategory) {
      sessionStorage.removeItem('qahwa-shop-category');
      if (categories.some((category) => category.id === pendingCategory)) {
        setCategoryId(pendingCategory);
      }
    }

    const pendingItemId = sessionStorage.getItem('qahwa-quick-add');
    if (!pendingItemId) return;
    sessionStorage.removeItem('qahwa-quick-add');

    const item = items.find((candidate) => candidate.id === pendingItemId);
    if (!item || !item.isAvailable) return;
    const defaultSize = item.sizes.find((size) => size.isDefault) ?? item.sizes[0] ?? null;
    setCart((current) => [
      ...current,
      {
        key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        menuItemId: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        sizeId: defaultSize?.id ?? null,
        sizeName: defaultSize?.name ?? null,
        unitPrice: item.hasSizes ? Number(defaultSize?.price ?? 0) : Number(item.basePrice),
        toppings: [],
        quantity: 1,
        specialInstructions: '',
      },
    ]);
    toast.success(t('pos.quickAdded', { name: item.name }));
  }, [catalog.data, categories, items, t]);

  const selectedSize = selected?.sizes.find((size) => size.id === sizeId) ?? null;
  const selectedImage = resolveImageUrl(selected?.imageUrl);
  const selectedToppings = toppings.filter((topping) => toppingIds.includes(topping.id));
  const customizeUnit = selected
    ? (selected.hasSizes ? Number(selectedSize?.price ?? 0) : Number(selected.basePrice)) +
      selectedToppings.reduce((sum, topping) => sum + Number(topping.price), 0)
    : 0;
  const customizeTotal = customizeUnit * quantity;

  const subtotalMinor = cart.reduce((sum, line) => sum + money(lineTotal(line)), 0);
  const selectedDiscount = discounts.find((discount) => discount.id === discountId) ?? null;
  const discountMinor = selectedDiscount
    ? selectedDiscount.type === 'PERCENT'
      ? Math.round((subtotalMinor * Number(selectedDiscount.value)) / 100)
      : Math.min(money(Number(selectedDiscount.value)), subtotalMinor)
    : 0;
  const taxRate = Number(settings?.taxRate ?? 14);
  const taxableMinor = Math.max(subtotalMinor - discountMinor, 0);
  const taxMinor = Math.round((taxableMinor * taxRate) / 100);
  const deliveryMinor =
    orderType === 'DELIVERY' && settings ? money(Number(settings.deliveryFee)) : 0;
  const totalMinor = taxableMinor + taxMinor + deliveryMinor;
  const paymentSummary = useMemo(() => {
    const amounts = paymentLines.map((line) => money(Number(line.amount || '0')));
    const tenderedMinor = amounts.reduce((sum, amount) => sum + amount, 0);
    const cashMinor = paymentLines.reduce(
      (sum, line, index) => (line.method === 'CASH' ? sum + amounts[index] : sum),
      0,
    );
    const nonCashMinor = tenderedMinor - cashMinor;
    const hasCash = paymentLines.some((line) => line.method === 'CASH');
    const cashShareMinor = Math.max(totalMinor - nonCashMinor, 0);
    return {
      tenderedMinor,
      hasCash,
      cashShareMinor,
      remainingMinor: Math.max(totalMinor - tenderedMinor, 0),
      changeMinor: Math.max(tenderedMinor - totalMinor, 0),
      nonCashOver: nonCashMinor > totalMinor,
      cashUnused: hasCash && cashShareMinor === 0 && tenderedMinor > 0,
      cashShort: hasCash && cashMinor < cashShareMinor,
      missing: !hasCash && tenderedMinor !== totalMinor,
    };
  }, [paymentLines, totalMinor]);
  const capPct = Number(settings?.maxCashierDiscountPct ?? 0);
  const capMinor = Math.round((subtotalMinor * capPct) / 100);
  const overCashierCap = !isAdmin && discountMinor > capMinor;

  const updatePaymentLine = (key: string, patch: Partial<PaymentLine>): void => {
    setPaymentLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const changePaymentMethod = (key: string, method: PaymentMethod): void => {
    setPaymentLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line;
        if (line.amount.trim() !== '' || method === 'CASH') return { ...line, method };
        const others = current
          .filter((entry) => entry.key !== key)
          .reduce((sum, entry) => sum + money(Number(entry.amount || '0')), 0);
        const remaining = Math.max(totalMinor - others, 0);
        return { ...line, method, amount: remaining > 0 ? fromMinor(remaining) : '' };
      }),
    );
  };

  const addPaymentLine = (): void => {
    const used = new Set(paymentLines.map((line) => line.method));
    const method = PAYMENT_METHODS.find((entry) => !used.has(entry));
    if (!method) return;
    const line = newPaymentLine(method);
    if (method !== 'CASH' && paymentSummary.remainingMinor > 0) {
      line.amount = fromMinor(paymentSummary.remainingMinor);
    }
    setPaymentLines((current) => [...current, line]);
  };

  const removePaymentLine = (key: string): void => {
    setPaymentLines((current) =>
      current.length > 1 ? current.filter((line) => line.key !== key) : current,
    );
  };

  const resetCustomization = (): void => {
    setSelected(null);
    setSizeId(null);
    setToppingIds([]);
    setQuantity(1);
    setInstructions('');
    setEditingKey(null);
  };

  const chooseItem = (item: MenuItemDto): void => {
    if (!item.isAvailable) return;
    const defaultSize = item.sizes.find((size) => size.isDefault) ?? item.sizes[0] ?? null;
    setSelected(item);
    setSizeId(defaultSize?.id ?? null);
    setToppingIds([]);
    setQuantity(1);
    setInstructions('');
    setEditingKey(null);
  };

  const toggleTopping = (topping: ToppingDto): void => {
    if (!topping.isAvailable) return;
    setToppingIds((current) =>
      current.includes(topping.id)
        ? current.filter((id) => id !== topping.id)
        : [...current, topping.id],
    );
  };

  const addToCart = (): void => {
    if (!selected) return;
    if (selected.hasSizes && !sizeId) {
      toast.error(t('pos.errors.chooseSize', { name: selected.name }));
      return;
    }
    const line: CartLine = {
      key: editingKey ?? `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      menuItemId: selected.id,
      name: selected.name,
      imageUrl: selected.imageUrl,
      sizeId,
      sizeName: selectedSize?.name ?? null,
      unitPrice: selected.hasSizes ? Number(selectedSize?.price ?? 0) : Number(selected.basePrice),
      toppings: selectedToppings.map((topping) => ({
        id: topping.id,
        name: topping.name,
        price: Number(topping.price),
      })),
      quantity,
      specialInstructions: instructions.trim(),
    };
    setCart((current) =>
      editingKey
        ? current.map((entry) => (entry.key === editingKey ? line : entry))
        : [...current, line],
    );
    resetCustomization();
  };

  const editLine = (line: CartLine): void => {
    const item = items.find((candidate) => candidate.id === line.menuItemId) ?? null;
    if (!item) {
      toast.error(t('pos.errors.itemGone'));
      return;
    }
    setSelected(item);
    setSizeId(line.sizeId);
    setToppingIds(line.toppings.map((topping) => topping.id));
    setQuantity(line.quantity);
    setInstructions(line.specialInstructions);
    setEditingKey(line.key);
  };

  const changeQuantity = (key: string, delta: number): void => {
    setCart((current) =>
      current
        .map((line) =>
          line.key === key ? { ...line, quantity: Math.min(Math.max(line.quantity + delta, 1), 99) } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  };

  const removeLine = (key: string): void => {
    setCart((current) => current.filter((line) => line.key !== key));
    if (editingKey === key) resetCustomization();
  };

  const chooseCustomer = (picked: CustomerDto): void => {
    setCustomer({
      id: picked.id,
      name: picked.name,
      phone: picked.phone ?? '',
      address: picked.address ?? '',
    });
    setCustomerOpen(false);
    setCustomerQuery('');
  };

  const createOrder = useMutation({
    mutationFn: () =>
      api.orders.create({
        type: orderType,
        customerId: customer.id,
        customerName: customer.name.trim() || undefined,
        customerPhone: customer.phone.trim() || undefined,
        customerAddress: customer.address.trim() || undefined,
        tableNumber: orderType === 'DINE_IN' ? tableNumber.trim() || undefined : undefined,
        items: cart.map((line) => ({
          menuItemId: line.menuItemId,
          sizeId: line.sizeId,
          quantity: line.quantity,
          toppingIds: line.toppings.map((topping) => topping.id),
          specialInstructions: line.specialInstructions || undefined,
        })),
        discountId: discountId || undefined,
        notes: notes.trim() || undefined,
        payments: paymentLines.map((line) => ({
          method: line.method,
          amount: line.amount || '0',
          reference: line.reference.trim() || undefined,
        })),
      }),
    onSuccess: (order) => {
      setLastOrder(order);
      setSuccessOpen(true);
      setCart([]);
      resetCustomization();
      setCustomer(EMPTY_CUSTOMER);
      setTableNumber('');
      setNotes('');
      setDiscountId('');
      setPaymentLines([newPaymentLine('CASH')]);
      void queryClient.invalidateQueries({ queryKey: ['pos', 'catalog'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      void queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('pos.errors.createFailed'));
    },
  });

  const validationError = useMemo(() => {
    if (cart.length === 0) return t('pos.validation.cartEmpty');
    if (orderType === 'DELIVERY' && !customer.address.trim()) {
      return t('pos.validation.address');
    }
    if (overCashierCap) {
      return t('pos.validation.discountLimit', { percent: formatDecimal(capPct, 0) });
    }
    if (paymentSummary.nonCashOver) return t('pos.validation.paymentOver');
    if (paymentSummary.cashUnused) return t('pos.validation.cashUnused');
    if (paymentSummary.cashShort) return t('pos.validation.cashShort');
    if (paymentSummary.missing) return t('pos.validation.paymentTotal');
    return null;
  }, [
    cart.length,
    orderType,
    customer.address,
    overCashierCap,
    capPct,
    paymentSummary,
    t,
  ]);

  const placeOrder = (): void => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    createOrder.mutate();
  };

  if (catalog.isLoading || settingsQuery.isLoading) {
    return <PosSkeleton />;
  }

  if (catalog.isError || settingsQuery.isError || !settings) {
    return (
      <ErrorState
        title={t('pos.errors.loadTitle')}
        message={
          (catalog.error instanceof Error ? catalog.error.message : undefined) ??
          (settingsQuery.error instanceof Error ? settingsQuery.error.message : undefined) ??
          t('pos.errors.loadHint')
        }
        onRetry={() => {
          void catalog.refetch();
          void settingsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="grid min-h-0 gap-4 xl:h-[calc(100vh-8.5rem)] xl:grid-cols-[minmax(0,1.15fr)_340px_390px]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="space-y-3 border-b border-border p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('pos.search.placeholder')}
                className="h-10 ps-9"
                aria-label={t('pos.search.aria')}
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                  aria-label={t('pos.search.clear')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <CategoryChip
              active={categoryId === 'all'}
              label={t('pos.allMenu')}
              count={items.length}
              onClick={() => setCategoryId('all')}
            />
            {groupedCategories.map((category) => (
              <CategoryChip
                key={category.id}
                active={categoryId === category.id}
                label={category.name}
                count={category.count}
                onClick={() => setCategoryId(category.id)}
              />
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {filteredItems.length === 0 ? (
            <EmptyPanel
              title={t('pos.empty.title')}
              message={t('pos.empty.message')}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setCategoryId('all');
                  }}
                >
                  {t('pos.empty.reset')}
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {filteredItems.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  active={selected?.id === item.id}
                  onClick={() => chooseItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">
              {editingKey ? t('pos.builder.edit') : selected ? t('pos.builder.customise') : t('pos.builder.build')}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selected ? selected.name : t('pos.builder.pick')}
            </p>
          </div>
          {selected ? (
            <Button variant="ghost" size="icon" onClick={resetCustomization} aria-label={t('pos.builder.clearSelection')}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                <Coffee className="h-7 w-7" />
              </span>
              <div>
                <p className="text-sm font-semibold">{t('pos.start.title')}</p>
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                  {t('pos.start.message')}
                </p>
              </div>
              {items.filter((item) => item.isFeatured && item.isAvailable).length > 0 ? (
                <div className="w-full space-y-2 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t('pos.start.featured')}
                  </p>
                  {items
                    .filter((item) => item.isFeatured && item.isAvailable)
                    .slice(0, 4)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => chooseItem(item)}
                        className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-start text-xs hover:border-secondary/40 hover:bg-secondary/5"
                      >
                        <span className="truncate font-medium">{item.name}</span>
                        <span className="numeric shrink-0 font-semibold">{formatMoney(itemPrice(item))}</span>
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <Coffee className="h-7 w-7" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{selected.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {menuKindLabel(selected.kind)} · {t('pos.prepTime', { minutes: selected.prepMinutes })}
                  </p>
                  {selected.description ? (
                    <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                      {selected.description}
                    </p>
                  ) : null}
                </div>
              </div>

              {selected.hasSizes ? (
                <div className="space-y-2">
                  <p className="th-label">{t('pos.chooseSize')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.sizes.map((size) => (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => setSizeId(size.id)}
                        className={cn(
                          'rounded-lg border p-2.5 text-start transition-colors',
                          sizeId === size.id
                            ? 'border-secondary bg-secondary/5 ring-1 ring-secondary/30'
                            : 'border-border hover:border-secondary/40',
                        )}
                      >
                        <span className="block text-xs font-semibold">{size.name}</span>
                        <span className="numeric mt-0.5 block text-sm font-bold">
                          {formatMoney(size.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {toppings.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="th-label">{t('pos.toppings.title')}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {t('pos.toppings.selected', { count: formatNumber(toppingIds.length) })}
                    </span>
                  </div>
                  <div className="max-h-56 space-y-1 overflow-y-auto pe-1">
                    {toppings.map((topping) => {
                      const active = toppingIds.includes(topping.id);
                      return (
                        <button
                          key={topping.id}
                          type="button"
                          onClick={() => toggleTopping(topping)}
                          disabled={!topping.isAvailable}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-start text-xs transition-colors disabled:opacity-40',
                            active
                              ? 'border-secondary/50 bg-secondary/5'
                              : 'border-border hover:bg-muted/50',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                              active ? 'border-secondary bg-secondary text-white' : 'border-input',
                            )}
                          >
                            {active ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium">{topping.name}</span>
                          <span className="numeric shrink-0 text-muted-foreground">
                            +{formatMoney(topping.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="th-label">{t('pos.quantity')}</p>
                  <div className="mt-1.5 inline-flex items-center rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.max(current - 1, 1))}
                      className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40"
                      disabled={quantity <= 1}
                      aria-label={t('pos.decreaseQuantity')}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="numeric w-9 text-center text-sm font-bold">{formatNumber(quantity)}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.min(current + 1, 99))}
                      className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted"
                      aria-label={t('pos.increaseQuantity')}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-end">
                  <p className="th-label">{t('pos.lineTotal')}</p>
                  <p className="numeric mt-1 text-lg font-bold">{formatMoney(customizeTotal)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="special-instructions">{t('pos.kitchenNotes')}</Label>
                <Textarea
                  id="special-instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder={t('pos.kitchenNotesPlaceholder')}
                  maxLength={300}
                  className="min-h-[64px]"
                />
              </div>

              <Button className="w-full" size="lg" onClick={addToCart}>
                <ShoppingBag className="h-4 w-4" />
                {editingKey ? t('pos.saveChanges') : t('pos.addToCart')} · {formatMoney(customizeTotal)}
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{t('pos.currentOrder')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('pos.orderSummary', {
                count: formatNumber(cart.reduce((sum, line) => sum + line.quantity, 0)),
                type: orderTypeLabel(orderType),
              })}
            </p>
          </div>
          {cart.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCart([])}
              className="text-xs text-muted-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('pos.clear')}
            </Button>
          ) : null}
        </header>

        <div className="flex gap-1 border-b border-border p-2">
          {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as OrderType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOrderType(type)}
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors',
                orderType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {orderTypeLabel(type)}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-3 border-b border-border p-3">
            {orderType === 'DINE_IN' ? (
              <div className="flex items-center gap-2">
                <Label htmlFor="table-number" className="w-16 shrink-0 text-xs text-muted-foreground">
                  {t('pos.table')}
                </Label>
                <Input
                  id="table-number"
                  value={tableNumber}
                  onChange={(event) => setTableNumber(event.target.value)}
                  placeholder={t('pos.tablePlaceholder')}
                  maxLength={20}
                  className="h-8"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('pos.guest.title')}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setCustomerOpen(true)}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium text-secondary hover:bg-secondary/10"
                >
                  <UserRound className="h-3 w-3" /> {t('pos.guest.saved')}
                </button>
                {customer.id || customer.name ? (
                  <button
                    type="button"
                    onClick={() => setCustomer(EMPTY_CUSTOMER)}
                    className="rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                  >
                    {t('pos.guest.clear')}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={customer.name}
                onChange={(event) => setCustomer((current) => ({ ...current, id: null, name: event.target.value }))}
                placeholder={t('pos.guest.name')}
                aria-label={t('pos.guest.name')}
                className="h-8"
              />
              <Input
                value={customer.phone}
                onChange={(event) => setCustomer((current) => ({ ...current, id: null, phone: event.target.value }))}
                placeholder={t('pos.guest.phone')}
                aria-label={t('pos.guest.phone')}
                className="h-8"
                dir="ltr"
              />
            </div>
            {orderType === 'DELIVERY' ? (
              <Input
                value={customer.address}
                onChange={(event) => setCustomer((current) => ({ ...current, id: null, address: event.target.value }))}
                placeholder={t('pos.guest.address')}
                aria-label={t('pos.guest.address')}
                className="h-8"
              />
            ) : null}
          </div>

          <div className="divide-y divide-border">
            {cart.length === 0 ? (
              <EmptyPanel
                title={t('pos.cartEmpty.title')}
                message={t('pos.cartEmpty.message')}
              />
            ) : (
              cart.map((line) => (
                <div key={line.key} className="px-3 py-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {line.name}
                        {line.sizeName ? (
                          <span className="ms-1 text-[11px] font-normal text-muted-foreground">
                            · {line.sizeName}
                          </span>
                        ) : null}
                      </p>
                      {line.toppings.length > 0 ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                          + {line.toppings.map((topping) => topping.name).join(', ')}
                        </p>
                      ) : null}
                      {line.specialInstructions ? (
                        <p className="mt-0.5 line-clamp-1 text-[11px] italic text-muted-foreground">
                          “{line.specialInstructions}”
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="inline-flex items-center rounded-md border border-border">
                          <button
                            type="button"
                            onClick={() => changeQuantity(line.key, -1)}
                            className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40"
                            disabled={line.quantity <= 1}
                            aria-label={t('pos.line.decrease', { name: line.name })}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="numeric w-6 text-center text-[11px] font-bold">
                            {formatNumber(line.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(line.key, 1)}
                            className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:bg-muted"
                            aria-label={t('pos.line.increase', { name: line.name })}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => editLine(line)}
                          className="text-[11px] font-medium text-secondary hover:underline"
                        >
                          {t('pos.line.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          className="text-[11px] font-medium text-muted-foreground hover:text-destructive"
                        >
                          {t('pos.line.remove')}
                        </button>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="numeric text-sm font-bold">{formatMoney(lineTotal(line))}</p>
                      <p className="numeric text-[10px] text-muted-foreground">
                        {t('pos.line.each', { price: formatMoney(lineUnitPrice(line)) })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 border-t border-border p-3">
            <div className="flex items-center gap-2">
              <BadgePercent className="h-3.5 w-3.5 text-muted-foreground" />
              <Select
                value={discountId}
                onChange={(event) => setDiscountId(event.target.value)}
                aria-label={t('pos.summary.discount')}
                className="h-8 flex-1 text-xs"
              >
                <option value="">{t('pos.discount.none')}</option>
                {discounts.map((discount: DiscountDto) => (
                  <option key={discount.id} value={discount.id}>
                    {discount.name} ·{' '}
                    {discount.type === 'PERCENT'
                      ? `${formatDecimal(Number(discount.value))}%`
                      : formatMoney(discount.value)}
                  </option>
                ))}
              </Select>
            </div>
            {!isAdmin ? (
              <p className={cn('text-[10px]', overCashierCap ? 'text-destructive' : 'text-muted-foreground')}>
                {t('pos.discount.limit', {
                  percent: formatDecimal(capPct, 0),
                  amount: formatMoney(fromMinor(capMinor)),
                })}
              </p>
            ) : null}
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t('pos.orderNotes')}
              aria-label={t('pos.orderNotes')}
              maxLength={600}
              className="min-h-[50px] text-xs"
            />
          </div>
        </div>

        <div className="border-t border-border bg-muted/30 p-3">
          <div className="space-y-1 text-xs">
            <SummaryRow label={t('pos.summary.subtotal')} value={formatMoney(fromMinor(subtotalMinor))} />
            {discountMinor > 0 ? (
              <SummaryRow
                label={`${t('pos.summary.discount')}${selectedDiscount ? ` · ${selectedDiscount.name}` : ''}`}
                value={`−${formatMoney(fromMinor(discountMinor))}`}
                tone="success"
              />
            ) : null}
            <SummaryRow
              label={t('pos.summary.tax', { rate: formatDecimal(taxRate, 2) })}
              value={formatMoney(fromMinor(taxMinor))}
            />
            {deliveryMinor > 0 ? (
              <SummaryRow label={t('pos.summary.delivery')} value={formatMoney(fromMinor(deliveryMinor))} />
            ) : null}
            <div className="flex items-center justify-between border-t border-border pt-1.5 text-base font-bold">
              <span>{t('pos.summary.total')}</span>
              <span className="numeric">{formatMoney(fromMinor(totalMinor))}</span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {paymentLines.map((line, index) => {
              const usedByOthers = new Set(
                paymentLines.filter((entry) => entry.key !== line.key).map((entry) => entry.method),
              );
              const otherMinor = paymentLines
                .filter((entry) => entry.key !== line.key)
                .reduce((sum, entry) => sum + money(Number(entry.amount || '0')), 0);
              const exactMinor = Math.max(totalMinor - otherMinor, 0);
              return (
                <div
                  key={line.key}
                  className="space-y-1.5 rounded-lg border border-border bg-card p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {t('pos.payment.line', { number: formatNumber(index + 1) })}
                    </span>
                    {paymentLines.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removePaymentLine(line.key)}
                        aria-label={t('pos.payment.remove')}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-ring"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    {PAYMENT_METHODS.map((method) => {
                      const active = line.method === method;
                      const blocked = !active && usedByOthers.has(method);
                      return (
                        <button
                          key={method}
                          type="button"
                          aria-pressed={active}
                          disabled={blocked}
                          onClick={() => changePaymentMethod(line.key, method)}
                          className={cn(
                            'rounded-md border px-2 py-1.5 text-[11px] font-semibold transition-colors',
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-muted-foreground hover:bg-muted',
                            blocked && 'cursor-not-allowed opacity-40 hover:bg-card',
                          )}
                        >
                          {paymentMethodLabel(method)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`payment-amount-${line.key}`}
                      className="min-w-20 shrink-0 text-[11px] text-muted-foreground"
                    >
                      {line.method === 'CASH' ? t('pos.payment.cashReceived') : t('pos.payment.amount')}
                    </Label>
                    <Input
                      id={`payment-amount-${line.key}`}
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={line.amount}
                      onChange={(event) => updatePaymentLine(line.key, { amount: event.target.value })}
                      placeholder={fromMinor(exactMinor)}
                      className="h-8 text-end font-semibold"
                      dir="ltr"
                    />
                  </div>

                  {line.method === 'CASH' ? (
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => updatePaymentLine(line.key, { amount: fromMinor(exactMinor) })}
                        className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted"
                      >
                        {t('pos.payment.exact')}
                      </button>
                      {[100, 200, 500, 1000].map((note) => (
                        <button
                          key={note}
                          type="button"
                          onClick={() => updatePaymentLine(line.key, { amount: note.toFixed(2) })}
                          className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted"
                        >
                          {formatMoneyShort(note)}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`payment-reference-${line.key}`}
                      className="min-w-20 shrink-0 text-[11px] text-muted-foreground"
                    >
                      {t('pos.payment.reference')}
                    </Label>
                    <Input
                      id={`payment-reference-${line.key}`}
                      value={line.reference}
                      onChange={(event) =>
                        updatePaymentLine(line.key, { reference: event.target.value })
                      }
                      placeholder={t('pos.payment.referencePlaceholder')}
                      maxLength={60}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPaymentLine}
                disabled={paymentLines.length >= PAYMENT_METHODS.length}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('pos.payment.add')}
              </Button>
              {paymentSummary.remainingMinor > 0 ? (
                <span className="numeric text-[11px] text-muted-foreground">
                  {t('pos.payment.remaining', {
                    amount: formatMoney(fromMinor(paymentSummary.remainingMinor)),
                  })}
                </span>
              ) : paymentSummary.changeMinor > 0 ? (
                <span className="numeric text-[11px] font-semibold text-success">
                  {t('pos.payment.changeDue')}: {formatMoney(fromMinor(paymentSummary.changeMinor))}
                </span>
              ) : null}
            </div>

            {paymentSummary.cashShort ? (
              <p className="text-[10px] font-medium text-destructive">{t('pos.payment.shortfall')}</p>
            ) : null}
          </div>

          {validationError && cart.length > 0 ? (
            <p className="mt-2 text-[11px] font-medium text-destructive">{validationError}</p>
          ) : null}

          <Button
            className="mt-3 w-full"
            size="lg"
            onClick={placeOrder}
            disabled={createOrder.isPending || cart.length === 0}
          >
            {createOrder.isPending ? (
              <>
                <Spinner className="border-white/40 border-t-white" /> {t('pos.placing')}
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                {t('pos.charge', { amount: formatMoney(fromMinor(totalMinor)) })}
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            {t('pos.viewKitchen')} <ChevronRight className="h-3 w-3 rtl:-scale-x-100" />
          </button>
        </div>
      </section>

      <Dialog
        open={customerOpen}
        onOpenChange={(open) => {
          setCustomerOpen(open);
          if (!open) setCustomerQuery('');
        }}
      >
        <DialogContent
          title={t('pos.guests.title')}
          description={t('pos.guests.description')}
          className="max-w-lg"
        >
          <Input
            autoFocus
            value={customerQuery}
            onChange={(event) => setCustomerQuery(event.target.value)}
            placeholder={t('pos.guests.search')}
          />
          <div className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {customersQuery.isLoading ? (
              <div className="space-y-1 p-2" aria-busy="true" aria-label={t('pos.guests.loading')}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 px-1 py-2">
                    <Skeleton radius="full" className="h-8 w-8 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                    <Skeleton className="h-4 w-4" />
                  </div>
                ))}
              </div>
            ) : customersQuery.isError ? (
              <p className="p-4 text-sm text-destructive">{t('pos.guests.loadError')}</p>
            ) : (customersQuery.data?.items.length ?? 0) === 0 ? (
              <EmptyPanel
                title={t('pos.guests.emptyTitle')}
                message={t('pos.guests.emptyMessage')}
              />
            ) : (
              customersQuery.data!.items.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => chooseCustomer(row)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-start hover:bg-muted/50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-[11px] font-bold text-secondary">
                    {row.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.phone ?? t('pos.guests.noPhone')} · {t('pos.guests.ordersCount', { count: row.ordersCount })}
                    </p>
                  </div>
                  <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground rtl:-scale-x-100" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PaymentSuccessDialog
        open={successOpen}
        onOpenChange={setSuccessOpen}
        order={lastOrder}
        onViewReceipt={() => setInvoiceOpen(true)}
      />

      <InvoiceViewer
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        order={lastOrder}
        invoiceNumber={lastOrder?.invoice?.invoiceNumber ?? null}
      />
    </div>
  );
}

function CategoryChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
      )}
    >
      {label}
      <span className={cn('numeric text-[10px]', active ? 'opacity-70' : 'text-muted-foreground/70')}>
        {formatNumber(count)}
      </span>
    </button>
  );
}

function ProductCard({
  item,
  active,
  onClick,
}: {
  item: MenuItemDto;
  active: boolean;
  onClick: () => void;
}): ReactElement {
  const { t } = useI18n();
  const image = resolveImageUrl(item.imageUrl);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!item.isAvailable}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-card text-start transition-all',
        active
          ? 'border-secondary ring-2 ring-secondary/20'
          : 'border-border hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-card',
        !item.isAvailable && 'opacity-55',
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-accent">
            <Coffee className="h-7 w-7 text-secondary/40" />
          </div>
        )}
        {item.isFeatured ? (
          <span className="absolute start-1.5 top-1.5 rounded-full bg-brand-orange px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
            {t('pos.product.featured')}
          </span>
        ) : null}
        {!item.isAvailable ? (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/80 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-white">
            {t('pos.product.soldOut')}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug">{item.name}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{menuKindLabel(item.kind)}</p>
        <div className="mt-auto flex items-baseline justify-between gap-1 pt-1.5">
          <span className="numeric text-[12px] font-bold">
            {item.hasSizes
              ? t('pos.product.from', { price: formatMoney(itemPrice(item)) })
              : formatMoney(item.basePrice)}
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary/10 text-secondary opacity-0 transition-opacity group-hover:opacity-100">
            <Plus className="h-3 w-3" />
          </span>
        </div>
      </div>
    </button>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success';
}): ReactElement {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('numeric font-medium', tone === 'success' && 'text-success')}>{value}</span>
    </div>
  );
}
