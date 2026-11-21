/*
 * Guest name rules. Pure functions, no DOM, so a future server can import
 * this file and run the same checks on names sent by the client.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 20;

const ZWNJ = '‌';

/** Arabic-keyboard letters that Persian writes differently: same name, one spelling. */
const ARABIC_TO_PERSIAN = { 'ي': 'ی', 'ى': 'ی', 'ك': 'ک' };

/** Persian/Arabic-script letters: the base Arabic block plus پ چ ژ ک گ ۀ ی. */
const FA_LETTERS = 'ء-غف-يپچژکگۀی';
const DIGITS = '0-9۰-۹٠-٩'; // Latin, Persian ۰–۹, Arabic-Indic ٠–٩

const ALLOWED = new RegExp(`^[A-Za-z${FA_LETTERS}${DIGITS} ${ZWNJ}]+$`, 'u');
const HAS_LETTER = new RegExp(`[A-Za-z${FA_LETTERS}]`, 'u');

/**
 * Clean up what was typed, without judging it:
 * NFC, Arabic → Persian letters, invisible marks and harakat removed,
 * any whitespace → one space, ZWNJ never doubled or next to a space, ends trimmed.
 */
export function normalizeName(raw) {
  return String(raw ?? '')
    .normalize('NFC')
    .replace(/[يىك]/g, ch => ARABIC_TO_PERSIAN[ch])
    .replace(/[​‍‎‏‪-‮⁦-⁩﻿ـ]/g, '') // bidi marks, ZWJ, tatweel
    .replace(/[ً-ٰٟ]/g, '')   // harakat (ـَ ـِ ـُ …): decoration, not part of the name
    .replace(/\s+/g, ' ')
    .replace(/‌+/g, ZWNJ)
    .replace(/ ?‌ ?/g, m => (m === ZWNJ ? ZWNJ : ' '))
    .replace(/^[ ‌]+|[ ‌]+$/g, '');
}

/**
 * Validate a typed name.
 * @returns {{ ok: true, name: string } | { ok: false, error: 'empty'|'badChars'|'tooShort'|'tooLong'|'noLetter', name: string }}
 */
export function validateName(raw) {
  const name = normalizeName(raw);
  const length = Array.from(name).length;
  if (length === 0) return { ok: false, error: 'empty', name };
  if (!ALLOWED.test(name)) return { ok: false, error: 'badChars', name };
  if (length < NAME_MIN) return { ok: false, error: 'tooShort', name };
  if (length > NAME_MAX) return { ok: false, error: 'tooLong', name };
  if (!HAS_LETTER.test(name)) return { ok: false, error: 'noLetter', name };
  return { ok: true, name };
}
