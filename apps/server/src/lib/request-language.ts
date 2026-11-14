import { AsyncLocalStorage } from 'node:async_hooks';
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  type Language,
} from '@pharmacy/shared';

const storage = new AsyncLocalStorage<Language>();

export function currentLanguage(): Language {
  return storage.getStore() ?? DEFAULT_LANGUAGE;
}

export function runWithLanguage<T>(language: Language, callback: () => T): T {
  return storage.run(language, callback);
}

function fromAcceptLanguage(header: string): Language {
  const tokens = header
    .split(',')
    .map((part) => part.trim().split(';')[0]?.trim().toLowerCase() ?? '')
    .filter(Boolean);
  for (const token of tokens) {
    if (token === 'ar' || token.startsWith('ar-')) return 'ar';
    if (token === 'en' || token.startsWith('en-')) return 'en';
  }
  return DEFAULT_LANGUAGE;
}

export function resolveRequestLanguage(input: {
  query?: unknown;
  header?: unknown;
  acceptLanguage?: unknown;
}): Language {
  if (typeof input.query === 'string' && input.query.trim()) {
    return normalizeLanguage(input.query);
  }
  if (typeof input.header === 'string' && input.header.trim()) {
    return normalizeLanguage(input.header);
  }
  if (typeof input.acceptLanguage === 'string' && input.acceptLanguage.trim()) {
    return fromAcceptLanguage(input.acceptLanguage);
  }
  return DEFAULT_LANGUAGE;
}
