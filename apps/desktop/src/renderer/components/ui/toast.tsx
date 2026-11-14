import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { type ReactElement } from 'react';
import { create } from 'zustand';
import { useI18n, type TranslationKey } from '../../i18n';
import { cn } from '../../lib/utils';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
  title?: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 6_000);
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Imperative helpers usable from anywhere (event handlers, query callbacks). */
export const toast = {
  success: (message: string, title?: string) =>
    useToastStore.getState().push({ variant: 'success', message, ...(title ? { title } : {}) }),
  error: (message: string, title?: string) =>
    useToastStore.getState().push({ variant: 'error', message, ...(title ? { title } : {}) }),
  info: (message: string, title?: string) =>
    useToastStore.getState().push({ variant: 'info', message, ...(title ? { title } : {}) }),
};

const VARIANTS: Record<
  ToastVariant,
  {
    Icon: typeof CheckCircle2;
    labelKey: TranslationKey;
    rail: string;
    tile: string;
    labelColor: string;
  }
> = {
  success: {
    Icon: CheckCircle2,
    labelKey: 'toast.success',
    rail: 'bg-success',
    tile: 'bg-success/10 text-success',
    labelColor: 'text-success',
  },
  error: {
    Icon: AlertTriangle,
    labelKey: 'toast.error',
    rail: 'bg-destructive',
    tile: 'bg-destructive/10 text-destructive',
    labelColor: 'text-destructive',
  },
  info: {
    Icon: Info,
    labelKey: 'toast.info',
    rail: 'bg-info',
    tile: 'bg-info/10 text-info',
    labelColor: 'text-info',
  },
};

/** Renders the toast stack. Mounted once at the application root. */
export function Toaster(): ReactElement {
  const { t } = useI18n();
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      className="pointer-events-none fixed bottom-4 start-4 z-[100] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2"
      role="region"
      aria-label={t('toast.notifications')}
    >
      {toasts.map((item) => {
        const variant = VARIANTS[item.variant];
        const { Icon } = variant;
        return (
          <div
            key={item.id}
            role={item.variant === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto relative overflow-hidden rounded-lg border border-border bg-card shadow-pop animate-toast-in"
          >
            <span aria-hidden="true" className={cn('absolute inset-y-0 start-0 w-[3px]', variant.rail)} />
            <div className="flex items-start gap-3 py-3 ps-4 pe-2.5">
              <span
                className={cn(
                  'mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                  variant.tile,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-[10px] font-semibold uppercase leading-4 tracking-[0.14em]',
                    variant.labelColor,
                  )}
                >
                  {t(variant.labelKey)}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold leading-5 text-foreground">
                  {item.title ?? item.message}
                </p>
                {item.title ? (
                  <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">{item.message}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label={t('toast.dismiss')}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-ring"
                onClick={() => dismiss(item.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <span
              aria-hidden="true"
              className={cn(
                'absolute bottom-0 start-0 h-[2px] w-full origin-left opacity-40 animate-toast-progress rtl:origin-right',
                variant.rail,
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
