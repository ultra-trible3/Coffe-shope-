import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BellRing,
  Check,
  CheckCheck,
  Clock3,
  Coffee,
  ConciergeBell,
  Loader2,
  Printer,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  type KitchenOrderDto,
  type KitchenQueueDto,
  type KitchenStatus,
  type OrderStatus,
} from '@pharmacy/shared';
import { Button, type ButtonProps } from '../components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '../components/ui/dialog';
import { EmptyPanel, ErrorState } from '../components/ui/states';
import { OrderStatusBadge } from '../components/ui/status-badge';
import { toast } from '../components/ui/toast';
import { KitchenSkeleton } from '../components/skeletons/KitchenSkeleton';
import { KitchenTicket } from '../components/invoice/KitchenTicket';
import { useI18n, type Translate, type TranslationKey } from '../i18n';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { formatNumber, formatTime, orderStatusLabel, orderTypeLabel } from '../lib/format';

const POLL_INTERVAL_MS = 5_000;
const HIGHLIGHT_MS = 45_000;
const LATE_AFTER_MINUTES = 20;

type BoardTab = 'new' | 'preparing' | 'ready' | 'completed';

const TAB_STATUSES: Record<BoardTab, readonly OrderStatus[]> = {
  new: ['pending'],
  preparing: ['confirmed', 'preparing'],
  ready: ['ready'],
  completed: ['completed'],
};

const TABS: Array<{ key: BoardTab; labelKey: TranslationKey; icon: LucideIcon }> = [
  { key: 'new', labelKey: 'kitchen.tabs.new', icon: BellRing },
  { key: 'preparing', labelKey: 'kitchen.tabs.preparing', icon: Coffee },
  { key: 'ready', labelKey: 'kitchen.tabs.ready', icon: ConciergeBell },
  { key: 'completed', labelKey: 'kitchen.tabs.completed', icon: CheckCheck },
];

const ACTIONS: Partial<
  Record<
    OrderStatus,
    { next: KitchenStatus; labelKey: TranslationKey; icon: LucideIcon; variant: ButtonProps['variant'] }
  >
> = {
  pending: { next: 'confirmed', labelKey: 'kitchen.actions.accept', icon: Check, variant: 'default' },
  confirmed: { next: 'preparing', labelKey: 'kitchen.actions.start', icon: Coffee, variant: 'default' },
  preparing: { next: 'ready', labelKey: 'kitchen.actions.ready', icon: ConciergeBell, variant: 'secondary' },
  ready: { next: 'completed', labelKey: 'kitchen.actions.complete', icon: CheckCheck, variant: 'success' },
};

function elapsedMinutes(value: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(value).getTime()) / 60_000));
}

function elapsedLabel(minutes: number, t: Translate): string {
  if (minutes < 1) return t('kitchen.elapsed.justNow');
  if (minutes < 60) return t('kitchen.elapsed.minutes', { count: formatNumber(minutes) });
  const hours = Math.floor(minutes / 60);
  return t('kitchen.elapsed.hours', {
    hours: formatNumber(hours),
    minutes: formatNumber(minutes % 60),
  });
}

