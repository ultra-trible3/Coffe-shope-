import { useQuery } from '@tanstack/react-query';
import {
  CalendarRange,
  ChartColumnBig,
  Percent,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useMemo, useState, type ReactElement } from 'react';
import type { ReportDto } from '@pharmacy/shared';
import { AreaChart, type ChartPoint } from '../components/charts/AreaChart';
import { DonutChart, type DonutSlice } from '../components/charts/DonutChart';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input, Select } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { EmptyPanel, ErrorState } from '../components/ui/states';
import { ReportsSkeleton } from '../components/skeletons/ReportsSkeleton';
import { StatCard } from '../components/ui/stat-card';
import { useI18n, type TranslationKey } from '../i18n';
import { api } from '../lib/api';
import {
  formatCompact,
  formatDate,
  formatDecimal,
  formatMoney,
  formatMoneyShort,
  formatMonthKey,
  formatNumber,
  paymentMethodLabel,
  unitLabel,
  addDaysIso,
  todayIso,
} from '../lib/format';
import { cn } from '../lib/utils';

type Metric = 'revenue' | 'orders' | 'profit';
type Granularity = 'day' | 'month';

interface SeriesRow {
  label: string;
  revenue: number;
  orders: number;
  profit: number;
}

const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#A9682F',
  CARD: '#2F2A26',
  WALLET: '#D9A05B',
};

const METRIC_CONFIG: Record<Metric, { labelKey: TranslationKey; color: string; money: boolean }> = {
  revenue: { labelKey: 'reports.metrics.revenue', color: '#A9682F', money: true },
  orders: { labelKey: 'reports.metrics.orders', color: '#2F2A26', money: false },
  profit: { labelKey: 'reports.metrics.profit', color: '#5F6B4A', money: true },
};

function firstOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000,
  ) + 1;
}

function aggregateMonths(rows: ReportDto['daily']): SeriesRow[] {
  const buckets = new Map<string, { key: string; revenue: number; orders: number; profit: number }>();
  for (const row of rows) {
    const key = row.date.slice(0, 7);
    const bucket = buckets.get(key) ?? { key, revenue: 0, orders: 0, profit: 0 };
    bucket.revenue += row.revenue;
    bucket.orders += row.orders;
    bucket.profit += row.profit;
    buckets.set(key, bucket);
  }
  return [...buckets.values()].map((bucket) => ({
    label: formatMonthKey(bucket.key),
    revenue: bucket.revenue,
    orders: bucket.orders,
    profit: bucket.profit,
  }));
}

