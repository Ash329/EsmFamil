/*
 * Guest profiles. Everything the game needs about "who is playing" goes
 * through here, so real accounts can replace this folder later.
 */

export { NAME_MIN, NAME_MAX, normalizeName, validateName } from './name.js';
export { getInitial } from './initial.js';
export { INK_COLORS, colorForId } from './color.js';
export { newId, createProfile, renameProfile, sanitizeProfile } from './profile.js';
export { STORAGE_KEY, STORE_VERSION, createStore, parseStore, browserLang } from './storage.js';
export { renderAvatar } from './avatar.js';
export { createNameScreen } from './nameScreen.js';
export { createProfileMenu } from './profileMenu.js';
export { PROFILE_STRINGS } from './strings.js';
