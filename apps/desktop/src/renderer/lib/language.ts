import { DEFAULT_LANGUAGE, languageDirection, normalizeLanguage, type Language } from '@pharmacy/shared';

const STORAGE_KEY = 'qahwa-language';

let activeLanguage: Language = DEFAULT_LANGUAGE;

/** Stored preference, defaulting to English (the product default). */
export function resolveInitialLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeLanguage(stored);
  } catch {
    // Storage can be unavailable in hardened contexts; fall back to English.
  }
  return DEFAULT_LANGUAGE;
}

export function getActiveLanguage(): Language {
  return activeLanguage;
}

/** Applies the language to the document so CSS and screen readers see it. */
export function applyLanguage(language: Language): void {
  activeLanguage = language;
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = language;
  root.dir = languageDirection(language);
  root.dataset.language = language;
}

export function persistLanguage(language: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The active language still applies for this session.
  }
}

export function initLanguage(): Language {
  const language = resolveInitialLanguage();
  applyLanguage(language);
  return language;
}

export function isRtlLanguage(language: Language): boolean {
  return languageDirection(language) === 'rtl';
}
