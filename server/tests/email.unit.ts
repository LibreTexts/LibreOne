import { describe, it } from 'mocha';
import { expect } from 'chai';
import { normalizeEmail } from '../../email';

describe('normalizeEmail', () => {
  it('should strip surrounding whitespace', () => {
    expect(normalizeEmail('  info@libretexts.org \t')).to.equal('info@libretexts.org');
  });

  it('should lowercase both the local part and the domain', () => {
    expect(normalizeEmail('Info.User+Tag@LibreTexts.ORG')).to.equal('info.user+tag@libretexts.org');
  });

  it('should leave an already canonical address untouched', () => {
    expect(normalizeEmail('info@libretexts.org')).to.equal('info@libretexts.org');
  });

  it('should compose decomposed characters to NFC', () => {
    // 'e' followed by U+0301 COMBINING ACUTE ACCENT vs. the single codepoint U+00E9.
    const decomposed = 'josé@libretexts.org';
    const composed = 'josé@libretexts.org';
    expect(decomposed).to.not.equal(composed);
    expect(normalizeEmail(decomposed)).to.equal(composed);
    expect(normalizeEmail(decomposed)).to.equal(normalizeEmail(composed));
  });

  it('should preserve diacritics rather than folding them away', () => {
    expect(normalizeEmail('JOSÉ@libretexts.org')).to.equal('josé@libretexts.org');
    expect(normalizeEmail('José@libretexts.org')).to.not.equal(normalizeEmail('Jose@libretexts.org'));
  });

  it('should not strip dots or plus tags', () => {
    expect(normalizeEmail('first.last+libreone@gmail.com')).to.equal('first.last+libreone@gmail.com');
  });

  it('should return an empty string for non-string input', () => {
    expect(normalizeEmail(undefined)).to.equal('');
    expect(normalizeEmail(null)).to.equal('');
    expect(normalizeEmail(42)).to.equal('');
  });
});
