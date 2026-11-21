/*
 * <Avatar>: the one place that draws a player. Everything that shows a
 * player calls renderAvatar(profile, { size }).
 *
 * To add a kind of avatar (image, character), add a `case` to the switch.
 * Unknown types fall back to the hand-written initial.
 */

import { getInitial, isArabicScript } from './initial.js';
import { colorForId, hashString, INK_COLORS } from './color.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
export const AVATAR_SIZES = ['sm', 'md', 'lg'];

/**
 * @param profile { id, name, avatar }
 * @param options.size  'sm' | 'md' | 'lg'
 * @param options.label accessible name; omit when the name is already written next to it
 * @returns HTMLElement
 */
export function renderAvatar(profile, { size = 'md', label } = {}) {
  const avatar = profile?.avatar;
  let node;
  switch (avatar?.type) {
    // case 'image':     node = imageAvatar(profile, avatar); break;
    // case 'character': node = characterAvatar(profile, avatar); break;
    case 'initial':
    default:
      node = initialAvatar(profile, avatar?.type === 'initial' ? avatar : null);
  }
  node.classList.add('avatar', `avatar-${AVATAR_SIZES.includes(size) ? size : 'md'}`);
  if (label) {
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', label);
  } else {
    node.setAttribute('aria-hidden', 'true');
  }
  return node;
}

/** A letter written inside a quick, slightly uneven pen circle. */
function initialAvatar(profile, avatar) {
  const id = String(profile?.id ?? profile?.name ?? '');
  const value = avatar?.value || getInitial(profile?.name);
  const color = INK_COLORS.includes(avatar?.color) ? avatar.color : colorForId(id);

  const node = document.createElement('span');
  node.style.setProperty('--avatar-ink', color);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('class', 'avatar-ring');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', inkCirclePath(id));
  svg.append(path);

  // A lone code point in its own isolated box: Persian letters render standalone (آ, ب, not ـبـ)
  const letter = document.createElement('span');
  letter.className = 'avatar-letter';
  letter.textContent = value;
  const fa = isArabicScript(value);
  letter.lang = fa ? 'fa' : 'en';
  letter.dir = fa ? 'rtl' : 'ltr';
  if (fa) letter.classList.add('is-fa');

  node.append(svg, letter);
  return node;
}

/** Seeded PRNG so the same player always gets the same wobble. */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pen circle: wobbly radius, spirals out a touch, overshoots its start. */
function inkCirclePath(seedText) {
  const rnd = mulberry32(hashString(seedText));
  const start = rnd() * Math.PI * 2;
  const sweep = Math.PI * 2 + 0.25 + rnd() * 0.35;
  const phase = rnd() * Math.PI * 2;
  const n = 28;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = start + (sweep * i) / n;
    const r = 16.5 * (1 + 0.045 * Math.sin(a * 2 + phase) + (i / n) * 0.06 - 0.03);
    d += `${i ? ' L' : 'M'}${(20 + Math.cos(a) * r).toFixed(1)} ${(20 + Math.sin(a) * r * 0.97).toFixed(1)}`;
  }
  return d;
}
