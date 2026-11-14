import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Banknote,
  Clock3,
  Coffee,
  RefreshCw,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useMemo, useState, type ReactElement } from 'react';
import type { OrderDto, PaymentMethod } from '@pharmacy/shared';
import { AreaChart } from '../components/charts/AreaChart';
import { DonutChart } from '../components/charts/DonutChart';
import { OrderDetailDialog } from '../components/orders/OrderDetailDialog';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/input';
import { StatCard } from '../components/ui/stat-card';
import { EmptyPanel, ErrorState } from '../components/ui/states';
import { Skeleton } from '../components/ui/skeleton';
import { DashboardSkeleton } from '../components/skeletons/DashboardSkeleton';
import { OrderStatusBadge } from '../components/ui/status-badge';
import { useI18n, type TranslationKey } from '../i18n';
import { api } from '../lib/api';
import { resolveImageUrl } from '../lib/images';
import {
  auditActionLabel,
  formatDateTime,
  formatDecimal,
  formatMoney,
  formatMoneyShort,
  formatNumber,
  formatTime,
  orderTypeLabel,
  paymentMethodLabel,
  unitLabel,
} from '../lib/format';
import type { PageKey } from '../components/layout/AppShell';
import { cn } from '../lib/utils';

type Metric = 'revenue' | 'orders' | 'profit';

const METRIC_LABELS: Record<Metric, TranslationKey> = {
  revenue: 'dashboard.metrics.revenue',
  orders: 'dashboard.metrics.orders',
  profit: 'dashboard.metrics.profit',
};

const RANGES: Array<{ days: number; labelKey: TranslationKey }> = [
  { days: 7, labelKey: 'dashboard.ranges.7' },
  { days: 14, labelKey: 'dashboard.ranges.14' },
  { days: 30, labelKey: 'dashboard.ranges.30' },
  { days: 90, labelKey: 'dashboard.ranges.90' },
];

const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  CASH: '#A9682F',
  CARD: '#4A3326',
  WALLET: '#D9A05B',
};