export function ReportsPage(): ReactElement {
  const { t } = useI18n();
  const today = todayIso();
  const initialFrom = addDaysIso(today, -29);

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(today);
  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftTo, setDraftTo] = useState(today);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [metric, setMetric] = useState<Metric>('revenue');

  const report = useQuery({
    queryKey: ['reports', 'sales', from, to],
    queryFn: () => api.reports.sales({ from, to }),
    placeholderData: (previous) => previous,
  });

  const presets = useMemo(() => {
    const monthStart = firstOfMonth(today);
    const lastMonthEnd = addDaysIso(monthStart, -1);
    return [
      { key: 'today', labelKey: 'reports.presets.today' as const, from: today, to: today },
      {
        key: 'week',
        labelKey: 'reports.presets.week' as const,
        from: addDaysIso(today, -6),
        to: today,
      },
      {
        key: 'month',
        labelKey: 'reports.presets.month' as const,
        from: monthStart,
        to: today,
      },
      {
        key: 'last-month',
        labelKey: 'reports.presets.lastMonth' as const,
        from: firstOfMonth(lastMonthEnd),
        to: lastMonthEnd,
      },
      {
        key: 'year',
        labelKey: 'reports.presets.year' as const,
        from: `${today.slice(0, 4)}-01-01`,
        to: today,
      },
    ];
  }, [today]);

  const applyPreset = (preset: (typeof presets)[number]): void => {
    setFrom(preset.from);
    setTo(preset.to);
    setDraftFrom(preset.from);
    setDraftTo(preset.to);
    setGranularity(daysBetween(preset.from, preset.to) > 62 ? 'month' : 'day');
  };

  const activePreset = presets.find((preset) => preset.from === from && preset.to === to);
  const rangeDays = daysBetween(from, to);
  const applyDisabled =
    !draftFrom || !draftTo || draftFrom > draftTo || (draftFrom === from && draftTo === to);

  const data = report.data;
  const summary = data?.summary;
  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (!data) return [];
    const rows: SeriesRow[] =
      granularity === 'month'
        ? aggregateMonths(data.daily)
        : data.daily.map((point) => ({
            label: point.label,
            revenue: point.revenue,
            orders: point.orders,
            profit: point.profit,
          }));
    return rows.map((row) => ({ label: row.label, value: row[metric] }));
  }, [data, granularity, metric]);

  const paymentSlices = useMemo<DonutSlice[]>(
    () =>
      (data?.payments ?? []).map((row) => ({
        label: paymentMethodLabel(row.method),
        value: Number(row.amount),
        color: PAYMENT_COLORS[row.method] ?? '#8C6A4A',
      })),
    [data],
  );

  const paymentTotal = (data?.payments ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  const maxCategoryRevenue = Math.max(
    ...(data?.byCategory ?? []).map((row) => Number(row.revenue)),
    0,
  );
  const maxSellerUnits = Math.max(...(data?.bestSellers ?? []).map((row) => row.units), 0);
  const totalConsumptionCost = (data?.inventoryConsumption ?? []).reduce(
    (sum, row) => sum + Number(row.cost),
    0,
  );
  const totalTypeOrders = (data?.ordersByType ?? []).reduce((sum, row) => sum + row.orders, 0);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <Button
                key={preset.key}
                size="sm"
                variant={activePreset?.key === preset.key ? 'default' : 'outline'}
                onClick={() => applyPreset(preset)}
              >
                {t(preset.labelKey)}
              </Button>
            ))}
          </div>
          <div className="ms-auto flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="report-from" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('reports.filters.from')}
              </Label>
              <Input
                id="report-from"
                type="date"
                value={draftFrom}
                max={draftTo || undefined}
                onChange={(event) => setDraftFrom(event.target.value)}
                className="h-8 w-[150px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="report-to" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('reports.filters.to')}
              </Label>
              <Input
                id="report-to"
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                onChange={(event) => setDraftTo(event.target.value)}
                className="h-8 w-[150px]"
              />
            </div>
            <Button
              size="sm"
              className="h-8"
              disabled={applyDisabled}
              onClick={() => {
                setFrom(draftFrom);
                setTo(draftTo);
                setGranularity(daysBetween(draftFrom, draftTo) > 62 ? 'month' : 'day');
              }}
            >
              {t('reports.filters.apply')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => void report.refetch()}
              disabled={report.isFetching}
              aria-label={t('reports.filters.refreshAria')}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', report.isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {formatDate(`${from}T12:00:00Z`)} — {formatDate(`${to}T12:00:00Z`)}
          </span>
          <span>·</span>
          <span>{t('reports.filters.rangeDays', { count: formatNumber(rangeDays) })}</span>
          {data ? (
            <span>
              · {t('reports.filters.generatedFrom', { count: formatNumber(data.summary.orders) })}
            </span>
          ) : null}
          <div className="ms-auto flex items-center gap-2">
            <Label htmlFor="report-granularity" className="text-[10px] uppercase tracking-wide">
              {t('reports.filters.trend')}
            </Label>
            <Select
              id="report-granularity"
              className="h-7 w-[110px] text-xs"
              value={granularity}
              onChange={(event) => setGranularity(event.target.value as Granularity)}
            >
              <option value="day">{t('reports.filters.daily')}</option>
              <option value="month">{t('reports.filters.monthly')}</option>
            </Select>
          </div>
        </div>
      </Card>

      {report.isError ? (
        <ErrorState
          title={t('reports.error.title')}
          message={report.error instanceof Error ? report.error.message : undefined}
          onRetry={() => void report.refetch()}
        />
      ) : report.isLoading && !data ? (
        <ReportsSkeleton />
      ) : data && summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t('reports.stats.revenue')}
              value={formatMoney(summary.revenue)}
              hint={t('reports.stats.revenueHint')}
              icon={<Wallet className="h-4 w-4" />}
              tone="red"
            />
            <StatCard
              label={t('reports.stats.paidOrders')}
              value={formatDecimal(summary.orders, 0)}
              hint={t('reports.stats.itemsSold', {
                count: formatDecimal(summary.itemsSold, 0),
              })}
              icon={<ReceiptText className="h-4 w-4" />}
              tone="neutral"
            />
            <StatCard
              label={t('reports.stats.netProfit')}
              value={formatMoney(summary.profit)}
              hint={
                summary.marginPct === null
                  ? t('reports.stats.recipeBasis')
                  : t('reports.stats.margin', {
                      percent: formatDecimal(summary.marginPct, 1),
                    })
              }
              icon={<PiggyBank className="h-4 w-4" />}
              tone="green"
            />
            <StatCard
              label={t('reports.stats.averageOrder')}
              value={formatMoney(summary.averageOrderValue)}
              hint={t('reports.stats.averageHint')}
              icon={<TrendingUp className="h-4 w-4" />}
              tone="orange"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>
                    {t('reports.trend.title', { metric: t(METRIC_CONFIG[metric].labelKey) })}
                  </CardTitle>
                  <CardDescription>
                    {t('reports.trend.description', {
                      granularity:
                        granularity === 'day'
                          ? t('reports.filters.daily')
                          : t('reports.filters.monthly'),
                    })}
                  </CardDescription>
                </div>
                <div className="flex gap-1 rounded-lg border border-border p-0.5">
                  {(Object.keys(METRIC_CONFIG) as Metric[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMetric(key)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                        metric === key
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {t(METRIC_CONFIG[key].labelKey)}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <AreaChart
                  data={chartPoints}
                  color={METRIC_CONFIG[metric].color}
                  formatValue={
                    METRIC_CONFIG[metric].money
                      ? formatCompact
                      : (value) => formatDecimal(Math.round(value), 0)
                  }
                  emptyLabel={t('reports.trend.empty')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports.financial.title')}</CardTitle>
                <CardDescription>{t('reports.financial.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(
                  [
                    {
                      labelKey: 'reports.financial.gross',
                      value: summary.revenue,
                      strong: true,
                    },
                    {
                      labelKey: 'reports.financial.discounts',
                      value: summary.discounts,
                      muted: true,
                      negative: true,
                    },
                    { labelKey: 'reports.financial.tax', value: summary.tax },
                    { labelKey: 'reports.financial.delivery', value: summary.deliveryFees },
                    {
                      labelKey: 'reports.financial.foodCost',
                      value: summary.cost,
                      muted: true,
                      negative: true,
                    },
                  ] as Array<{
                    labelKey: TranslationKey;
                    value: string;
                    strong?: boolean;
                    muted?: boolean;
                    negative?: boolean;
                  }>
                ).map((row) => (
                  <div key={row.labelKey} className="flex items-center justify-between text-sm">
                    <span className={row.muted ? 'text-muted-foreground' : 'text-foreground'}>
                      {t(row.labelKey)}
                    </span>
                    <span className={cn('numeric', row.strong ? 'font-bold' : 'font-semibold')}>
                      {row.negative ? '−' : ''}
                      {formatMoney(row.value)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    <Percent className="h-3.5 w-3.5 text-success" />
                    {t('reports.financial.netProfit')}
                  </span>
                  <span className="numeric text-base font-bold text-success">
                    {formatMoney(summary.profit)}
                  </span>
                </div>
                <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {t('reports.financial.formula')}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.category.title')}</CardTitle>
                <CardDescription>{t('reports.category.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.byCategory.length === 0 ? (
                  <EmptyPanel
                    title={t('reports.category.empty')}
                    message={t('reports.category.emptyMessage')}
                  />
                ) : (
                  data.byCategory.map((row) => {
                    const amount = Number(row.revenue);
                    return (
                      <div key={row.categoryId}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold">{row.name}</span>
                          <span className="numeric text-muted-foreground">
                            {t('reports.category.row', {
                              revenue: formatMoney(row.revenue),
                              units: formatNumber(row.units),
                            })}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-secondary"
                            style={{
                              width: `${maxCategoryRevenue > 0 ? (amount / maxCategoryRevenue) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports.payments.title')}</CardTitle>
                <CardDescription>{t('reports.payments.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.payments.length === 0 ? (
                  <EmptyPanel
                    title={t('reports.payments.empty')}
                    message={t('reports.payments.emptyMessage')}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-5">
                    <DonutChart
                      slices={paymentSlices}
                      centerValue={formatMoneyShort(paymentTotal)}
                      centerLabel={t('reports.payments.collected')}
                    />
                    <div className="min-w-40 flex-1 space-y-2">
                      {data.payments.map((row) => (
                        <div key={row.method} className="flex items-center gap-2 text-sm">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: PAYMENT_COLORS[row.method] ?? '#8C6A4A' }}
                          />
                          <span className="flex-1">{paymentMethodLabel(row.method)}</span>
                          <span className="numeric text-xs text-muted-foreground">
                            {t('reports.payments.count', { count: formatNumber(row.count) })}
                          </span>
                          <span className="numeric font-semibold">{formatMoney(row.amount)}</span>
                          <span className="numeric w-12 text-end text-xs text-muted-foreground">
                            {t('reports.payments.percent', {
                              percent: formatDecimal(row.percent, 1),
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.bestSellers.title')}</CardTitle>
                <CardDescription>{t('reports.bestSellers.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.bestSellers.length === 0 ? (
                  <EmptyPanel
                    title={t('reports.bestSellers.empty')}
                    message={t('reports.bestSellers.emptyMessage')}
                  />
                ) : (
                  data.bestSellers.map((row, index) => (
                    <div key={row.menuItemId} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
                      <span className="numeric flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                        {formatNumber(index + 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{row.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.categoryName ?? t('reports.bestSellers.uncategorised')}
                        </p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-brand-orange"
                            style={{
                              width: `${maxSellerUnits > 0 ? (row.units / maxSellerUnits) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="numeric text-sm font-bold">{formatNumber(row.units)}</p>
                        <p className="numeric text-[11px] text-muted-foreground">
                          {formatMoney(row.revenue)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports.cashiers.title')}</CardTitle>
                <CardDescription>{t('reports.cashiers.description')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.byCashier.length === 0 ? (
                  <EmptyPanel
                    title={t('reports.cashiers.empty')}
                    message={t('reports.cashiers.emptyMessage')}
                  />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2 text-start font-semibold">
                          {t('reports.cashiers.columns.cashier')}
                        </th>
                        <th className="px-4 py-2 text-end font-semibold">
                          {t('reports.cashiers.columns.orders')}
                        </th>
                        <th className="px-4 py-2 text-end font-semibold">
                          {t('reports.cashiers.columns.revenue')}
                        </th>
                        <th className="px-4 py-2 text-end font-semibold">
                          {t('reports.cashiers.columns.average')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCashier.map((row) => (
                        <tr key={row.userId} className="border-b border-border/70 last:border-0">
                          <td className="px-4 py-2 font-medium">{row.name}</td>
                          <td className="numeric px-4 py-2 text-end">
                            {formatNumber(row.orders)}
                          </td>
                          <td className="numeric px-4 py-2 text-end font-semibold">
                            {formatMoney(row.revenue)}
                          </td>
                          <td className="numeric px-4 py-2 text-end text-muted-foreground">
                            {formatMoney(row.averageOrderValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.discounts.title')}</CardTitle>
                <CardDescription>{t('reports.discounts.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.discounts.length === 0 ? (
                  <EmptyPanel
                    title={t('reports.discounts.empty')}
                    message={t('reports.discounts.emptyMessage')}
                  />
                ) : (
                  data.discounts.map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{row.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {t(
                            row.orders === 1 ? 'reports.discounts.order' : 'reports.discounts.orders',
                            { count: formatNumber(row.orders) },
                          )}
                        </p>
                      </div>
                      <span className="numeric font-semibold text-destructive">
                        -{formatMoney(row.amount)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports.ordersByType.title')}</CardTitle>
                <CardDescription>{t('reports.ordersByType.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.ordersByType.length === 0 ? (
                  <EmptyPanel
                    title={t('reports.ordersByType.empty')}
                    message={t('reports.ordersByType.emptyMessage')}
                  />
                ) : (
                  data.ordersByType.map((row) => (
                    <div key={row.key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{row.label}</span>
                        <span className="numeric text-xs text-muted-foreground">
                          {t('reports.ordersByType.row', {
                            orders: formatNumber(row.orders),
                            revenue: formatMoney(row.revenue),
                          })}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${totalTypeOrders > 0 ? (row.orders / totalTypeOrders) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports.inventory.title')}</CardTitle>
                <CardDescription>
                  {t('reports.inventory.description', {
                    cost: formatMoney(totalConsumptionCost),
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {data.inventoryConsumption.length === 0 ? (
                  <EmptyPanel
                    title={t('reports.inventory.empty')}
                    message={t('reports.inventory.emptyMessage')}
                  />
                ) : (
                  data.inventoryConsumption.slice(0, 10).map((row) => (
                    <div
                      key={row.ingredientId}
                      className="flex items-center justify-between rounded-md border border-border/60 px-3 py-1.5 text-sm"
                    >
                      <span className="truncate">{row.name}</span>
                      <span className="numeric ms-2 shrink-0 text-xs">
                        <span className="font-semibold">
                          {formatDecimal(row.quantity, 3)} {unitLabel(row.unit)}
                        </span>
                        <span className="ms-2 text-muted-foreground">
                          {formatMoney(row.cost)}
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {summary.orders === 0 ? (
            <EmptyPanel
              title={t('reports.empty.title')}
              message={t('reports.empty.message')}
            />
          ) : null}
        </>
      ) : null}

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ChartColumnBig className="h-3.5 w-3.5" />
        {t('reports.footer')}
      </p>
    </div>
  );
}
