import { usePageContext } from "./usePageContext";

/**
 * Extracts the pageProps object from the current page context.
 * Accepts a generic type param of the expected shape of the pageProps object.
 * This function checks if each param is present in the pageProps object and returns the value. (or undefined if not present)
 */
export function usePageProps<T extends Record<string, unknown>>(
): Partial<T> {
  const pageContext = usePageContext().value;
  const pageProps = pageContext.pageProps;
  // for each key in pageProps, check if it is "in" pageContext.value.pageProps and return the value
  if (!pageProps) {
    return {} as T;
  }

  return Object.keys(pageProps).reduce((acc, key) => {
    if (pageProps === undefined) {
      return acc;
    }

    if (key in pageProps) {
      // @ts-ignore
      acc[key] = pageProps[key];
    }
    return acc;
  }, {} as T);
}
