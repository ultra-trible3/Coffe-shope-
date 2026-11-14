import { Coffee } from 'lucide-react';
import type { ReactElement } from 'react';
import type { OrderDto, SettingsDto } from '@pharmacy/shared';
import { formatDateTime, formatNumber, formatTime, orderTypeLabel } from '../../lib/format';
import { estimatePrepMinutes, estimatedReadyAt } from '../../lib/order-prep';
import { useI18n } from '../../i18n';
import type { InvoiceFormat } from './InvoiceDocument';
import { KitchenTicket } from './KitchenTicket';

/**
 * Kitchen docket printed right after the customer invoice. It mirrors the
 * invoice header and lines but drops prices and guest contact details, and
 * highlights the expected ready time so the line can start immediately.
 */
export function KitchenCopy({
  order,
  settings,
  format,
  standalone = false,
}: {
  order: OrderDto;
  settings: SettingsDto;
  format: InvoiceFormat;
  /** True when the kitchen ticket prints on its own page under an A4 invoice. */
  standalone?: boolean;
}): ReactElement {
  const { t } = useI18n();
  const minutes = estimatePrepMinutes(order);
  const readyAt = estimatedReadyAt(order);
  const printedAt = new Date();
  const tableLabel = order.tableNumber
    ? t('invoices.document.table', { number: order.tableNumber })
    : '';
  const orderType = orderTypeLabel(order.type);
  const readyIn = t('invoices.document.readyIn', { minutes: formatNumber(minutes) });

  if (format === 'thermal') {
    return (
      <KitchenTicket
        standalone={standalone}
        order={{
          ...order,
          items: order.items.map((item) => ({
            ...item,
            toppings: item.toppings.map((topping) => topping.name),
          })),
        }}
      />
    );
  }

  return (
    <div className="kitchen-sheet">
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8mm',
          borderBottom: '3px solid #14110f',
          paddingBottom: '5mm',
        }}
      >
        <div style={{ display: 'flex', gap: '4mm', alignItems: 'flex-start' }}>
          <span
            style={{
              display: 'flex',
              width: '14mm',
              height: '14mm',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '3mm',
              background: '#14110f',
              color: '#fff',
            }}
          >
            <Coffee style={{ width: '7mm', height: '7mm' }} />
          </span>
          <div>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '0.14em' }}>
              {t('app.name').toUpperCase()}
            </p>
            <p style={{ margin: '1mm 0 0', fontSize: '11px', fontWeight: 600, color: '#4b5563' }}>
              {settings.name}
            </p>
            <p style={{ margin: '2mm 0 0', fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em' }}>
              {t('invoices.document.kitchenCopy')}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'end' }}>
          <p style={{ margin: 0, fontSize: '26px', fontWeight: 800, letterSpacing: '0.02em' }}>
            {order.orderNumber}
          </p>
          <p style={{ margin: '2mm 0 0', fontSize: '11px', color: '#374151' }}>
            {t('invoices.document.orderReceived')}: {formatTime(order.createdAt)}
          </p>
          <p style={{ margin: '0.5mm 0 0', fontSize: '11px', color: '#374151' }}>
            {orderType}{tableLabel ? ` · ${tableLabel}` : ''}
          </p>
        </div>
      </header>

      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8mm',
          marginTop: '6mm',
          padding: '4mm 5mm',
          border: '2px solid #14110f',
          borderRadius: '2mm',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em' }}>
            {t('invoices.document.startPreparation')}
          </p>
          <p style={{ margin: '1mm 0 0', fontSize: '11px', color: '#374151' }}>
            {t('invoices.document.cookTime')}: {readyIn}
          </p>
        </div>
        <div style={{ textAlign: 'end' }}>
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4b5563' }}>
            {t('invoices.document.estimatedReady')}
          </p>
          <p style={{ margin: '0.5mm 0 0', fontSize: '24px', fontWeight: 800, lineHeight: 1 }}>
            {formatTime(readyAt)}
          </p>
        </div>
      </section>

      <ul style={{ listStyle: 'none', margin: '7mm 0 0', padding: 0 }}>
        {order.items.map((item) => (
          <li
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '4mm',
              padding: '3mm 0',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <span
              style={{
                display: 'flex',
                minWidth: '11mm',
                height: '11mm',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2mm',
                background: '#14110f',
                color: '#fff',
                fontSize: '17px',
                fontWeight: 800,
              }}
            >
              {formatNumber(item.quantity)}×
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                {item.name}
                {item.sizeName ? (
                  <span style={{ marginInlineStart: '2mm', fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>
                    {item.sizeName}
                  </span>
                ) : null}
              </p>
              {item.toppings.length > 0 ? (
                <p style={{ margin: '1mm 0 0', fontSize: '12px', color: '#374151' }}>
                  + {item.toppings.map((topping) => topping.name).join(', ')}
                </p>
              ) : null}
              {item.specialInstructions ? (
                <p style={{ margin: '1.5mm 0 0', fontSize: '12px', fontStyle: 'italic', fontWeight: 600 }}>
                  “{item.specialInstructions}”
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {order.notes ? (
        <section style={{ marginTop: '6mm', padding: '3mm 4mm', border: '1px solid #14110f', borderRadius: '2mm' }}>
          <p style={{ margin: 0, fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {t('invoices.document.notes')}
          </p>
          <p style={{ margin: '1mm 0 0', fontSize: '13px', fontWeight: 600, whiteSpace: 'pre-wrap' }}>
            {order.notes}
          </p>
        </section>
      ) : null}

      <footer
        style={{
          marginTop: '8mm',
          paddingTop: '3mm',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '6mm',
          fontSize: '9.5px',
          color: '#6b7280',
        }}
      >
        <span style={{ fontWeight: 700, color: '#374151' }}>{t('invoices.document.startPreparation')}</span>
        <span>{t('invoices.document.printed', { date: formatDateTime(printedAt) })}</span>
      </footer>
    </div>
  );
}
