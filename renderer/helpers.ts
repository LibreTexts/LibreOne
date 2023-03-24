import type { PageContextServer } from '@renderer/types';

export function buildLocalizedServerRedirectURL(pageContext: PageContextServer, path: string): string {
  const localePart = pageContext.locale === 'en-us' ? null : pageContext.locale;
  return `${localePart ? `/${localePart}` : ''}${path.startsWith('/') ? path : `/${path}`}`;
}
