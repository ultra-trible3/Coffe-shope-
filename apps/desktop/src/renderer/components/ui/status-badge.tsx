import type { ReactElement } from 'react';
import type { OrderStatus } from '@pharmacy/shared';
import { translate } from '../../i18n/dictionaries';
import { getActiveLanguage } from '../../lib/language';
import { ORDER_STATUS_TONES, orderStatusLabel } from '../../lib/format';
import { cn } from '../../lib/utils';

const TONE_CLASSES: Record<string, string> = {
  amber:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  orange:
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300',
  green:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  neutral: 'border-border bg-muted text-muted-foreground',
};

export function StatusBadge({
  tone = 'neutral',
  label,
  dot = true,
  className,
}: {
  tone?: keyof typeof TONE_CLASSES;
  label: string;
  dot?: boolean;
  className?: string;
}): ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
        TONE_CLASSES[tone] ?? TONE_CLASSES.neutral,
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }): ReactElement {
  return <StatusBadge tone={ORDER_STATUS_TONES[status]} label={orderStatusLabel(status)} />;
}

export function PaymentBadge({ status }: { status: 'PAID' | 'UNPAID' | 'REFUNDED' }): ReactElement {
  const tone = status === 'PAID' ? 'green' : status === 'REFUNDED' ? 'amber' : 'neutral';
  return (
    <StatusBadge
      tone={tone}
      label={translate(getActiveLanguage(), `labels.paymentStatus.${status}`)}
    />
  );
}
