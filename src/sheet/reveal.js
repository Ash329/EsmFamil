/**
 * How far to scroll so a focused answer sits inside the part of the screen
 * the player can actually see: below the sticky letter/timer bar and above
 * the on-screen keyboard (the keyboard shrinks the visual viewport, not the
 * layout viewport, so `view` should come from window.visualViewport).
 *
 * All values are in client (getBoundingClientRect) coordinates.
 *
 * @param {{top:number, bottom:number}} rect   the element to reveal
 * @param {{top:number, height:number}} view   the visible region
 * @param {{top?:number, bottom?:number}} [margins]  space to keep clear at each edge
 * @returns {number} pixels to scroll by (negative = up, 0 = already visible)
 */
export function revealDelta(rect, view, { top = 0, bottom = 0 } = {}) {
  const min = view.top + top;
  const max = view.top + view.height - bottom;
  if (rect.top < min) return rect.top - min;
  if (rect.bottom > max) {
    // Too tall to fit: line its top up with the clear area instead
    return Math.min(rect.bottom - max, rect.top - min);
  }
  return 0;
}
