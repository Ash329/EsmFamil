/*
 * Ink colors for avatars, picked from a hash of the profile id so a player
 * always writes in the same pen. Red is left out: red pen is the judge's.
 */

export const INK_COLORS = [
  '#1f3a93', // ballpoint blue
  '#1e6b4a', // green ink
  '#5b2a86', // violet ink
  '#8a4b14', // sepia
  '#0f6676', // teal ink
  '#8b1e4f', // burgundy
  '#33363d', // graphite
];

/** FNV-1a, 32-bit. Small, fast and stable across browsers. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function colorForId(id) {
  return INK_COLORS[hashString(String(id)) % INK_COLORS.length];
}
