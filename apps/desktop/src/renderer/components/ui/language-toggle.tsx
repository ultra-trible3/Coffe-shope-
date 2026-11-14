import type { ReactElement } from 'react';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/utils';

export function LanguageToggle({ className }: { className?: string }): ReactElement {
  const { language, toggleLanguage, t } = useI18n();
  const isArabic = language === 'ar';
  const label = isArabic ? t('language.switchToEnglish') : t('language.switchToArabic');

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={cn(
        'focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
      aria-label={label}
      aria-pressed={isArabic}
      title={label}
    >
      <span className="text-[11px] font-bold tracking-wide">
        {t(isArabic ? 'language.englishShort' : 'language.arabicShort')}
      </span>
    </button>
  );
}
