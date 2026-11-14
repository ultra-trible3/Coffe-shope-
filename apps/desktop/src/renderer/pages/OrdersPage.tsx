import { useQuery } from '@tanstack/react-query';
import { Eye, Filter, RotateCcw, Search, X } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import {
  ORDER_STATUSES,
  ORDER_TYPES,
  type OrderDto,
  type OrderStatus,
  type OrderType,
} from '@pharmacy/shared';
import { OrderDetailDialog } from '../components/orders/OrderDetailDialog';
import { Button } from '../components/ui/button';
import { Input, Select } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Pagination } from '../components/ui/pagination';
import { EmptyPanel, ErrorState } from '../components/ui/states';
import { Skeleton, SkeletonTable, type SkeletonColumn } from '../components/ui/skeleton';
import { OrderStatusBadge, PaymentBadge } from '../components/ui/status-badge';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import {
  formatDateTime,
  formatDecimal,
  formatMoney,
  orderStatusLabel,
  orderTypeLabel,
} from '../lib/format';
import { useAuthStore } from '../store/auth';

const PAGE_SIZE = 20;

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function OrdersPage(): ReactElement {
  const { t } = useI18n();
  const isAdmin = useAuthStore((state) => state.user?.role === 'ADMIN');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [type, setType] = useState<OrderType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cashierId, setCashierId] = useState('');
  const [today, setToday] = useState(false);
  const [selected, setSelected] = useState<OrderDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, type, from, to, cashierId, today]);

  const users = useQuery({
    queryKey: ['users', 'filter-options'],
    queryFn: () => api.users.list({ page: 1, pageSize: 100 }),
    enabled: isAdmin,
    staleTime: 120_000,
  });
  const cashierOptions = (users.data?.items ?? []).filter(
    (user) => user.role !== 'KITCHEN_STAFF',
  );

  const orders = useQuery({
    queryKey: ['orders', 'list', { page, debouncedSearch, status, type, from, to, cashierId, today }],
    queryFn: () =>
      api.orders.list({
        page,
        pageSize: PAGE_SIZE,
        q: debouncedSearch || undefined,
        status: status || undefined,
        type: type || undefined,
        from: from || undefined,
        to: to || undefined,
        cashierId: cashierId || undefined,
        today: today || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const reset = (): void => {
    setSearch('');
    setStatus('');
    setType('');
    setFrom('');
    setTo('');
    setCashierId('');
    setToday(false);
  };

  const activeFilters =
    Boolean(search) || Boolean(status) || Boolean(type) || Boolean(from) || Boolean(to) || Boolean(cashierId) || today;

  const orderSkeletonColumns: SkeletonColumn[] = [
    { kind: 'double', label: t('orders.list.columns.order') },
    { kind: 'double', label: t('orders.list.columns.guest') },
    { kind: 'text', label: t('orders.list.columns.service') },
    { kind: 'short', label: t('orders.list.columns.items') },
    ...(isAdmin
      ? ([{ kind: 'muted', label: t('orders.list.columns.cashier') }] as SkeletonColumn[])
      : []),
    { kind: 'badge', label: t('orders.list.columns.status') },
    { kind: 'badge', label: t('orders.list.columns.payment') },
    { kind: 'amount', label: t('orders.list.columns.total') },
    { kind: 'muted', label: t('orders.list.columns.placed') },
    { kind: 'actions' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('orders.list.searchPlaceholder')}
              className="h-9 ps-9"
              aria-label={t('orders.list.searchAria')}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label={t('orders.list.clearSearch')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <Select
            aria-label={t('orders.list.statusAria')}
            className="h-9 w-[140px]"
            value={status}
            onChange={(event) => setStatus(event.target.value as OrderStatus | '')}
          >
            <option value="">{t('orders.list.allStatuses')}</option>
            {ORDER_STATUSES.map((option) => (
              <option key={option} value={option}>
                {orderStatusLabel(option)}
              </option>
            ))}
          </Select>

          <Select
            aria-label={t('orders.list.typeAria')}
            className="h-9 w-[128px]"
            value={type}
            onChange={(event) => setType(event.target.value as OrderType | '')}
          >
            <option value="">{t('orders.list.allTypes')}</option>
            {ORDER_TYPES.map((option) => (
              <option key={option} value={option}>
                {orderTypeLabel(option)}
              </option>
            ))}
          </Select>

          {isAdmin ? (
            <Select
              aria-label={t('orders.list.cashierAria')}
              className="h-9 w-[160px]"
              value={cashierId}
              onChange={(event) => setCashierId(event.target.value)}
            >
              <option value="">{t('orders.list.allCashiers')}</option>
              {cashierOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </Select>
          ) : null}

          <Button
            variant={today ? 'default' : 'outline'}
            size="sm"
            onClick={() => setToday((current) => !current)}
          >
            {t('orders.list.today')}
          </Button>

          {activeFilters ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t('orders.list.reset')}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-2 border-b border-border px-3 py-2">
          <Filter className="mb-2 h-3.5 w-3.5 text-muted-foreground" />
          <div className="space-y-1">
            <Label htmlFor="orders-from" className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('orders.list.from')}
            </Label>
            <Input
              id="orders-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-8 w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="orders-to" className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('orders.list.to')}
            </Label>
            <Input
              id="orders-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-8 w-[150px]"
            />
          </div>
          {orders.data ? (
            <span className="mb-1.5 ms-auto text-xs text-muted-foreground">
              {t('orders.list.count', { count: formatDecimal(orders.data.total, 0) })}
            </span>
          ) : (
            <Skeleton className="mb-1.5 ms-auto h-3 w-16" />
          )}
        </div>

        {orders.isLoading ? (
          <SkeletonTable label={t('orders.list.loading')} rows={8} columns={orderSkeletonColumns} />
        ) : orders.isError ? (
          <div className="p-4">
            <ErrorState
              title={t('orders.list.error')}
              message={orders.error instanceof Error ? orders.error.message : undefined}
              onRetry={() => void orders.refetch()}
            />
          </div>
        ) : orders.data && orders.data.items.length === 0 ? (
          <EmptyPanel
            title={t('orders.list.empty')}
            message={t('orders.list.emptyMessage')}
            action={
              activeFilters ? (
                <Button variant="outline" size="sm" onClick={reset}>
                  {t('orders.list.clearFilters')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-semibold">{t('orders.list.columns.order')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('orders.list.columns.guest')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('orders.list.columns.service')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('orders.list.columns.items')}</th>
                  {isAdmin ? (
                    <th className="px-3 py-2.5 font-semibold">{t('orders.list.columns.cashier')}</th>
                  ) : null}
                  <th className="px-3 py-2.5 font-semibold">{t('orders.list.columns.status')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('orders.list.columns.payment')}</th>
                  <th className="px-3 py-2.5 text-end font-semibold">{t('orders.list.columns.total')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('orders.list.columns.placed')}</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {orders.data!.items.map((order) => (
                  <tr
                    key={order.id}
                    className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-muted/40"
                    onClick={() => {
                      setSelected(order);
                      setDetailOpen(true);
                    }}
                  >
                    <td className="px-3 py-2.5">
                      <p className="numeric font-semibold">{order.orderNumber}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {order.invoice?.invoiceNumber ?? t('orders.list.noInvoice')}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="max-w-[160px] truncate">
                        {order.customerName ?? t('orders.list.walkIn')}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {order.customerPhone ?? '—'}
                        {order.tableNumber
                          ? t('orders.list.table', { number: order.tableNumber })
                          : ''}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{orderTypeLabel(order.type)}</td>
                    <td className="numeric px-3 py-2.5 text-xs">
                      {formatDecimal(
                        order.items.reduce((sum, item) => sum + item.quantity, 0),
                        0,
                      )}
                    </td>
                    {isAdmin ? (
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{order.cashierName}</td>
                    ) : null}
                    <td className="px-3 py-2.5">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <PaymentBadge status={order.paymentStatus} />
                    </td>
                    <td className="numeric px-3 py-2.5 text-end font-semibold">
                      {formatMoney(order.total)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(order);
                          setDetailOpen(true);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t('orders.list.view')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {orders.data && orders.data.total > 0 ? (
          <Pagination
            page={orders.data.page}
            pageSize={orders.data.pageSize}
            total={orders.data.total}
            totalPages={orders.data.totalPages}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      {!isAdmin ? (
        <p className="text-[11px] text-muted-foreground">{t('orders.list.cashierNote')}</p>
      ) : null}

      <OrderDetailDialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelected(null);
        }}
        order={selected}
        onChanged={(updated) => setSelected(updated)}
      />
    </div>
  );
}
