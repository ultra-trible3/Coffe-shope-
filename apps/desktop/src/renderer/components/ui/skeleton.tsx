import type { ReactElement, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type SkeletonRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

const RADIUS_CLASS: Record<SkeletonRadius, string> = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export function Skeleton({
  className,
  radius = 'md',
}: {
  className?: string;
  radius?: SkeletonRadius;
}): ReactElement {
  return <div aria-hidden="true" className={cn('skeleton-shimmer', RADIUS_CLASS[radius], className)} />;
}

export function SkeletonText({
  lines = 3,
  widths = ['w-full', 'w-11/12', 'w-3/4'],
  className,
  lineClassName,
}: {
  lines?: number;
  widths?: string[];
  className?: string;
  lineClassName?: string;
}): ReactElement {
  return (
    <div aria-hidden="true" className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3.5', widths[index] ?? widths[widths.length - 1] ?? 'w-full', lineClassName)}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  className,
  radius = 'full',
}: {
  className?: string;
  radius?: SkeletonRadius;
}): ReactElement {
  return <Skeleton radius={radius} className={cn('h-8 w-8 shrink-0', className)} />;
}

/** Mirrors the real StatCard footprint: label, icon tile, value and hint. */
export function SkeletonStatCard({ className }: { className?: string }): ReactElement {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton radius="lg" className="h-8 w-8" />
      </div>
      <div className="mt-2.5 flex h-[27.5px] items-center">
        <Skeleton className="h-[20px] w-28" />
      </div>
      <div className="mt-1.5 flex h-[20.5px] items-center gap-1.5">
        <Skeleton radius="full" className="h-4 w-14" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/** Card shell matching the in-app Panel/Card headers. */
export function SkeletonPanel({
  className,
  action = false,
  titleWidth = 'w-28',
  descriptionWidth = 'w-40',
  children,
}: {
  className?: string;
  action?: boolean;
  titleWidth?: string;
  descriptionWidth?: string;
  children?: ReactNode;
}): ReactElement {
  return (
    <section className={cn('flex flex-col rounded-xl border border-border bg-card shadow-sm', className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <Skeleton className={cn('h-3.5', titleWidth)} />
          <Skeleton className={cn('mt-1.5 h-2.5', descriptionWidth)} />
        </div>
        {action ? <Skeleton radius="lg" className="h-7 w-24" /> : null}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export type SkeletonColumnKind =
  | 'double'
  | 'text'
  | 'short'
  | 'muted'
  | 'amount'
  | 'badge'
  | 'toggle'
  | 'actions'
  | 'avatar'
  | 'image';

export interface SkeletonColumn {
  kind?: SkeletonColumnKind;
  /** Invisible real label used to reserve the exact column width. */
  label?: string;
  /** Optional width override, e.g. `min-w-[180px]`. */
  width?: string;
}

type ColumnSpec = SkeletonColumnKind | SkeletonColumn;

const MIN_WIDTH: Record<SkeletonColumnKind, string> = {
  double: 'min-w-[120px]',
  text: 'min-w-[88px]',
  short: 'min-w-[64px]',
  muted: 'min-w-[92px]',
  amount: 'min-w-[84px]',
  badge: 'min-w-[92px]',
  toggle: 'min-w-[84px]',
  actions: 'min-w-[76px]',
  avatar: 'min-w-[160px]',
  image: 'min-w-[180px]',
};

function normalizeColumn(column: ColumnSpec): Required<Pick<SkeletonColumn, 'kind'>> & SkeletonColumn {
  return typeof column === 'string' ? { kind: column } : { kind: column.kind ?? 'text', ...column };
}

function SkeletonCell({ kind }: { kind: SkeletonColumnKind }): ReactElement {
  if (kind === 'double' || kind === 'avatar' || kind === 'image') {
    const leading =
      kind === 'avatar' ? (
        <SkeletonAvatar className="h-8 w-8" />
      ) : kind === 'image' ? (
        <Skeleton radius="lg" className="h-9 w-9 shrink-0" />
      ) : null;
    return (
      <div className="flex items-center gap-2.5">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex h-[22px] items-center">
            <Skeleton className="h-3.5 w-3/4" />
          </div>
          <div className="flex h-[14px] items-center">
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'badge') {
    return (
      <div className="flex h-[22px] items-center">
        <Skeleton radius="full" className="h-5 w-16" />
      </div>
    );
  }

  if (kind === 'toggle') {
    return (
      <div className="flex h-[22px] items-center">
        <Skeleton radius="full" className="h-5 w-9" />
      </div>
    );
  }

  if (kind === 'actions') {
    return (
      <div className="flex h-[22px] items-center justify-end gap-1">
        <Skeleton radius="md" className="h-7 w-7" />
        <Skeleton radius="md" className="h-7 w-7" />
      </div>
    );
  }

  const barClass =
    kind === 'short'
      ? 'h-3.5 w-10'
      : kind === 'muted'
        ? 'h-3 w-2/3'
        : kind === 'amount'
          ? 'ms-auto h-3.5 w-20'
          : 'h-3.5 w-3/4';

  return (
    <div className="flex h-[22px] items-center">
      <Skeleton className={barClass} />
    </div>
  );
}

/**
 * A real table skeleton: same paddings, row rhythm and column order as the
 * production tables. Real labels are rendered invisibly so column widths are
 * reserved before the data arrives, preventing a horizontal jump on load.
 */
export function SkeletonTable({
  rows = 6,
  columns,
  label,
  className,
}: {
  rows?: number;
  columns: ColumnSpec[];
  label?: string;
  className?: string;
}): ReactElement {
  const specs = columns.map(normalizeColumn);
  return (
    <div
      role={label ? 'status' : undefined}
      aria-busy={label ? true : undefined}
      aria-live={label ? 'polite' : undefined}
      aria-label={label}
      className={cn('overflow-x-auto', className)}
    >
      <table aria-hidden="true" className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            {specs.map((column, index) => (
              <th
                key={index}
                className={cn(
                  'px-3 py-2.5 font-semibold',
                  column.kind === 'amount' && 'text-end',
                  column.width ?? MIN_WIDTH[column.kind],
                )}
              >
                <span className={cn('relative inline-block', column.kind === 'amount' && 'ms-auto')}>
                  <span className="invisible whitespace-nowrap">{column.label ?? 'Loading'}</span>
                  <Skeleton className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2" />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/70 last:border-0">
              {specs.map((column, columnIndex) => (
                <td
                  key={columnIndex}
                  className={cn(
                    'px-3 py-2.5 align-middle',
                    column.kind === 'amount' && 'text-end',
                    column.width ?? MIN_WIDTH[column.kind],
                  )}
                >
                  <SkeletonCell kind={column.kind} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Small reusable chip skeleton for filter rails and category strips. */
export function SkeletonChip({ className }: { className?: string }): ReactElement {
  return <Skeleton radius="full" className={cn('h-6 w-20', className)} />;
}
