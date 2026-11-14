import type { ReactElement } from 'react';
import qahwaLogo from '../../assets/qahwa-logo.svg';
import latte from '../../assets/products/latte.jpg';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/utils';

export function CoffeeLoader({
  title,
  subtitle,
  overlay = false,
  leaving = false,
}: {
  title: string;
  subtitle: string;
  overlay?: boolean;
  leaving?: boolean;
}): ReactElement {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
      className={cn(
        'z-[200] flex flex-col items-center justify-center overflow-hidden bg-[#140e0a] text-white',
        overlay ? 'fixed inset-0' : 'relative min-h-screen w-full',
        leaving ? 'coffee-loader-leaving pointer-events-none' : 'animate-fade-in',
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,hsl(30_68%_46%/0.24),transparent_62%)]" />
        <span className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/55 to-transparent" />
        <span className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent" />
      </span>

      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="relative flex h-40 w-40 items-center justify-center">
          <span className="coffee-loader-glow" aria-hidden="true" />
          <span aria-hidden="true" className="absolute inset-0 rounded-full border border-white/10" />
          <span className="coffee-ring" aria-hidden="true" />
          <img
            src={latte}
            alt=""
            className="h-[118px] w-[118px] rounded-full object-cover shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9)] ring-1 ring-white/15"
          />
          <span className="absolute -bottom-1 end-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#140e0a] ring-1 ring-white/15">
            <img src={qahwaLogo} alt="" className="h-7 w-7 rounded-full" />
          </span>
        </div>

        <div className="mt-8 flex items-center gap-2.5">
          <span className="font-display text-[19px] tracking-[0.18em] text-white">
            {t('app.name')}
          </span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/45">
            {t('app.company')}
          </span>
        </div>

        <p className="mt-7 font-display text-[28px] leading-none tracking-[0.01em] text-white">
          {title}
        </p>
        <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-white/55">{subtitle}</p>

        <span
          aria-hidden="true"
          className="mt-7 block h-[3px] w-56 overflow-hidden rounded-full bg-white/10"
        >
          <span className="coffee-loader-bar block h-full rounded-full bg-gradient-to-r from-secondary to-accent" />
        </span>

        <p className="mt-12 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30">
          {t('app.tagline')}
        </p>
      </div>
    </div>
  );
}
