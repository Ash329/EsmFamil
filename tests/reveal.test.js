import { describe, it, expect } from 'vitest';
import { revealDelta } from '../src/sheet/reveal.js';

describe('revealDelta', () => {
  const view = { top: 0, height: 400 };          // e.g. 800px screen, keyboard covers half
  const margins = { top: 100, bottom: 50 };       // sticky bar above, a line of breathing room below

  it('does nothing when the box is already in the clear area', () => {
    expect(revealDelta({ top: 150, bottom: 194 }, view, margins)).toBe(0);
  });

  it('scrolls down when the box is behind the keyboard', () => {
    expect(revealDelta({ top: 500, bottom: 544 }, view, margins)).toBe(544 - 350);
  });

  it('scrolls up when the box is under the sticky bar', () => {
    expect(revealDelta({ top: 60, bottom: 104 }, view, margins)).toBe(-40);
  });

  it('respects a visual viewport that is offset from the layout viewport', () => {
    expect(revealDelta({ top: 250, bottom: 294 }, { top: 200, height: 400 }, margins)).toBe(-50);
  });

  it('aligns the top of a box taller than the clear area', () => {
    expect(revealDelta({ top: 300, bottom: 700 }, view, margins)).toBe(200);
  });
});
