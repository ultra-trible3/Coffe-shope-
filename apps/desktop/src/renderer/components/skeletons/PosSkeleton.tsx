import type { ReactElement } from 'react';
import { useI18n } from '../../i18n';
import { Skeleton, SkeletonChip } from '../ui/skeleton';

function ProductCardSkeleton(): ReactElement {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton radius="none" className="h-24 w-full" />
      <div className="p-2.5">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="mt-1.5 h-2.5 w-1/3" />
        <div className="mt-2 flex items-center justify-between">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton radius="full" className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function PosSkeleton(): ReactElement {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t('skeletons.pos')}
      className="grid min-h-0 gap-4 xl:h-[calc(100vh-8.5rem)] xl:grid-cols-[minmax(0,1.15fr)_340px_390px]"
    >
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="space-y-3 border-b border-border p-3">
          <Skeleton radius="lg" className="h-10 w-full" />
          <div className="flex gap-1.5 overflow-hidden pb-1">
            <SkeletonChip className="w-24" />
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonChip key={index} className={index % 2 === 0 ? 'w-24' : 'w-20'} />
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {Array.from({ length: 12 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <header className="border-b border-border px-4 py-3">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="mt-1.5 h-2.5 w-36" />
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-hidden p-4">
          <div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <Skeleton radius="lg" className="h-16 w-16 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2 py-0.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
              <Skeleton className="h-2.5 w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton radius="lg" className="h-[54px] w-full" />
              <Skeleton radius="lg" className="h-[54px] w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-2.5 w-12" />
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} radius="lg" className="h-9 w-full" />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <Skeleton className="h-2.5 w-14" />
              <Skeleton radius="lg" className="mt-2 h-9 w-28" />
            </div>
            <Skeleton radius="lg" className="h-10 w-32" />
          </div>

          <Skeleton radius="lg" className="h-10 w-full" />
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <header className="border-b border-border px-4 py-3">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="mt-1.5 h-2.5 w-28" />
        </header>

        <div className="flex gap-1 border-b border-border p-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} radius="md" className="h-7 flex-1" />
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-3 border-b border-border p-3">
          <Skeleton radius="lg" className="h-8 w-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton radius="lg" className="h-8 w-full" />
            <Skeleton radius="lg" className="h-8 w-full" />
          </div>
          <Skeleton radius="lg" className="h-8 w-full" />
          <div className="space-y-3 pt-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-start gap-2.5">
                <Skeleton radius="lg" className="h-11 w-11 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="ms-auto h-3 w-14" />
                  <Skeleton className="ms-auto h-2.5 w-10" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-border bg-muted/30 p-3">
          <div className="space-y-1.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} radius="md" className="h-7" />
            ))}
          </div>
          <Skeleton radius="lg" className="h-8 w-full" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} radius="sm" className="h-5 w-12" />
            ))}
          </div>
          <Skeleton radius="lg" className="h-11 w-full" />
        </div>
      </section>
    </div>
  );
}
