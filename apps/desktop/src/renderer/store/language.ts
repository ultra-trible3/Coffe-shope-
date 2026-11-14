import type { Language } from '@pharmacy/shared';
import { create } from 'zustand';
import {
  applyLanguage,
  persistLanguage,
  resolveInitialLanguage,
} from '../lib/language';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  toggle: () => void;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: resolveInitialLanguage(),
  setLanguage: (language) => {
    if (language === get().language) return;
    applyLanguage(language);
    persistLanguage(language);
    set({ language });
  },
  toggle: () => get().setLanguage(get().language === 'ar' ? 'en' : 'ar'),
}));
