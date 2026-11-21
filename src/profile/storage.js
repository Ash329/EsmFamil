/*
 * Where the guest lives: one localStorage entry.
 *
 *   key  "esmfamil.guest.v1"
 *   data { version: 1, profile: {…} | null, settings: { lang?: 'en' | 'fa' } }
 *
 * `version` is what a later migration (e.g. to real accounts) switches on.
 * If localStorage is unavailable or full (private mode, blocked site data),
 * everything keeps working from memory for the rest of the session.
 */

import { sanitizeProfile } from './profile.js';

export const STORAGE_KEY = 'esmfamil.guest.v1';
export const STORE_VERSION = 1;
export const LANGS = ['en', 'fa'];

export const emptyStore = () => ({ version: STORE_VERSION, profile: null, settings: {} });

/** Turn whatever is stored into a valid store. Never throws. */
export function parseStore(text) {
  if (typeof text !== 'string' || text === '') return emptyStore();
  let data;
  try { data = JSON.parse(text); } catch { return emptyStore(); }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return emptyStore();

  // Unversioned data: a bare profile object saved by an early build.
  if (data.version === undefined && 'id' in data && 'name' in data) {
    data = { version: 1, profile: data, settings: {} };
  }
  // A version this build doesn't know (e.g. written by a newer one): start clean, don't guess.
  if (data.version !== STORE_VERSION) return emptyStore();

  const settings = {};
  if (LANGS.includes(data.settings?.lang)) settings.lang = data.settings.lang;
  return { version: STORE_VERSION, profile: sanitizeProfile(data.profile), settings };
}

/**
 * @param getStorage returns a Storage-like object; may throw (blocked storage).
 */
export function createStore(getStorage = () => globalThis.localStorage) {
  let memory = null;        // last saved JSON, used once storage fails
  let useMemory = false;

  function readText() {
    if (useMemory) return memory;
    try {
      return getStorage().getItem(STORAGE_KEY);
    } catch {
      useMemory = true;
      return memory;
    }
  }

  function writeText(text) {
    memory = text;
    if (useMemory) return;
    try {
      const storage = getStorage();
      if (text === null) storage.removeItem(STORAGE_KEY);
      else storage.setItem(STORAGE_KEY, text);
    } catch {
      useMemory = true;     // keep going in memory for this session
    }
  }

  const load = () => parseStore(readText());

  /** Read-modify-write, so a change from another tab isn't overwritten. */
  function update(change) {
    const next = { ...change(load()), version: STORE_VERSION };
    writeText(JSON.stringify(next));
    return next;
  }

  return {
    load,
    update,
    saveProfile: profile => update(s => ({ ...s, profile })),
    clearProfile: () => update(s => ({ ...s, profile: null })),
    saveSettings: settings => update(s => ({ ...s, settings: { ...s.settings, ...settings } })),
    get persistent() { return !useMemory; },
  };
}
