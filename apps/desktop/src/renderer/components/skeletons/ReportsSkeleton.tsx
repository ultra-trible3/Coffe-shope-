import type { ReactElement, ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Skeleton, SkeletonStatCard, SkeletonTable } from '../ui/skeleton';

function ReportCard({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-1 p-4">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-2.5 w-48" />
      </div>
      <div className="p-4 pt-0">{children}</div>
    </div>
  );
}

export function ReportsSkeleton(): ReactElement {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t('skeletons.reports')}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonStatCard key={index} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ReportCard>
          <Skeleton radius="lg" className="h-[300px] w-full" />
        </ReportCard>

        <ReportCard>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between py-0.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-2.5 w-full" />
          </div>
        </ReportCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportCard>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index}>
                <div className="mb-1 flex items-center justify-between">
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-2.5 w-28" />
                </div>
                <Skeleton radius="full" className="h-2 w-full" />
              </div>
            ))}
          </div>
        </ReportCard>

        <ReportCard>
          <div className="flex flex-wrap items-center gap-5">
            <Skeleton radius="full" className="h-40 w-40" />
            <div className="min-w-40 flex-1 space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Skeleton radius="full" className="h-2.5 w-2.5" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="ms-auto h-3 w-10" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
        </ReportCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportCard>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
                <Skeleton radius="full" className="h-6 w-6 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton radius="full" className="h-1.5 w-full" />
                </div>
                <div className="space-y-1.5 text-end">
                  <Skeleton className="ms-auto h-3 w-8" />
                  <Skeleton className="ms-auto h-2.5 w-14" />
                </div>
              </div>
            ))}
          </div>
        </ReportCard>

        <ReportCard>
          <SkeletonTable
            rows={4}
            columns={[
              { kind: 'text', label: 'Cashier' },
              { kind: 'amount', label: 'Orders' },
              { kind: 'amount', label: 'Revenue' },
              { kind: 'amount', label: 'Average' },
            ]}
          />
        </ReportCard>
      </div>
    </div>
  );
}
