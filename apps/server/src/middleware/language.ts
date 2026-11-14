import type { NextFunction, Request, Response } from 'express';
import { resolveRequestLanguage, runWithLanguage } from '../lib/request-language.js';

/**
 * Resolves the response language before validation strips unknown query keys.
 * `?lang=` wins, then `X-Language`, then `Accept-Language`, then English.
 */
export function language(req: Request, res: Response, next: NextFunction): void {
  const queryLang = Array.isArray(req.query.lang) ? req.query.lang[0] : req.query.lang;
  const language = resolveRequestLanguage({
    query: queryLang,
    header: req.header('x-language'),
    acceptLanguage: req.header('accept-language'),
  });

  res.locals.language = language;
  res.setHeader('Content-Language', language);
  res.vary('Accept-Language');
  res.vary('X-Language');

  runWithLanguage(language, next);
}
