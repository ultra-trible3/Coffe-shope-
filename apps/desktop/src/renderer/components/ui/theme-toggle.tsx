import { Moon, Sun } from 'lucide-react';
import type { ReactElement } from 'react';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/utils';
import { useThemeStore } from '../../store/theme';

export function ThemeToggle({ className }: { className?: string }): ReactElement {
  const { t } = useI18n();
  const theme = useThemeStore((state) => state.theme);
  const toggle = useThemeStore((state) => state.toggle);
  const dark = theme === 'dark';
  const label = dark ? t('theme.switchToLight') : t('theme.switchToDark');

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
      aria-label={label}
      aria-pressed={dark}
      title={label}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
