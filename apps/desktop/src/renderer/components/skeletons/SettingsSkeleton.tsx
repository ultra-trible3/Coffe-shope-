import type { ReactElement } from 'react';
import { useI18n } from '../../i18n';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

function FieldSkeleton({ helper = false }: { helper?: boolean }): ReactElement {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton radius="lg" className="h-9 w-full" />
      {helper ? <Skeleton className="h-2.5 w-3/4" /> : null}
    </div>
  );
}

function CardHeadingSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="h-3.5 w-40" />
      <Skeleton className="h-2.5 w-56" />
    </div>
  );
}

export function SettingsSkeleton(): ReactElement {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t('skeletons.settings')}
      className="space-y-4"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardHeadingSkeleton />
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldSkeleton />
            <FieldSkeleton />
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton radius="lg" className="h-[58px] w-full" />
            </div>
            <FieldSkeleton helper />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardHeadingSkeleton />
            </CardHeader>
            <CardContent className="space-y-3">
              <FieldSkeleton helper />
              <FieldSkeleton helper />
              <FieldSkeleton helper />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardHeadingSkeleton />
            </CardHeader>
            <CardContent>
              <Skeleton radius="lg" className="h-[76px] w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-3 w-40" />
            </CardFooter>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Skeleton className="h-3 w-80" />
          <div className="flex items-center gap-2">
            <Skeleton radius="lg" className="h-9 w-24" />
            <Skeleton radius="lg" className="h-9 w-28" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
