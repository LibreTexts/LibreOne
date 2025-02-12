import type { PageContext, PageContextServer } from "vike/types";

export function buildLocalizedServerRedirectURL(
  pageContext: PageContextServer,
  path: string
): string {
  const localePart = pageContext.locale === "en-us" ? null : pageContext.locale;
  return `${localePart ? `/${localePart}` : ""}${
    path.startsWith("/") ? path : `/${path}`
  }`;
}

export function getPageTitle(pageContext: PageContext): string {
  const title =
    // Title defined dynamically by data()
    pageContext.data?.title ||
    // Title defined statically by /pages/some-page/+title.js (or by `export default { title }` in /pages/some-page/+config.js)
    // The config 'pageContext.config.title' is a custom config we defined at ./+config.ts
    pageContext.config.title ||
    'LibreOne';
  return title
}

export function getPageDescription(pageContext: PageContext): string {
  const description =
    // Description defined dynamically by data()
    pageContext.data?.description ||
    // Description defined statically by /pages/some-page/+description.js (or by `export default { description }` in /pages/some-page/+config.js)
    // The config 'pageContext.config.description' is a custom config we defined at ./+config.ts
    pageContext.config.description ||
    "LibreOne identity management interface.";
  return description;
}
