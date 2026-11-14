import type { ReactElement, ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from './button';
import { cn } from '../../lib/utils';

export function ErrorState({
  title,
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}): ReactElement {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-10 text-center', className)} role="alert">
      <AlertTriangle className="h-7 w-7 text-destructive" />
      <div>
        <p className="text-sm font-semibold text-foreground">{title ?? t('states.error')}</p>
        {message ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p> : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          {t('states.retry')}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyPanel({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {message ? <p className="mt-1 text-sm text-muted-foreground">{message}</p> : null}
      </div>
      {action}
    </div>
  );
}
