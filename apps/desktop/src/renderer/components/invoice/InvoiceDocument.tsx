import { Coffee, Mail, MapPin, Phone, Printer } from 'lucide-react';
import type { ReactElement } from 'react';
import type { OrderDto, SettingsDto } from '@pharmacy/shared';
import qahwaLogo from '../../assets/qahwa-logo.svg';
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  formatTime,
  orderTypeLabel,
  paymentMethodLabel,
} from '../../lib/format';
import { estimatePrepMinutes, estimatedReadyAt } from '../../lib/order-prep';
import { translate } from '../../i18n/dictionaries';
import { getActiveLanguage } from '../../lib/language';
import { useI18n } from '../../i18n';

export type InvoiceFormat = 'a4' | 'thermal';

export function InvoiceDocument({
  order,
  invoiceNumber,
  settings,
  format,
}: {
  order: OrderDto;
  invoiceNumber: string;
  settings: SettingsDto;
  format: InvoiceFormat;
}): ReactElement {
  const { t } = useI18n();
  const printedAt = new Date();
  const contact = [settings.address, settings.phone, settings.email].filter(Boolean).join(' · ');
  const paymentStatus = translate(getActiveLanguage(), `labels.paymentStatus.${order.paymentStatus}`);
  const tableLabel = order.tableNumber ? t('invoices.document.table', { number: order.tableNumber }) : '';
  const prepMinutes = estimatePrepMinutes(order);
  const readyAt = estimatedReadyAt(order);
  const readyIn = t('invoices.document.readyIn', { minutes: formatNumber(prepMinutes) });
  const nonCashPaid = order.payments
    .filter((payment) => payment.method !== 'CASH')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const cashTendered = Number(order.amountPaid) - nonCashPaid;
  const paymentRows = order.payments.map((payment) => ({
    ...payment,
    displayAmount: payment.method === 'CASH' ? cashTendered.toFixed(2) : payment.amount,
  }));

  if (format === 'thermal') {
    return (
      <div className="receipt-sheet">
        <style>{'@media print { @page { size: 80mm auto; margin: 0; } }'}</style>
        <div style={{ textAlign: 'center' }}>
          <img
            src={qahwaLogo}
            alt=""
            style={{ display: 'block', width: '15mm', height: '15mm', objectFit: 'contain', margin: '0 auto 2mm' }}
          />
          <p style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.14em', margin: 0 }}>
            {t('app.name').toUpperCase()}
          </p>
          <p style={{ fontSize: 9.5, letterSpacing: '0.18em', margin: '1px 0 0', textTransform: 'uppercase' }}>
            {settings.name}
          </p>
          {settings.tagline ? <p style={{ margin: '2px 0 0', fontSize: 9.5 }}>{settings.tagline}</p> : null}
          {settings.phone ? <p style={{ margin: '2px 0 0', fontSize: 9.5 }}>{settings.phone}</p> : null}
          {settings.address ? <p style={{ margin: '2px 0 0', fontSize: 9 }}>{settings.address}</p> : null}
        </div>

        <div className="divider" />

        <div className="row"><span>{t('invoices.document.invoice')}</span><strong>{invoiceNumber}</strong></div>
        <div className="row"><span>{t('invoices.document.order')}</span><strong>{order.orderNumber}</strong></div>
        <div className="row"><span>{t('invoices.document.date')}</span><span>{formatDateTime(order.createdAt)}</span></div>
        <div className="row"><span>{t('invoices.document.cashier')}</span><span>{order.cashierName}</span></div>
        <div className="row"><span>{t('invoices.document.service')}</span><span>{orderTypeLabel(order.type)}{tableLabel ? ` · ${tableLabel}` : ''}</span></div>
        <div className="row" style={{ fontWeight: 700 }}>
          <span>{t('invoices.document.estimatedReady')}</span>
          <span>{formatTime(readyAt)}</span>
        </div>
        <div className="row" style={{ fontSize: 9.5 }}>
          <span>{t('invoices.document.cookTime')}</span>
          <span>{readyIn}</span>
        </div>
        {order.customerName ? <div className="row"><span>{t('invoices.document.guest')}</span><span>{order.customerName}</span></div> : null}
        {order.customerPhone ? <div className="row"><span>{t('invoices.document.phone')}</span><span>{order.customerPhone}</span></div> : null}

        <div className="divider" />

        {order.items.map((item) => (
          <div key={item.id} style={{ marginBottom: '2mm' }}>
            <div className="row">
              <span style={{ fontWeight: 700 }}>
                {item.quantity}× {item.name}
                {item.sizeName ? ` (${item.sizeName})` : ''}
              </span>
              <span>{formatMoney(item.lineTotal)}</span>
            </div>
            {item.toppings.length > 0 ? (
              <div style={{ paddingInlineStart: '3mm', fontSize: 9.5 }}>
                + {item.toppings.map((topping) => topping.name).join(', ')}
              </div>
            ) : null}
            {item.specialInstructions ? (
              <div style={{ paddingInlineStart: '3mm', fontSize: 9, fontStyle: 'italic' }}>
                “{item.specialInstructions}”
              </div>
            ) : null}
          </div>
        ))}

        <div className="divider" />

        <div className="row"><span>{t('invoices.document.subtotal')}</span><span>{formatMoney(order.subtotal)}</span></div>
        {Number(order.discount) > 0 ? (
          <div className="row"><span>{t('invoices.document.discount')}{order.discountLabel ? ` · ${order.discountLabel}` : ''}</span><span>−{formatMoney(order.discount)}</span></div>
        ) : null}
        <div className="row"><span>{t('invoices.document.tax', { rate: Number(settings.taxRate).toFixed(2) })}</span><span>{formatMoney(order.tax)}</span></div>
        {Number(order.deliveryFee) > 0 ? (
          <div className="row"><span>{t('invoices.document.delivery')}</span><span>{formatMoney(order.deliveryFee)}</span></div>
        ) : null}
        <div className="divider" />
        <div className="row" style={{ fontSize: 14, fontWeight: 800 }}><span>{t('invoices.document.total')}</span><span>{formatMoney(order.total)}</span></div>
        {paymentRows.map((payment) => (
          <div key={payment.id}>
            <div className="row">
              <span>{paymentMethodLabel(payment.method)}</span>
              <span>{formatMoney(payment.displayAmount)}</span>
            </div>
            {payment.reference ? (
              <div className="row" style={{ fontSize: 9, color: '#555' }}>
                <span>{t('invoices.document.reference')}</span>
                <span>{payment.reference}</span>
              </div>
            ) : null}
          </div>
        ))}
        {Number(order.changeDue) > 0 ? (
          <div className="row"><span>{t('invoices.document.change')}</span><span>{formatMoney(order.changeDue)}</span></div>
        ) : null}

        <div className="divider" />
        <p style={{ textAlign: 'center', fontSize: 9.5, margin: 0 }}>
          {settings.receiptFooter ?? t('invoices.document.thankYou')}
        </p>
        <p style={{ textAlign: 'center', fontSize: 8.5, margin: '2mm 0 0', color: '#555' }}>
          {t('invoices.document.printed', { date: formatDateTime(printedAt) })}
        </p>
      </div>
    );
  }

  return (
    <div className="invoice-sheet">
      <style>{'@media print { @page { size: A4; margin: 0; } }'}</style>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '8mm', borderBottom: '3px solid #A9682F', paddingBottom: '6mm' }}>
        <div style={{ display: 'flex', gap: '4mm', alignItems: 'flex-start' }}>
          <span style={{ display: 'flex', width: '14mm', height: '14mm', alignItems: 'center', justifyContent: 'center', borderRadius: '3mm', background: '#A9682F', color: '#fff' }}>
            <Coffee style={{ width: '7mm', height: '7mm' }} />
          </span>
          <div>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '0.14em' }}>{t('app.name').toUpperCase()}</p>
            <p style={{ margin: '1mm 0 0', fontSize: '11px', fontWeight: 600, color: '#4b5563' }}>{settings.name}</p>
            {settings.tagline ? <p style={{ margin: '1mm 0 0', fontSize: '10px', color: '#6b7280' }}>{settings.tagline}</p> : null}
            <div style={{ marginTop: '2mm', fontSize: '9.5px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '0.5mm' }}>
              {settings.address ? <span><MapPin size={10} style={{ display: 'inline', marginInlineEnd: 3 }} />{settings.address}</span> : null}
              {settings.phone ? <span><Phone size={10} style={{ display: 'inline', marginInlineEnd: 3 }} />{settings.phone}</span> : null}
              {settings.email ? <span><Mail size={10} style={{ display: 'inline', marginInlineEnd: 3 }} />{settings.email}</span> : null}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'end' }}>
          <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '0.08em', color: '#A9682F' }}>{t('invoices.document.invoiceTitle')}</p>
          <p style={{ margin: '1.5mm 0 0', fontSize: '12px', fontWeight: 700 }}>{invoiceNumber}</p>
          <p style={{ margin: '0.5mm 0 0', fontSize: '10px', color: '#6b7280' }}>{t('invoices.document.order')} {order.orderNumber}</p>
          <p style={{ margin: '2mm 0 0', fontSize: '10px', color: '#374151' }}>{formatDateTime(order.createdAt)}</p>
          <p style={{ margin: '0.5mm 0 0', fontSize: '10px', color: '#374151' }}>{t('invoices.document.cashier')}: {order.cashierName}</p>
          <p style={{ margin: '0.5mm 0 0', fontSize: '10px', color: '#374151' }}>{orderTypeLabel(order.type)}{tableLabel ? ` · ${tableLabel}` : ''}</p>
          <div
            style={{
              display: 'inline-block',
              marginTop: '3mm',
              padding: '2mm 3mm',
              border: '1px solid #A9682F',
              borderRadius: '1.5mm',
              textAlign: 'start',
            }}
          >
            <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280' }}>
              {t('invoices.document.estimatedReady')}
            </p>
            <p style={{ margin: '0.5mm 0 0', fontSize: '16px', fontWeight: 800, color: '#A9682F', lineHeight: 1.1 }}>
              {formatTime(readyAt)}
            </p>
            <p style={{ margin: '0.5mm 0 0', fontSize: '9.5px', fontWeight: 600, color: '#374151' }}>{readyIn}</p>
          </div>
        </div>
      </header>

      <section style={{ display: 'flex', gap: '10mm', marginTop: '6mm' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>{t('invoices.document.billedTo')}</p>
          <p style={{ margin: '1.5mm 0 0', fontSize: '12px', fontWeight: 700 }}>
            {order.customerName ?? t('invoices.document.walkIn')}
          </p>
          {order.customerPhone ? <p style={{ margin: '0.5mm 0 0', fontSize: '10px', color: '#4b5563' }}>{order.customerPhone}</p> : null}
          {order.customerAddress ? <p style={{ margin: '0.5mm 0 0', fontSize: '10px', color: '#4b5563' }}>{order.customerAddress}</p> : null}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>{t('invoices.document.payment')}</p>
          <p style={{ margin: '1.5mm 0 0', fontSize: '11px', fontWeight: 600 }}>
            {paymentRows.length > 1 ? `${t('invoices.document.splitPayment')} · ` : ''}
            {paymentStatus}
          </p>
          <div style={{ marginTop: '1.2mm', display: 'flex', flexDirection: 'column', gap: '0.8mm', fontSize: '10px', color: '#4b5563' }}>
            {paymentRows.map((payment) => (
              <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '4mm' }}>
                <span>
                  {paymentMethodLabel(payment.method)}
                  {payment.reference ? ` · ${t('invoices.document.reference')} ${payment.reference}` : ''}
                </span>
                <span style={{ fontWeight: 600, color: '#374151' }}>{formatMoney(payment.displayAmount)}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '1mm 0 0', fontSize: '10px', color: '#4b5563' }}>
            {t('invoices.document.paid', { amount: formatMoney(order.amountPaid) })}{Number(order.changeDue) > 0 ? ` · ${t('invoices.document.change')} ${formatMoney(order.changeDue)}` : ''}
          </p>
        </div>
      </section>

      <table style={{ marginTop: '7mm' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'start' }}>{t('invoices.document.item')}</th>
            <th style={{ width: '14mm', textAlign: 'center' }}>{t('invoices.document.qty')}</th>
            <th style={{ width: '26mm', textAlign: 'end' }}>{t('invoices.document.unitPrice')}</th>
            <th style={{ width: '28mm', textAlign: 'end' }}>{t('invoices.document.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                <p style={{ margin: 0, fontWeight: 700 }}>{item.name}{item.sizeName ? ` · ${item.sizeName}` : ''}</p>
                {item.toppings.length > 0 ? (
                  <p style={{ margin: '0.5mm 0 0', fontSize: '9.5px', color: '#6b7280' }}>
                    {t('invoices.document.toppings', { toppings: item.toppings.map((topping) => topping.name).join(', ') })}
                  </p>
                ) : null}
                {item.specialInstructions ? (
                  <p style={{ margin: '0.5mm 0 0', fontSize: '9.5px', color: '#6b7280', fontStyle: 'italic' }}>
                    “{item.specialInstructions}”
                  </p>
                ) : null}
              </td>
              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ textAlign: 'end' }}>{formatMoney(Number(item.unitPrice) + Number(item.toppingsTotal))}</td>
              <td style={{ textAlign: 'end', fontWeight: 600 }}>{formatMoney(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5mm' }}>
        <div style={{ width: '78mm', fontSize: '10.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.2mm 0' }}><span>{t('invoices.document.subtotal')}</span><span>{formatMoney(order.subtotal)}</span></div>
          {Number(order.discount) > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.2mm 0' }}>
              <span>{t('invoices.document.discount')}{order.discountLabel ? ` · ${order.discountLabel}` : ''}</span>
              <span>−{formatMoney(order.discount)}</span>
            </div>
          ) : null}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.2mm 0' }}><span>{t('invoices.document.tax', { rate: Number(settings.taxRate).toFixed(2) })}</span><span>{formatMoney(order.tax)}</span></div>
          {Number(order.deliveryFee) > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.2mm 0' }}><span>{t('invoices.document.delivery')}</span><span>{formatMoney(order.deliveryFee)}</span></div>
          ) : null}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5mm', paddingTop: '2mm', borderTop: '1px solid #d1d5db', fontSize: '13px', fontWeight: 800 }}>
            <span>{t('invoices.document.total')}</span><span>{formatMoney(order.total)}</span>
          </div>
        </div>
      </section>

      {order.notes ? (
        <section style={{ marginTop: '8mm' }}>
          <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>{t('invoices.document.notes')}</p>
          <p style={{ margin: '1mm 0 0', fontSize: '10px', color: '#374151', whiteSpace: 'pre-wrap' }}>{order.notes}</p>
        </section>
      ) : null}

      <footer style={{ marginTop: '10mm', borderTop: '1px solid #e5e7eb', paddingTop: '4mm', display: 'flex', justifyContent: 'space-between', gap: '6mm', fontSize: '9.5px', color: '#6b7280' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: '#374151' }}>{settings.receiptFooter ?? t('invoices.document.thankYou')}</p>
          {contact ? <p style={{ margin: '1mm 0 0' }}>{contact}</p> : null}
        </div>
        <div style={{ textAlign: 'end' }}>
          <p style={{ margin: 0 }}>{t('invoices.document.printed', { date: formatDateTime(printedAt) })}</p>
          <p style={{ margin: '1mm 0 0', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Printer size={10} /> {invoiceNumber}</p>
        </div>
      </footer>
    </div>
  );
}
