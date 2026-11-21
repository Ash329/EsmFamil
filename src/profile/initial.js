/*
 * The letter shown in a player's avatar.
 */

const ARABIC_TO_PERSIAN = { 'ي': 'ی', 'ى': 'ی', 'ك': 'ک' };

/**
 * First real letter of a name: skips spaces, ZWNJ, digits, emoji, marks and
 * tatweel. NFKC turns Arabic presentation forms (initial/medial shapes, ﻻ)
 * back into plain letters and keeps آ as one character, so the returned
 * single code point always renders in its standalone form. Latin is uppercased.
 * Returns '?' when there is no letter at all.
 */
export function getInitial(name) {
  const text = String(name ?? '').normalize('NFKC');
  for (const ch of text) {
    // \p{Lo}/\p{Lu}/\p{Ll}/\p{Lt}: real letters. \p{Lm} (tatweel, modifier letters) is skipped.
    if (!/[\p{Lu}\p{Ll}\p{Lt}\p{Lo}]/u.test(ch)) continue;
    const letter = ARABIC_TO_PERSIAN[ch] ?? ch;
    const upper = letter.toUpperCase();
    return Array.from(upper).length === 1 ? upper : letter; // ß → SS would be two letters
  }
  return '?';
}

/** True for Persian/Arabic-script text, used to pick the handwriting font. */
export const isArabicScript = ch => /\p{Script=Arabic}/u.test(ch);
