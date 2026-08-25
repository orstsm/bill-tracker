import { useRef, useCallback, useEffect } from 'react';

/**
 * useSwipeNav – Lightweight, production-quality swipe-to-navigate hook.
 *
 * Attaches to a ref'd container. Detects horizontal swipe gestures and
 * calls onSwipeLeft / onSwipeRight while respecting interactive elements,
 * vertical scrolling, system edge gestures, multi-touch, and open modals.
 *
 * @param {Object}   opts
 * @param {Function} opts.onSwipeLeft   – called when user swipes left (go next)
 * @param {Function} opts.onSwipeRight  – called when user swipes right (go prev)
 * @param {boolean}  opts.disabled      – disable all gesture handling (e.g. modal open)
 */
export default function useSwipeNav({ onSwipeLeft, onSwipeRight, disabled = false }) {
  const containerRef = useRef(null);

  // Gesture state persisted across events via refs (no re-renders)
  const state = useRef({
    tracking: false,       // are we actively tracking a potential swipe?
    decided: false,        // have we decided this is a swipe vs scroll?
    isSwipe: false,        // true = horizontal swipe, false = vertical scroll
    startX: 0,
    startY: 0,
    startTime: 0,
    lastX: 0,
    suppressClick: false,  // prevent accidental tap after swipe
  });

  // ── Helpers ──────────────────────────────────────────────────────────

  /** Returns true if the touch started on an interactive element we should ignore */
  const isInteractive = useCallback((el) => {
    while (el && el !== containerRef.current) {
      const tag = el.tagName;
      // Skip inputs, buttons, links, selects, textareas
      if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'A' ||
          tag === 'SELECT' || tag === 'TEXTAREA') return true;
      // Skip anything with explicit horizontal scroll
      if (el.scrollWidth > el.clientWidth + 2 && 
          getComputedStyle(el).overflowX !== 'hidden' &&
          getComputedStyle(el).overflowX !== 'visible') return true;
      // Skip elements marked as non-swipeable
      if (el.dataset?.noSwipe) return true;
      el = el.parentElement;
    }
    return false;
  }, []);

  // ── Touch Handlers ──────────────────────────────────────────────────

  const onTouchStart = useCallback((e) => {
    if (disabled) return;
    // Ignore multi-touch
    if (e.touches.length > 1) { state.current.tracking = false; return; }

    const touch = e.touches[0];
    const x = touch.clientX;
    const screenW = window.innerWidth;

    // Ignore gestures starting within 20px of screen edges (system gestures)
    if (x < 20 || x > screenW - 20) return;

    // Ignore if starting on an interactive element
    if (isInteractive(e.target)) return;

    state.current = {
      tracking: true,
      decided: false,
      isSwipe: false,
      startX: x,
      startY: touch.clientY,
      startTime: Date.now(),
      lastX: x,
      suppressClick: false,
    };
  }, [disabled, isInteractive]);

  const onTouchMove = useCallback((e) => {
    const s = state.current;
    if (!s.tracking) return;

    // Cancel on multi-touch
    if (e.touches.length > 1) { s.tracking = false; return; }

    const touch = e.touches[0];
    const dx = touch.clientX - s.startX;
    const dy = touch.clientY - s.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    s.lastX = touch.clientX;

    // Decision phase: after ~12px of movement, decide intent
    if (!s.decided && (absDx > 12 || absDy > 12)) {
      s.decided = true;
      // Horizontal intent: dx must be clearly dominant
      s.isSwipe = absDx > absDy * 1.2;
    }

    // If we decided this is NOT a swipe, stop tracking entirely
    if (s.decided && !s.isSwipe) {
      s.tracking = false;
      return;
    }
  }, []);

  const onTouchEnd = useCallback((e) => {
    const s = state.current;
    if (!s.tracking) return;
    s.tracking = false;

    // Only act if we decided this was a swipe
    if (!s.decided || !s.isSwipe) return;

    const dx = e.changedTouches[0].clientX - s.startX;
    const absDx = Math.abs(dx);
    const elapsed = Date.now() - s.startTime;

    // Velocity-based: fast flick (>0.4px/ms) with at least 30px
    const velocity = absDx / Math.max(elapsed, 1);
    const isFlick = velocity > 0.4 && absDx > 30;

    // Distance-based: slower swipe needs at least 60px
    const isLongSwipe = absDx > 60;

    if (isFlick || isLongSwipe) {
      // Suppress the next click so we don't accidentally activate a card
      s.suppressClick = true;
      setTimeout(() => { s.suppressClick = false; }, 300);

      if (dx < 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    }
  }, [onSwipeLeft, onSwipeRight]);

  // ── Click suppression ───────────────────────────────────────────────

  const onClickCapture = useCallback((e) => {
    if (state.current.suppressClick) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  // ── Attach handlers via useEffect ───────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('click', onClickCapture, { capture: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('click', onClickCapture, { capture: true });
    };
  }, [onTouchStart, onTouchMove, onTouchEnd, onClickCapture]);

  return containerRef;
}
