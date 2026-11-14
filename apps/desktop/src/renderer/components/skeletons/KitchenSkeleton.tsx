import type { ReactElement } from 'react';
import { useI18n } from '../../i18n';
import { Skeleton } from '../ui/skeleton';

export function KitchenTicketSkeleton(): ReactElement {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-2.5 w-24" />
        </div>
        <Skeleton radius="full" className="h-5 w-16" />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-start gap-2">
              <Skeleton radius="md" className="h-6 w-6 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <div className="border-t border-border p-3">
        <Skeleton radius="lg" className="h-12 w-full" />
      </div>
    </div>
  );
}

export function KitchenSkeleton(): ReactElement {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t('skeletons.kitchen')}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton radius="full" className="h-2.5 w-2.5" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton radius="lg" className="h-9 w-28" />
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} radius="lg" className="h-10 min-w-[130px] flex-1" />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <KitchenTicketSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
