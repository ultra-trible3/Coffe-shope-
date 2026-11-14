import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Ban, Check, MapPin, Phone, Printer, UserRound } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import {
  ORDER_PROGRESS_STEPS,
  ORDER_STATUS_TRANSITIONS,
  type OrderDto,
  type OrderStatus,
} from '@pharmacy/shared';
import { api } from '../../lib/api';
import {
  formatDateTime,
  formatMoney,
  orderStatusLabel,
  orderTypeLabel,
  paymentMethodLabel,
  paymentSummaryLabel,
} from '../../lib/format';
import { cn } from '../../lib/utils';
import { useI18n, type TranslationKey } from '../../i18n';

const NEXT_KEYS: Partial<Record<OrderStatus, TranslationKey>> = {
  confirmed: 'orders.detail.next.confirmed',
  preparing: 'orders.detail.next.preparing',
  ready: 'orders.detail.next.ready',
  completed: 'orders.detail.next.completed',
};
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Dialog, DialogContent, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { EmptyPanel } from '../ui/states';
import { OrderStatusBadge, PaymentBadge } from '../ui/status-badge';
import { toast } from '../ui/toast';
import { InvoiceViewer } from '../invoice/InvoiceViewer';
import { useAuthStore } from '../../store/auth';

export function OrderDetailDialog({
  open,
  onOpenChange,
  order,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDto | null;
  onChanged?: (order: OrderDto) => void;
}): ReactElement {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const canCancel = useAuthStore((state) => state.can('orders:cancel'));
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
      setCancelOpen(false);
    }
  }, [open]);

  const refresh = (updated: OrderDto): void => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
    void queryClient.invalidateQueries({ queryKey: ['audit'] });
    onChanged?.(updated);
  };

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => api.orders.updateStatus(order!.id, status),
    onSuccess: (updated) => {
      toast.success(
        t('orders.detail.movedTo', { status: orderStatusLabel(updated.status) }),
        t('orders.detail.kitchenUpdated'),
      );
      refresh(updated);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t('orders.detail.updateFailed')),
  });

  const cancelMutation = useMutation({
    mutationFn: (cancelReason: string) => api.orders.cancel(order!.id, cancelReason),
    onSuccess: (updated) => {
      toast.success(t('orders.detail.cancelledMessage'), t('orders.detail.cancelledTitle'));
      setCancelOpen(false);
      setReason('');
      refresh(updated);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t('orders.detail.cancelFailed')),
  });

  if (!order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent title={t('orders.detail.title')}>
          <EmptyPanel title={t('orders.detail.noOrder')} />
        </DialogContent>
      </Dialog>
    );
  }

  const allowed = ORDER_STATUS_TRANSITIONS[order.status].filter((status) => status !== 'cancelled');
  const canCancelOrder = canCancel && order.status !== 'completed' && order.status !== 'cancelled';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          title={order.orderNumber}
          description={`${orderTypeLabel(order.type)}${order.tableNumber ? ` · ${t('orders.payment.table', { number: order.tableNumber })}` : ''} · ${formatDateTime(order.createdAt)}`}
          className="max-w-3xl"
        >
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
            <span className="ms-auto text-xs text-muted-foreground">
              {t('orders.detail.cashier', { name: order.cashierName })}
            </span>
          </div>

          {order.status !== 'cancelled' ? <OrderProgress status={order.status} /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="th-label">{t('orders.detail.guest')}</p>
              <p className="mt-1.5 flex items-center gap-1.5 font-semibold">
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                {order.customerName ?? t('orders.detail.walkIn')}
              </p>
              {order.customerPhone ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> {order.customerPhone}
                </p>
              ) : null}
              {order.customerAddress ? (
                <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {order.customerAddress}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="th-label">{t('orders.detail.payment')}</p>
              <p className="mt-1.5 font-semibold">{paymentSummaryLabel(order.payments, order.paymentMethod)}</p>
              {order.payments.filter((payment) => payment.reference).map((payment) => (
                <p key={payment.id} className="mt-1 text-xs text-muted-foreground">
                  {paymentMethodLabel(payment.method)} · {t('orders.payment.reference')} {payment.reference}
                </p>
              ))}
              <p className="numeric mt-1 text-xs text-muted-foreground">
                {t('orders.detail.paidChange', {
                  paid: formatMoney(order.amountPaid),
                  change: formatMoney(order.changeDue),
                })}
              </p>
              {order.invoice ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('orders.detail.invoice', { number: order.invoice.invoiceNumber })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      <span className="numeric me-1.5 text-muted-foreground">{item.quantity}×</span>
                      {item.name}
                      {item.sizeName ? <span className="ms-1 text-xs font-normal text-muted-foreground">({item.sizeName})</span> : null}
                    </p>
                    {item.toppings.length > 0 ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        + {item.toppings.map((topping) => topping.name).join(', ')}
                      </p>
                    ) : null}
                    {item.specialInstructions ? (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">
                        “{item.specialInstructions}”
                      </p>
                    ) : null}
                  </div>
                  <p className="numeric shrink-0 font-semibold">{formatMoney(item.lineTotal)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 border-t border-border bg-muted/30 px-3 py-3 text-sm">
              <Row label={t('orders.detail.subtotal')} value={formatMoney(order.subtotal)} />
              {Number(order.discount) > 0 ? (
                <Row
                  label={`${t('orders.detail.discount')}${order.discountLabel ? ` · ${order.discountLabel}` : ''}`}
                  value={`−${formatMoney(order.discount)}`}
                />
              ) : null}
              <Row label={t('orders.detail.tax')} value={formatMoney(order.tax)} />
              {Number(order.deliveryFee) > 0 ? <Row label={t('orders.detail.delivery')} value={formatMoney(order.deliveryFee)} /> : null}
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                <span>{t('orders.detail.total')}</span>
                <span className="numeric">{formatMoney(order.total)}</span>
              </div>
            </div>
          </div>

          {order.notes ? (
            <div className="rounded-lg border border-border px-3 py-2 text-sm">
              <p className="th-label">{t('orders.detail.notes')}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{order.notes}</p>
            </div>
          ) : null}

          <DialogFooter className="flex-wrap gap-2 !space-x-0">
            <Button variant="outline" onClick={() => setInvoiceOpen(true)}>
              <Printer className="h-4 w-4" />
              {t('orders.detail.invoiceReceipt')}
            </Button>
            {canCancelOrder ? (
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4" />
                {t('orders.detail.cancelOrder')}
              </Button>
            ) : null}
            <div className="flex flex-wrap gap-2 sm:ms-auto">
              {allowed.map((status, index) => (
                <Button
                  key={status}
                  variant={index === allowed.length - 1 ? 'default' : 'outline'}
                  onClick={() => statusMutation.mutate(status)}
                  disabled={statusMutation.isPending}
                >
                  {statusMutation.isPending
                    ? t('orders.detail.working')
                    : NEXT_KEYS[status]
                      ? t(NEXT_KEYS[status]!)
                      : t('orders.detail.markStatus', { status: orderStatusLabel(status) })}
                  <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </Button>
              ))}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceViewer
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        order={order}
        invoiceNumber={order.invoice?.invoiceNumber ?? null}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t('orders.detail.cancelTitle')}
        description={
          <div className="space-y-3">
            <p>{t('orders.detail.cancelDescription')}</p>
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason">{t('orders.detail.reason')}</Label>
              <Input
                id="cancel-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t('orders.detail.reasonPlaceholder')}
              />
            </div>
          </div>
        }
        confirmLabel={t('orders.detail.cancelOrder')}
        destructive
        busy={cancelMutation.isPending}
        onConfirm={() => {
          if (reason.trim().length < 3) {
            toast.error(t('orders.detail.reasonRequired'));
            return;
          }
          cancelMutation.mutate(reason.trim());
        }}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="numeric">{value}</span>
    </div>
  );
}

/** Preparation timeline shared by staff and counter tracking. */
function OrderProgress({ status }: { status: OrderStatus }): ReactElement {
  const { t } = useI18n();
  const currentIndex = ORDER_PROGRESS_STEPS.findIndex((step) => step.status === status);

  return (
    <ol
      aria-label={t('orders.progress.aria')}
      className="flex items-center rounded-lg border border-border bg-muted/20 px-3 py-2.5"
    >
      {ORDER_PROGRESS_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li
            key={step.status}
            aria-current={active ? 'step' : undefined}
            className="flex flex-1 items-center gap-1.5 last:flex-none"
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                done && 'border-emerald-500 bg-emerald-500 text-white',
                active && 'border-primary bg-primary text-primary-foreground',
                !done && !active && 'border-border bg-card text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-[11px] font-medium',
                active ? 'text-foreground' : 'text-muted-foreground',
                !active && 'hidden sm:inline',
              )}
            >
              {t(`orders.progress.${step.status}` as const)}
            </span>
            {index < ORDER_PROGRESS_STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn('mx-1 h-px flex-1', done ? 'bg-emerald-500' : 'bg-border')}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
