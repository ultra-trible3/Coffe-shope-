import {
  languageDirection,
  languageLocale,
  pickLocalized,
  type Language,
} from '@pharmacy/shared';
import { useCallback } from 'react';
import { useLanguageStore } from '../store/language';
import { translate, type Translate, type TranslationVars } from './dictionaries';

export * from './dictionaries';

export interface I18n {
  language: Language;
  locale: string;
  direction: 'ltr' | 'rtl';
  isRtl: boolean;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: Translate;
  /** Active-language value with English fallback for admin-managed content. */
  pick: (english: string | null | undefined, arabic: string | null | undefined) => string;
}

export function useI18n(): I18n {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const toggleLanguage = useLanguageStore((state) => state.toggle);

  const t = useCallback<Translate>(
    (key, vars?: TranslationVars) => translate(language, key, vars),
    [language],
  );
  const pick = useCallback(
    (english: string | null | undefined, arabic: string | null | undefined) =>
      pickLocalized(language, english, arabic),
    [language],
  );

  return {
    language,
    locale: languageLocale(language),
    direction: languageDirection(language),
    isRtl: language === 'ar',
    setLanguage,
    toggleLanguage,
    t,
    pick,
  };
}
