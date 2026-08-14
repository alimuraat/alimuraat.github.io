/**
 * Two locales: English at the root, Turkish under /tr/.
 *
 * Copy in src/data/*.json is stored as { "en": ..., "tr": ... } wherever a
 * value is translatable, and as a plain value wherever it is not — ids,
 * severities, coordinates, hrefs and the research `published` flag stay
 * single-source so the two languages can never drift apart on anything that
 * matters. `t()` resolves either shape.
 */
export const LOCALES = ['en', 'tr'] as const;
export type Lang = (typeof LOCALES)[number];

export const LOCALE_TAG: Record<Lang, string> = { en: 'en', tr: 'tr' };
export const OG_LOCALE: Record<Lang, string> = { en: 'en_US', tr: 'tr_TR' };

type Localized<T> = { en: T; tr?: T };

export function t<T>(value: Localized<T> | T, lang: Lang): T {
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && 'en' in value) {
    const v = value as Localized<T>;
    return (v[lang] ?? v.en) as T;
  }
  return value as T;
}

/** '/experience/' -> '/tr/experience/' for Turkish, unchanged for English. */
export const localePath = (href: string, lang: Lang): string =>
  lang === 'en' ? href : `/tr${href}`;

/** '/tr/experience/' -> '/experience/'. Used to build the language switcher. */
export const basePath = (pathname: string): string =>
  pathname.replace(/^\/tr(?=\/|$)/, '') || '/';
