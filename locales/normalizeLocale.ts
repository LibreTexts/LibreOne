/**
 * Normalize the locale string to the format xx-YY
 * @param rawLocale - The raw locale string
 * @returns - The normalized locale string. DOES NOT validate the locale, only normalizes the casing.
 */
export function normalizeLocale(rawLocale: string) {
  let normalizedLocale = rawLocale;
  const splitLocale = rawLocale?.split("-");
  if (splitLocale?.length > 1) {
    normalizedLocale = `${splitLocale[0]}-${splitLocale[1].toUpperCase()}`;
  }
  return normalizedLocale;
}
