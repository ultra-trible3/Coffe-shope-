import type { ReactElement, ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatDecimal } from '../../lib/format';
import { cn } from '../../lib/utils';

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  change,
  changeLabel,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'neutral' | 'red' | 'orange' | 'green' | 'blue' | 'amber';
  change?: number | null;
  changeLabel?: string;
  className?: string;
}): ReactElement {
  const tones: Record<string, string> = {
    neutral: 'bg-primary/10 text-primary',
    red: 'bg-secondary/10 text-secondary',
    orange: 'bg-brand-orange/10 text-brand-orange',
    green: 'bg-success/10 text-success',
    blue: 'bg-info/10 text-info',
    amber: 'bg-warning/15 text-warning-strong',
  };
  const rising = change !== undefined && change !== null && change > 0;
  const falling = change !== undefined && change !== null && change < 0;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="numeric mt-2.5 text-[22px] font-bold leading-tight tracking-tight">{value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        {change !== undefined ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
              rising && 'bg-success/10 text-success',
              falling && 'bg-destructive/10 text-destructive',
              !rising && !falling && 'bg-muted text-muted-foreground',
            )}
          >
            {rising ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : falling ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {change === null ? '—' : `${formatDecimal(Math.abs(change), 1)}%`}
          </span>
        ) : null}
        {changeLabel ? <span className="text-muted-foreground">{changeLabel}</span> : null}
        {hint && !changeLabel ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}
