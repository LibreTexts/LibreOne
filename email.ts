/**
 * Canonical email address normalization, shared by the server and the browser bundle.
 *
 * The contract is: trim surrounding whitespace, apply Unicode NFC so visually identical
 * addresses have identical bytes, then lowercase with the locale-invariant `toLowerCase`
 * (never `toLocaleLowerCase`, which would fold `I` differently under a Turkish locale).
 *
 * Diacritics are preserved on purpose: `jose@example.com` and `josé@example.com` are
 * distinct addresses per RFC 5321 and are treated as such here. Gmail-style dot and
 * plus-tag stripping is also deliberately absent, since both are significant at most
 * providers and folding them would merge unrelated accounts.
 */
export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().normalize('NFC').toLowerCase();
}
