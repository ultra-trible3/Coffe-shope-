import type { ReactElement } from 'react';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/utils';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({
  slices,
  centerLabel,
  centerValue,
  className,
  size = 168,
}: {
  slices: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
  className?: string;
  size?: number;
}): ReactElement {
  const { t } = useI18n();
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let offset = 0;

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={t('charts.distributionAria')}
      >
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />
        {total > 0
          ? slices.map((slice) => {
              const length = (slice.value / total) * CIRCUMFERENCE;
              const dash = `${Math.max(length - 2, 0)} ${CIRCUMFERENCE}`;
              const element = (
                <circle
                  key={slice.label}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="12"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                />
              );
              offset += length;
              return element;
            })
          : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {centerValue ? <p className="numeric text-lg font-bold leading-tight">{centerValue}</p> : null}
        {centerLabel ? <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{centerLabel}</p> : null}
      </div>
    </div>
  );
}
