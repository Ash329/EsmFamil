/*
 * Guest profile: { id, name, avatar, createdAt }.
 *
 * avatar is a tagged object so new kinds can be added without migrating:
 *   { type: 'initial', value: 'S', color: '#1f3a93' }   ← the only kind for now
 *   { type: 'image', url }                               ← later
 *   { type: 'character', parts: {…} }                    ← later
 */

import { validateName } from './name.js';
import { getInitial } from './initial.js';
import { colorForId } from './color.js';

/** crypto.randomUUID, with a fallback for plain-http pages (e.g. a phone on the LAN). */
export function newId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) {
    try { return c.randomUUID(); } catch { /* insecure context */ }
  }
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function initialAvatar(name, id) {
  return { type: 'initial', value: getInitial(name), color: colorForId(id) };
}

/** Create a profile from a typed name. Throws if the name is invalid (validate first). */
export function createProfile(rawName, { id = newId(), now = new Date() } = {}) {
  const result = validateName(rawName);
  if (!result.ok) throw new Error(`Invalid name: ${result.error}`);
  return { id, name: result.name, avatar: initialAvatar(result.name, id), createdAt: now.toISOString() };
}

/** Same player, new name: id, createdAt and color stay; the initial follows the name. */
export function renameProfile(profile, rawName) {
  const result = validateName(rawName);
  if (!result.ok) throw new Error(`Invalid name: ${result.error}`);
  const avatar = profile.avatar?.type === 'initial' || !profile.avatar
    ? initialAvatar(result.name, profile.id)
    : profile.avatar; // picture/character avatars don't depend on the name
  return { ...profile, name: result.name, avatar };
}

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Rebuild a profile read from storage, or return null if it can't be trusted.
 * Never throws: storage may hold anything (old versions, hand edits, other apps).
 */
export function sanitizeProfile(raw) {
  if (!isPlainObject(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id || id.length > 64) return null;
  const result = validateName(raw.name);
  if (!result.ok) return null;

  const created = typeof raw.createdAt === 'string' ? new Date(raw.createdAt) : null;
  const createdAt = created && !Number.isNaN(created.getTime()) ? created.toISOString() : new Date().toISOString();

  // 'initial' is always recomputed so it matches the name. An unknown future
  // type is kept as-is (the renderer falls back to the initial).
  const keepAvatar = isPlainObject(raw.avatar) && typeof raw.avatar.type === 'string' && raw.avatar.type !== 'initial';
  const avatar = keepAvatar ? raw.avatar : initialAvatar(result.name, id);

  return { id, name: result.name, avatar, createdAt };
}