function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactElement;
  children: ReactElement;
  className?: string;
}): ReactElement {
  return (
    <section className={cn('flex min-w-0 flex-col rounded-xl border border-border bg-card shadow-sm', className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function DashboardPage({ onNavigate }: { onNavigate: (page: PageKey) => void }): ReactElement {
  const { t } = useI18n();
  const [days, setDays] = useState(14);
  const [metric, setMetric] = useState<Metric>('revenue');
  const [selected, setSelected] = useState<OrderDto | null>(null);

  const dashboard = useQuery({
    queryKey: ['dashboard', days],
    queryFn: () => api.reports.dashboard(days),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const activity = useQuery({
    queryKey: ['audit', 'dashboard'],
    queryFn: () => api.audit.list({ page: 1, pageSize: 8 }),
    staleTime: 60_000,
  });

  const data = dashboard.data;
  const series = useMemo(() => {
    if (!data) return [];
    return data.revenueSeries.map((point) => ({ label: point.label, value: point[metric] }));
  }, [data, metric]);

  const seriesTotal = useMemo(() => series.reduce((sum, point) => sum + point.value, 0), [series]);
  const formatSeries = (value: number): string =>
    metric === 'orders' ? formatNumber(Math.round(value)) : formatMoneyShort(value);

  const donutSlices = useMemo(() => {
    if (!data) return [];
    return data.paymentDistribution.map((row) => ({
      label: paymentMethodLabel(row.method),
      value: row.amount ? Number(row.amount) : 0,
      color: PAYMENT_COLORS[row.method] ?? '#8C6A4A',
    }));
  }, [data]);

  const maxCategory = useMemo(() => {
    if (!data) return 1;
    return Math.max(...data.salesByCategory.map((row) => Number(row.revenue)), 1);
  }, [data]);

  if (dashboard.isLoading) {
    return <DashboardSkeleton />;
  }

  if (dashboard.isError || !data) {
    return (
      <ErrorState
        title={t('dashboard.error.title')}
        message={
          dashboard.error instanceof Error ? dashboard.error.message : t('dashboard.error.message')
        }
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  const overview = data.overview;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('dashboard.title')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.subtitle', { time: formatTime(data.generatedAt) })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label={t('dashboard.rangeAria')}
            className="h-9 w-[150px]"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            {RANGES.map((range) => (
              <option key={range.days} value={range.days}>
                {t(range.labelKey)}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void dashboard.refetch()}
            aria-label={t('dashboard.refreshAria')}
            title={t('dashboard.refresh')}
          >
            <RefreshCw className={cn('h-4 w-4', dashboard.isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('dashboard.stats.todayRevenue')}
          value={formatMoney(overview.todayRevenue)}
          icon={<Banknote className="h-4 w-4" />}
          change={overview.revenueChangePct}
          tone="red"
          changeLabel={t('dashboard.stats.vsYesterday')}
        />
        <StatCard
          label={t('dashboard.stats.ordersToday')}
          value={formatNumber(overview.todayOrders)}
          icon={<ReceiptText className="h-4 w-4" />}
          hint={t('dashboard.stats.paidOrders')}
          tone="orange"
        />
        <StatCard
          label={t('dashboard.stats.averageOrder')}
          value={formatMoney(overview.averageOrderValue)}
          icon={<TrendingUp className="h-4 w-4" />}
          hint={t('dashboard.stats.basketSize')}
          tone="green"
        />
        <StatCard
          label={t('dashboard.stats.todayProfit')}
          value={formatMoney(overview.todayProfit)}
          icon={<Wallet className="h-4 w-4" />}
          hint={t('dashboard.stats.afterCost')}
          tone="amber"
        />
        <StatCard
          label={t('dashboard.stats.activeItems')}
          value={`${formatNumber(overview.activeProducts)} / ${formatNumber(overview.totalProducts)}`}
          icon={<Coffee className="h-4 w-4" />}
          hint={t('dashboard.stats.available')}
          tone="red"
        />
        <StatCard
          label={t('dashboard.stats.customers')}
          value={formatNumber(overview.totalCustomers)}
          icon={<Users className="h-4 w-4" />}
          hint={t('dashboard.stats.savedGuests')}
          tone="neutral"
        />
        <StatCard
          label={t('dashboard.stats.openOrders')}
          value={formatNumber(overview.pendingOrders)}
          icon={<Clock3 className="h-4 w-4" />}
          hint={t('dashboard.stats.waitingKitchen')}
          tone="orange"
        />
        <StatCard
          label={t('dashboard.stats.lowStock')}
          value={formatNumber(overview.lowStockIngredients)}
          icon={<AlertTriangle className="h-4 w-4" />}
          hint={t('dashboard.stats.lowStockHint')}
          tone="amber"
          className={overview.lowStockIngredients > 0 ? 'border-warning/40' : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title={t('dashboard.trend.title', { metric: t(METRIC_LABELS[metric]) })}
          description={t('dashboard.trend.subtitle', {
            days: formatNumber(days),
            total:
              metric === 'orders'
                ? t('dashboard.trend.ordersCount', { count: formatNumber(seriesTotal) })
                : formatMoney(seriesTotal),
          })}
          className="xl:col-span-2"
          action={
            <div className="inline-flex rounded-lg border border-border bg-muted p-1">
              {(['revenue', 'orders', 'profit'] as Metric[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMetric(option)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors',
                    metric === option ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {t(METRIC_LABELS[option])}
                </button>
              ))}
            </div>
          }
        >
          <div className="p-3 pb-1">
            <AreaChart
              data={series}
              formatValue={formatSeries}
              color={metric === 'profit' ? '#5F6B4A' : metric === 'orders' ? '#2F2A26' : '#A9682F'}
            />
          </div>
        </Panel>

        <Panel title={t('dashboard.paymentMix.title')} description={t('dashboard.paymentMix.description')}>
          <div className="flex flex-col items-center gap-4 p-4">
            <DonutChart
              slices={donutSlices}
              centerValue={formatMoneyShort(
                data.paymentDistribution.reduce((sum, row) => sum + Number(row.amount), 0),
              )}
              centerLabel={t('dashboard.paymentMix.collected')}
            />
            <div className="w-full space-y-2">
              {data.paymentDistribution.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  {t('dashboard.paymentMix.noPayments')}
                </p>
              ) : (
                data.paymentDistribution.map((row) => (
                  <div key={row.method} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: PAYMENT_COLORS[row.method] ?? '#8C6A4A' }}
                    />
                    <span className="font-medium">{paymentMethodLabel(row.method)}</span>
                    <span className="numeric ms-auto text-muted-foreground">
                      {t('dashboard.paymentMix.orders', { count: formatNumber(row.count) })}
                    </span>
                    <span className="numeric w-10 text-end font-semibold">
                      {formatDecimal(row.percent, 1)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title={t('dashboard.category.title')} description={t('dashboard.category.description')}>
          <div className="space-y-3 p-4">
            {data.salesByCategory.length === 0 ? (
              <EmptyPanel title={t('dashboard.category.empty')} />
            ) : (
              data.salesByCategory.slice(0, 8).map((row, index) => {
                const width = Math.max((Number(row.revenue) / maxCategory) * 100, 2);
                return (
                  <div key={row.categoryId}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium">{row.name}</span>
                      <span className="numeric text-muted-foreground">
                        {t('dashboard.category.row', {
                          orders: formatNumber(row.orders),
                          revenue: formatMoney(row.revenue),
                        })}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${width}%`,
                          background: index === 0 ? '#A9682F' : index === 1 ? '#4A3326' : '#8C6A4A',
                          opacity: index > 1 ? 0.55 + index * 0.04 : 1,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        <Panel title={t('dashboard.bestSellers.title')} description={t('dashboard.bestSellers.description')}>
          <div className="divide-y divide-border">
            {data.bestSellers.length === 0 ? (
              <EmptyPanel title={t('dashboard.bestSellers.empty')} />
            ) : (
              data.bestSellers.slice(0, 6).map((row, index) => (
                <div key={row.menuItemId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="numeric flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-bold text-muted-foreground">
                    {formatNumber(index + 1)}
                  </span>
                  {resolveImageUrl(row.imageUrl) ? (
                    <img
                      src={resolveImageUrl(row.imageUrl)!}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                      <Coffee className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.categoryName ?? t('dashboard.bestSellers.fallbackCategory')}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="numeric text-sm font-semibold">{formatMoney(row.revenue)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t('dashboard.bestSellers.sold', { count: formatNumber(row.units) })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title={t('dashboard.recent.title')}
          description={t('dashboard.recent.description')}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('orders')}>
              {t('dashboard.recent.viewAll')}
            </Button>
          }
        >
          <div className="overflow-x-auto">
            {data.recentOrders.length === 0 ? (
              <EmptyPanel
                title={t('dashboard.recent.empty')}
                message={t('dashboard.recent.emptyMessage')}
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">{t('dashboard.recent.columns.order')}</th>
                    <th className="px-2 py-2 font-semibold">{t('dashboard.recent.columns.type')}</th>
                    <th className="px-2 py-2 font-semibold">{t('dashboard.recent.columns.status')}</th>
                    <th className="px-2 py-2 text-end font-semibold">{t('dashboard.recent.columns.total')}</th>
                    <th className="px-4 py-2 text-end font-semibold">{t('dashboard.recent.columns.time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-muted/40"
                      onClick={() => setSelected(order)}
                    >
                      <td className="px-4 py-2.5">
                        <p className="numeric font-semibold">{order.orderNumber}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {order.customerName ?? order.cashierName}
                        </p>
                      </td>
                      <td className="px-2 py-2.5 text-xs text-muted-foreground">
                        {orderTypeLabel(order.type)}
                      </td>
                      <td className="px-2 py-2.5">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="numeric px-2 py-2.5 text-end font-semibold">
                        {formatMoney(order.total)}
                      </td>
                      <td className="numeric px-4 py-2.5 text-end text-xs text-muted-foreground">
                        {formatTime(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title={t('dashboard.lowStockAlerts.title')}
            description={t('dashboard.lowStockAlerts.description')}
          >
            <div className="divide-y divide-border">
              {data.lowStock.length === 0 ? (
                <EmptyPanel title={t('dashboard.lowStockAlerts.empty')} />
              ) : (
                data.lowStock.slice(0, 5).map((row) => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning-strong">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t('dashboard.lowStockAlerts.stockLine', {
                          current: formatDecimal(row.currentStock, 3),
                          minimum: formatDecimal(row.minStock, 3),
                          unit: unitLabel(row.unit),
                        })}
                      </p>
                    </div>
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                      {t('dashboard.lowStockAlerts.low')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel
            title={t('dashboard.activity.title')}
            description={t('dashboard.activity.description')}
          >
            <div className="divide-y divide-border">
              {activity.isLoading ? (
                <div
                  className="space-y-3 p-4"
                  aria-busy="true"
                  aria-label={t('dashboard.activity.loading')}
                >
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Skeleton radius="full" className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-2.5 w-3/4" />
                        <Skeleton className="h-2.5 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity.isError ? (
                <p className="p-4 text-xs text-muted-foreground">{t('dashboard.activity.unavailable')}</p>
              ) : (activity.data?.items.length ?? 0) === 0 ? (
                <EmptyPanel title={t('dashboard.activity.empty')} />
              ) : (
                activity.data!.items.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{auditActionLabel(entry.action)}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {entry.user?.fullName ?? t('dashboard.activity.system')} ·{' '}
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      <OrderDetailDialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        order={selected}
        onChanged={(updated) => setSelected(updated)}
      />

      <p className="text-[11px] text-muted-foreground">{t('dashboard.footer')}</p>
    </div>
  );
}
