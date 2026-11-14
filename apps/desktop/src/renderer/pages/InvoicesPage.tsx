import { useQuery } from '@tanstack/react-query';
import { Printer, RotateCcw, Search, X } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import type { OrderDto } from '@pharmacy/shared';
import { InvoiceViewer } from '../components/invoice/InvoiceViewer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Pagination } from '../components/ui/pagination';
import { EmptyPanel, ErrorState } from '../components/ui/states';
import { Skeleton, SkeletonTable } from '../components/ui/skeleton';
import { OrderStatusBadge } from '../components/ui/status-badge';
import { useI18n } from '../i18n';
import { api, type InvoiceWithOrder } from '../lib/api';
import { formatDateTime, formatDecimal, formatMoney, orderTypeLabel } from '../lib/format';

const PAGE_SIZE = 20;

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function InvoicesPage(): ReactElement {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<InvoiceWithOrder | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, from, to]);

  const invoices = useQuery({
    queryKey: ['invoices', 'list', { page, debouncedSearch, from, to }],
    queryFn: () =>
      api.invoices.list({
        page,
        pageSize: PAGE_SIZE,
        q: debouncedSearch || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const openInvoice = (invoice: InvoiceWithOrder): void => {
    setSelected(invoice);
    setViewerOpen(true);
  };

  const reset = (): void => {
    setSearch('');
    setFrom('');
    setTo('');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-end gap-2 border-b border-border p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('invoices.list.searchPlaceholder')}
              className="h-9 ps-9"
              aria-label={t('invoices.list.searchAria')}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label={t('invoices.list.clearSearch')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="invoices-from" className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('invoices.list.from')}
            </Label>
            <Input
              id="invoices-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-9 w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invoices-to" className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('invoices.list.to')}
            </Label>
            <Input
              id="invoices-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-9 w-[150px]"
            />
          </div>
          {search || from || to ? (
            <Button variant="ghost" size="sm" onClick={reset} className="mb-0.5">
              <RotateCcw className="h-3.5 w-3.5" />
              {t('invoices.list.reset')}
            </Button>
          ) : null}
          {invoices.data ? (
            <span className="mb-2 ms-auto text-xs text-muted-foreground">
              {t('invoices.list.count', { count: formatDecimal(invoices.data.total, 0) })}
            </span>
          ) : (
            <Skeleton className="mb-2 ms-auto h-3 w-16" />
          )}
        </div>

        {invoices.isLoading ? (
          <SkeletonTable
            label={t('invoices.list.loading')}
            rows={8}
            columns={[
              { kind: 'double', label: t('invoices.list.columns.invoice') },
              { kind: 'short', label: t('invoices.list.columns.order') },
              { kind: 'double', label: t('invoices.list.columns.guest') },
              { kind: 'text', label: t('invoices.list.columns.service') },
              { kind: 'badge', label: t('invoices.list.columns.status') },
              { kind: 'amount', label: t('invoices.list.columns.total') },
              { kind: 'muted', label: t('invoices.list.columns.issued') },
              { kind: 'actions' },
            ]}
          />
        ) : invoices.isError ? (
          <div className="p-4">
            <ErrorState
              title={t('invoices.list.error')}
              message={invoices.error instanceof Error ? invoices.error.message : undefined}
              onRetry={() => void invoices.refetch()}
            />
          </div>
        ) : invoices.data && invoices.data.items.length === 0 ? (
          <EmptyPanel
            title={t('invoices.list.empty')}
            message={t('invoices.list.emptyMessage')}
            action={
              search || from || to ? (
                <Button variant="outline" size="sm" onClick={reset}>
                  {t('invoices.list.clearFilters')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-start text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-semibold">{t('invoices.list.columns.invoice')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('invoices.list.columns.order')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('invoices.list.columns.guest')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('invoices.list.columns.service')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('invoices.list.columns.status')}</th>
                  <th className="px-3 py-2.5 text-end font-semibold">{t('invoices.list.columns.total')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('invoices.list.columns.issued')}</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {invoices.data!.items.map((invoice) => {
                  const order: OrderDto = invoice.order;
                  return (
                    <tr
                      key={invoice.id}
                      className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-muted/40"
                      onClick={() => openInvoice(invoice)}
                    >
                      <td className="px-3 py-2.5">
                        <p className="numeric font-semibold">{invoice.invoiceNumber}</p>
                        <p className="text-[11px] text-muted-foreground">{order.cashierName}</p>
                      </td>
                      <td className="numeric px-3 py-2.5 text-xs">{order.orderNumber}</td>
                      <td className="px-3 py-2.5">
                        <p className="max-w-[160px] truncate">
                          {order.customerName ?? t('invoices.list.walkIn')}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{order.customerPhone ?? '—'}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{orderTypeLabel(order.type)}</td>
                      <td className="px-3 py-2.5">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="numeric px-3 py-2.5 text-end font-semibold">
                        {formatMoney(order.total)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {formatDateTime(invoice.issuedAt)}
                      </td>
                      <td className="px-3 py-2.5 text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openInvoice(invoice);
                          }}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          {t('invoices.list.print')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {invoices.data && invoices.data.total > 0 ? (
          <Pagination
            page={invoices.data.page}
            pageSize={invoices.data.pageSize}
            total={invoices.data.total}
            totalPages={invoices.data.totalPages}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <p className="text-[11px] text-muted-foreground">{t('invoices.list.footer')}</p>

      <InvoiceViewer
        open={viewerOpen}
        onOpenChange={(open) => {
          setViewerOpen(open);
          if (!open) setSelected(null);
        }}
        order={selected?.order ?? null}
        invoiceNumber={selected?.invoiceNumber ?? null}
      />
    </div>
  );
}
