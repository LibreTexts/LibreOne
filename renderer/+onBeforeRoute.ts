import { extractLocale } from "@locales/extractLocale";
import type { OnBeforeRouteSync } from "vike/types";
import { modifyUrl } from "vike/modifyUrl";

const onBeforeRoute: OnBeforeRouteSync = (
  pageContext
): ReturnType<OnBeforeRouteSync> => {
  const url = pageContext.urlParsed;
  const { urlPathnameWithoutLocale, locale } = extractLocale(url.pathname);
  const urlLogical = modifyUrl(url.href, {
    pathname: urlPathnameWithoutLocale,
  });

  // We specifically do not return the whole pageContext object here per https://vike.dev/pageContext-manipulation#do-not-return-entire-pagecontext
  return { pageContext: { locale, urlLogical } };
};

export { onBeforeRoute };
