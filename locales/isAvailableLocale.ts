import { locales } from ".";

export function isAvailableLocale(locale: string) {
  return locales.includes(locale.toLowerCase());
}
