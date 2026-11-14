import { Check, Plus, ReceiptText } from 'lucide-react';
import type { ReactElement } from 'react';
import type { OrderDto } from '@pharmacy/shared';
import qahwaLogo from '../../assets/qahwa-logo.svg';
import { useI18n } from '../../i18n';
import {
  formatMoney,
  formatNumber,
  orderTypeLabel,
  paymentMethodLabel,
  paymentSummaryLabel,
} from '../../lib/format';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';

export function PaymentSuccessDialog({
  open,
  onOpenChange,
  order,
  onViewReceipt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDto | null;
  onViewReceipt: () => void;
}): ReactElement {
  const { t } = useI18n();
  const change = order ? Number(order.changeDue) : 0;
  const itemsCount = order ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const itemsLabel =
    itemsCount === 1
      ? t('orders.payment.itemCount', { count: formatNumber(itemsCount) })
      : t('orders.payment.itemsCount', { count: formatNumber(itemsCount) });

  return (
    <Dialog open={open && Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[27rem] gap-0 overflow-hidden p-0 [&>button]:end-3 [&>button]:top-3 [&>button]:text-white/55 [&>button]:hover:bg-white/10 [&>button]:hover:text-white">
        {order ? (
          <>
            <header className="relative overflow-hidden bg-sidebar px-7 pb-6 pt-5 text-sidebar-foreground">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-red via-brand-orange to-warning"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -end-14 -top-20 h-48 w-48 rounded-full bg-brand-orange/20 blur-3xl"
              />

              <div className="relative flex items-center justify-between gap-4 pe-8">
                <div className="flex items-center gap-2.5">
                  <img
                    src={qahwaLogo}
                    alt=""
                    className="h-7 w-7 rounded-full ring-1 ring-white/15"
                  />
                  <span className="font-display text-[11px] leading-none tracking-[0.24em] text-sidebar-muted">
                    {t('app.fullName')}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {t('orders.payment.paidBadge')}
                </span>
              </div>

              <div className="relative mt-6 flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 animate-pop-in items-center justify-center rounded-full bg-success text-success-foreground shadow-lg shadow-black/30">
                  <Check className="h-5 w-5" strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="font-display text-[27px] leading-[1.02] tracking-[0.03em] text-sidebar-foreground">
                    {t('orders.payment.title')}
                  </DialogTitle>
                  <DialogDescription className="mt-1.5 text-[13px] leading-5 text-sidebar-muted">
                    {orderTypeLabel(order.type)}
                    {order.tableNumber ? ` · ${t('orders.payment.table', { number: order.tableNumber })}` : ''}
                    {itemsCount > 0 ? ` · ${itemsLabel}` : ''}
                  </DialogDescription>
                </div>
              </div>
            </header>

            <div className="bg-card px-7 pb-6 pt-5">
              <div className="flex items-end justify-between gap-6">
                <div className="min-w-0">
                  <p className="th-label">{t('orders.payment.order')}</p>
                  <p className="numeric mt-1.5 truncate font-mono text-[15px] font-semibold tracking-[0.12em] text-foreground">
                    {order.orderNumber}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="th-label">{t('orders.payment.totalPaid')}</p>
                  <p className="numeric mt-1 text-[27px] font-bold leading-none tracking-tight text-foreground">
                    {formatMoney(order.total)}
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-2.5 border-t border-dashed border-border pt-4 text-[13px]">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{t('orders.payment.payment')}</dt>
                  <dd className="text-end font-medium">{paymentSummaryLabel(order.payments, order.paymentMethod)}</dd>
                </div>
                {order.payments.filter((payment) => payment.reference).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {paymentMethodLabel(payment.method)} · {t('orders.payment.reference')}
                    </dt>
                    <dd className="numeric text-end font-medium">{payment.reference}</dd>
                  </div>
                ))}
                {change > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">{t('orders.payment.changeDue')}</dt>
                    <dd className="numeric font-semibold text-success">{formatMoney(order.changeDue)}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{t('orders.payment.kitchen')}</dt>
                  <dd className="flex items-center gap-1.5 font-medium">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
                    {t('orders.payment.ticketSent')}
                  </dd>
                </div>
                {order.invoice ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">{t('orders.payment.receipt')}</dt>
                    <dd className="numeric font-medium">{order.invoice.invoiceNumber}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 sm:flex-1"
                  onClick={() => {
                    onOpenChange(false);
                    onViewReceipt();
                  }}
                >
                  <ReceiptText className="h-4 w-4" />
                  {t('orders.payment.viewReceipt')}
                </Button>
                <Button
                  type="button"
                  className="h-11 sm:flex-[1.35]"
                  autoFocus
                  onClick={() => onOpenChange(false)}
                >
                  <Plus className="h-4 w-4" />
                  {t('orders.payment.startNext')}
                </Button>
              </div>

              <p className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Check aria-hidden="true" className="h-3 w-3 text-success" strokeWidth={2.5} />
                {t('orders.payment.stockUpdated')}
              </p>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
