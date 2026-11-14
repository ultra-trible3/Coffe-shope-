/** Bilingual contract shared by the API server and the desktop client. */

export const LANGUAGES = ['en', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';

/** Accepts `ar`, `ar-EG`, `ar_EG`, `en-US`, … and falls back to English. */
export function normalizeLanguage(value: unknown): Language {
  if (typeof value !== 'string') return DEFAULT_LANGUAGE;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return DEFAULT_LANGUAGE;
  if (normalized === 'ar' || normalized.startsWith('ar-') || normalized.startsWith('ar_')) {
    return 'ar';
  }
  return DEFAULT_LANGUAGE;
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ar';
}

export function languageLocale(language: Language): string {
  return language === 'ar' ? 'ar-EG' : 'en-EG';
}

export function languageDirection(language: Language): 'ltr' | 'rtl' {
  return language === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Resolves a bilingual pair for display. The selected language wins; when it
 * is missing the other language is used so records created before a
 * translation was added still render.
 */
export function pickLocalized(
  language: Language,
  english: string | null | undefined,
  arabic: string | null | undefined,
): string {
  const preferred = language === 'ar' ? arabic : english;
  const fallback = language === 'ar' ? english : arabic;
  return preferred?.trim() || fallback?.trim() || '';
}

export function pickLocalizedNullable(
  language: Language,
  english: string | null | undefined,
  arabic: string | null | undefined,
): string | null {
  const value = pickLocalized(language, english, arabic);
  return value.length > 0 ? value : null;
}
