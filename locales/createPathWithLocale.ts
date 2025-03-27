import { localeDefault } from ".";

export default function createPathWithLocale(
  pathname: string,
  pageContext: { locale?: string }
) {
  const startsWithSlash = pathname.startsWith("/");
  if (!pageContext.locale || pageContext.locale === localeDefault) {
    return startsWithSlash ? pathname : `/${pathname}`;
  }

  return `/${pageContext.locale}${startsWithSlash ? "" : "/"}${pathname}`;
}