function byOldestFirst(a: KitchenOrderDto, b: KitchenOrderDto): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function byNewestFirst(a: KitchenOrderDto, b: KitchenOrderDto): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function TicketCard({
  order,
  now,
  highlighted,
  busy,
  onAdvance,
  onOpen,
}: {
  order: KitchenOrderDto;
  now: number;
  highlighted: boolean;
  busy: boolean;
  onAdvance: (order: KitchenOrderDto, status: KitchenStatus) => void;
  onOpen: () => void;
}): ReactElement {
  const { t } = useI18n();
  const action = ACTIONS[order.status];
  const isPending = order.status === 'pending';
  const minutes = elapsedMinutes(order.createdAt, now);
  const isLate = isPending && minutes >= LATE_AFTER_MINUTES;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <article
      className={cn(
        'flex flex-col rounded-xl border bg-card shadow-sm transition-shadow',
        isPending ? 'border-amber-300/80 dark:border-amber-500/50' : 'border-border',
        highlighted && 'ring-2 ring-amber-400/70 dark:ring-amber-400/50',
      )}
    >
      <header
        className={cn(
          'flex items-start justify-between gap-3 rounded-t-xl border-b px-4 py-3',
          isPending
            ? 'border-amber-200/80 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-500/10'
            : 'border-border bg-muted/30',
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="numeric truncate text-base font-bold">{order.orderNumber}</h3>
            {isPending ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                <BellRing className="h-3 w-3" />
                {t('kitchen.ticket.newBadge')}
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5 shrink-0" />
            <span>{formatTime(order.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span className={cn(isLate && 'font-semibold text-destructive')}>
              {elapsedLabel(minutes, t)}
            </span>
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground/80">
            {orderTypeLabel(order.type)}
          </span>
          {order.tableNumber ? (
            <span className="rounded-md border border-border px-2 py-0.5 text-muted-foreground">
              {t('kitchen.ticket.table', { number: order.tableNumber })}
            </span>
          ) : null}
          <span className="ms-auto font-medium text-muted-foreground">
            {itemCount === 1
              ? t('kitchen.ticket.item', { count: formatNumber(itemCount) })
              : t('kitchen.ticket.items', { count: formatNumber(itemCount) })}
          </span>
        </div>

        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5">
              <span className="numeric mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-secondary px-1 text-xs font-bold text-secondary-foreground">
                {formatNumber(item.quantity)}×
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5">
                  {item.name}
                  {item.sizeName ? (
                    <span className="ms-1.5 text-xs font-normal text-muted-foreground">
                      {item.sizeName}
                    </span>
                  ) : null}
                </p>
                {item.toppings.length > 0 ? (
                  <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                    + {item.toppings.join(', ')}
                  </p>
                ) : null}
                {item.specialInstructions ? (
                  <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium italic text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                    “{item.specialInstructions}”
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {order.notes ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="font-semibold uppercase tracking-[0.12em]">{t('kitchen.ticket.orderNote')}</p>
            <p className="mt-0.5 whitespace-pre-wrap">{order.notes}</p>
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span>
            {order.completedAt
              ? t('kitchen.ticket.completedAt', { time: formatTime(order.completedAt) })
              : t('kitchen.ticket.updatedAt', { time: formatTime(order.updatedAt) })}
          </span>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold text-foreground/80 transition-colors hover:bg-muted focus-ring"
          >
            <Coffee className="h-3.5 w-3.5" />
            {t('kitchen.ticket.details')}
          </button>
        </div>
      </div>

      {action ? (
        <footer className="border-t border-border p-3">
          <Button
            size="lg"
            variant={action.variant}
            className="h-12 w-full text-sm font-semibold"
            onClick={() => onAdvance(order, action.next)}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <action.icon className="h-4 w-4" />
            )}
            {busy ? t('kitchen.actions.updating') : t(action.labelKey)}
          </Button>
        </footer>
      ) : null}
    </article>
  );
}

export function KitchenPage(): ReactElement {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<BoardTab>('new');
  const [now, setNow] = useState(() => Date.now());
  const [highlighted, setHighlighted] = useState<readonly string[]>([]);
  const [detail, setDetail] = useState<KitchenOrderDto | null>(null);
  const [printing, setPrinting] = useState(false);
  const seenPending = useRef<Set<string> | null>(null);

  const queue = useQuery({
    queryKey: ['kitchen', 'queue'],
    queryFn: () => api.kitchen.queue(),
    staleTime: 0,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const data = queue.data;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data) return;
    const pendingIds = data.orders
      .filter((order) => order.status === 'pending')
      .map((order) => order.id);

    if (seenPending.current === null) {
      seenPending.current = new Set(pendingIds);
      return;
    }
    const fresh = pendingIds.filter((id) => !seenPending.current!.has(id));
    for (const id of pendingIds) seenPending.current.add(id);
    if (fresh.length === 0) return;

    setHighlighted(fresh);
    toast.info(
      fresh.length === 1
        ? t('kitchen.toast.newTicket')
        : t('kitchen.toast.newTickets', { count: formatNumber(fresh.length) }),
      t('kitchen.toast.newTitle'),
    );
  }, [data, t]);

  useEffect(() => {
    if (highlighted.length === 0) return;
    const timer = window.setTimeout(() => setHighlighted([]), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlighted]);

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: KitchenStatus }) =>
      api.kitchen.updateStatus(id, status),
    onSuccess: (updated) => {
      toast.success(
        t('kitchen.toast.moved', {
          order: updated.orderNumber,
          status: orderStatusLabel(updated.status),
        }),
        t('kitchen.toast.updatedTitle'),
      );
      setHighlighted((current) => current.filter((id) => id !== updated.id));
      queryClient.setQueryData<KitchenQueueDto>(['kitchen', 'queue'], (current) =>
        current
          ? {
              ...current,
              orders: current.orders.map((order) =>
                order.id === updated.id ? updated : order,
              ),
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: ['kitchen'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('kitchen.toast.updateFailed'));
      void queue.refetch();
    },
  });

  const printTicket = async (): Promise<void> => {
    setPrinting(true);
    try {
      const result = await api.print();
      if (!result.ok && !result.cancelled) {
        toast.error(result.error, t('kitchen.detail.printFailed'));
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('kitchen.detail.printFailed'),
      );
    } finally {
      setPrinting(false);
    }
  };

  const grouped = useMemo(() => {
    const orders = data?.orders ?? [];
    return {
      new: orders.filter((order) => TAB_STATUSES.new.includes(order.status)).sort(byOldestFirst),
      preparing: orders
        .filter((order) => TAB_STATUSES.preparing.includes(order.status))
        .sort(byOldestFirst),
      ready: orders.filter((order) => TAB_STATUSES.ready.includes(order.status)).sort(byOldestFirst),
      completed: orders
        .filter((order) => TAB_STATUSES.completed.includes(order.status))
        .sort(byNewestFirst),
    } satisfies Record<BoardTab, KitchenOrderDto[]>;
  }, [data]);

  if (queue.isLoading) return <KitchenSkeleton />;

  if (queue.isError && !data) {
    return (
      <ErrorState
        title={t('kitchen.error.title')}
        message={
          queue.error instanceof Error ? queue.error.message : t('kitchen.error.message')
        }
        onRetry={() => void queue.refetch()}
      />
    );
  }

  const current = grouped[tab];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t('kitchen.live.label')}
          </span>
          <span aria-hidden="true">·</span>
          <span>{t('kitchen.live.refreshes', { seconds: formatNumber(POLL_INTERVAL_MS / 1000) })}</span>
          {data ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{t('kitchen.live.updated', { time: formatTime(data.generatedAt) })}</span>
            </>
          ) : null}
          {queue.isError ? (
            <span className="font-medium text-destructive">· {t('kitchen.live.reconnecting')}</span>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void queue.refetch()}
          disabled={queue.isFetching}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', queue.isFetching && 'animate-spin')} />
          {t('kitchen.live.refresh')}
        </Button>
      </div>

      <div
        role="tablist"
        aria-label={t('kitchen.live.stagesAria')}
        className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm"
      >
        {TABS.map((entry) => {
          const Icon = entry.icon;
          const active = tab === entry.key;
          const count = grouped[entry.key].length;
          return (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(entry.key)}
              className={cn(
                'flex min-w-[132px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-ring',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(entry.labelKey)}
              <span
                className={cn(
                  'numeric min-w-5 rounded-full px-1.5 py-0.5 text-[11px] leading-4',
                  active ? 'bg-primary-foreground/20' : 'bg-muted text-foreground/70',
                  entry.key === 'new' && count > 0 && !active && 'bg-amber-500 text-white',
                )}
              >
                {formatNumber(count)}
              </span>
            </button>
          );
        })}
      </div>

      {current.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyPanel
            title={t(`kitchen.empty.${tab}.title` as const)}
            message={t(`kitchen.empty.${tab}.message` as const)}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {current.map((order) => (
            <TicketCard
              key={order.id}
              order={order}
              now={now}
              highlighted={highlighted.includes(order.id)}
              busy={advance.isPending && advance.variables?.id === order.id}
              onAdvance={(target, status) => advance.mutate({ id: target.id, status })}
              onOpen={() => setDetail(order)}
            />
          ))}
        </div>
      )}

      {detail ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setDetail(null);
          }}
        >
          <DialogContent
            title={detail.orderNumber}
            description={`${orderTypeLabel(detail.type)}${
              detail.tableNumber
                ? ` · ${t('kitchen.ticket.table', { number: detail.tableNumber })}`
                : ''
            } · ${formatTime(detail.createdAt)}`}
            className="max-w-lg"
          >
            <div className="flex items-center gap-2">
              <OrderStatusBadge status={detail.status} />
              <span className="ms-auto text-xs text-muted-foreground">
                {t('kitchen.detail.items', {
                  count: formatNumber(
                    detail.items.reduce((sum, item) => sum + item.quantity, 0),
                  ),
                })}
              </span>
            </div>

            <ul className="space-y-3">
              {detail.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <span className="numeric flex h-7 min-w-7 items-center justify-center rounded-md bg-secondary px-1 text-sm font-bold text-secondary-foreground">
                    {formatNumber(item.quantity)}×
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {item.name}
                      {item.sizeName ? (
                        <span className="ms-1.5 text-xs font-normal text-muted-foreground">
                          {item.sizeName}
                        </span>
                      ) : null}
                    </p>
                    {item.toppings.length > 0 ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        + {item.toppings.join(', ')}
                      </p>
                    ) : null}
                    {item.specialInstructions ? (
                      <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs italic text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                        “{item.specialInstructions}”
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {detail.notes ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                  {t('kitchen.detail.orderNote')}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{detail.notes}</p>
              </div>
            ) : null}

            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="th-label">{t('kitchen.detail.ticket')}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void printTicket()}
                  disabled={printing}
                >
                  {printing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Printer className="h-3.5 w-3.5" />
                  )}
                  {printing ? t('kitchen.detail.printing') : t('kitchen.detail.print')}
                </Button>
              </div>
              <div className="max-h-[42vh] overflow-auto rounded-lg print:max-h-none print:overflow-visible">
                <div className="print-area mx-auto w-fit">
                  <style>{'@media print { @page { size: 80mm auto; margin: 0; } }'}</style>
                  <KitchenTicket order={detail} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetail(null)}>
                {t('kitchen.detail.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
