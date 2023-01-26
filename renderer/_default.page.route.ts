import { locales } from '@locales/index';
import type { PageContextBuiltIn } from 'vite-plugin-ssr';

interface LocaleURLExtraction {
  locale: string;
  urlWithoutLocale: string;
}

const LOCALE_REGEXES = locales.map((loc) => new RegExp(`/${loc}/`));

/**
 * Extracts and removes the locale setting from the URL, then updates the PageContext
 * to continue routing.
 *
 * @param pageContext - Current page context being routed.
 * @returns The updated page context with locale and URL (sans locale setting).
 */
export function onBeforeRoute(pageContext: PageContextBuiltIn) {
  const { urlWithoutLocale, locale } = extractURLLocale(pageContext.urlOriginal);
  return {
    pageContext: {
      locale,
      urlOriginal: urlWithoutLocale,
    },
  };
}

/**
 * Extracts the locale setting from a URL by comparing against the list of supported locales.
 *
 * @param url - The URL to extract a locale from.
 * @returns The locale setting to be used in rendering, and the URL (sans locale setting).
 */
function extractURLLocale(url: string): LocaleURLExtraction {
  let locale = 'en-us';
  let urlWithoutLocale = url;
  const foundLocale = LOCALE_REGEXES.find((regex) => regex.test(url));
  if (foundLocale) {
    const cleanedURL = url.replace(/^\/+/, ''); // remove leading slash
    const splitURL = cleanedURL.split('/');
    if (splitURL.length > 1) {
      locale = splitURL[0].toLowerCase();
      urlWithoutLocale = `/${splitURL.slice(1).join('/')}`;
    }
  }
  return {
    locale,
    urlWithoutLocale,
  };
}
