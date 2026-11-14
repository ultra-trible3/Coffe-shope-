import type { ReactElement } from 'react';
import { useI18n } from '../../i18n';
import { Skeleton, SkeletonPanel, SkeletonStatCard, SkeletonTable } from '../ui/skeleton';

export function DashboardSkeleton(): ReactElement {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t('skeletons.dashboard')}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex h-[22px] items-center">
            <Skeleton className="h-3.5 w-40" />
          </div>
          <Skeleton className="mt-2 h-3 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton radius="lg" className="h-9 w-[150px]" />
          <Skeleton radius="lg" className="h-9 w-9" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SkeletonPanel className="xl:col-span-2" action titleWidth="w-32" descriptionWidth="w-48">
          <div className="p-3 pb-1">
            <Skeleton radius="lg" className="h-[260px] w-full" />
          </div>
        </SkeletonPanel>

        <SkeletonPanel titleWidth="w-24" descriptionWidth="w-36">
          <div className="flex flex-col items-center gap-4 p-4">
            <Skeleton radius="full" className="h-40 w-40" />
            <div className="w-full space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Skeleton radius="full" className="h-2.5 w-2.5" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="ms-auto h-3 w-14" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          </div>
        </SkeletonPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <SkeletonPanel titleWidth="w-32" descriptionWidth="w-56">
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-2.5 w-28" />
                </div>
                <Skeleton radius="full" className="mt-1.5 h-2 w-full" />
              </div>
            ))}
          </div>
        </SkeletonPanel>

        <SkeletonPanel titleWidth="w-24" descriptionWidth="w-40">
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-2.5">
                <Skeleton radius="md" className="h-6 w-6 shrink-0" />
                <Skeleton radius="lg" className="h-9 w-9 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
                <div className="space-y-1.5 text-end">
                  <Skeleton className="ms-auto h-3 w-16" />
                  <Skeleton className="ms-auto h-2.5 w-10" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <SkeletonPanel action titleWidth="w-28" descriptionWidth="w-48">
          <SkeletonTable
            rows={5}
            columns={[
              { kind: 'double', label: 'Order' },
              { kind: 'short', label: 'Type' },
              { kind: 'badge', label: 'Status' },
              { kind: 'amount', label: 'Total' },
              { kind: 'muted', label: 'Time' },
            ]}
          />
        </SkeletonPanel>

        <div className="space-y-4">
          <SkeletonPanel titleWidth="w-28" descriptionWidth="w-40">
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-2.5">
                  <Skeleton radius="lg" className="h-8 w-8 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-32" />
                  </div>
                  <Skeleton radius="full" className="h-4 w-10" />
                </div>
              ))}
            </div>
          </SkeletonPanel>

          <SkeletonPanel titleWidth="w-24" descriptionWidth="w-48">
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-start gap-3 px-4 py-2.5">
                  <Skeleton radius="full" className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-2.5 w-36" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </SkeletonPanel>
        </div>
      </div>

      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}
