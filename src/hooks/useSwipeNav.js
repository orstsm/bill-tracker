import { useCallback, useEffect, useRef } from 'react';

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Direct-manipulation page navigation. The rail follows the user's finger,
 * then settles using both drag distance and terminal velocity.
 */
export default function useSwipeNav({ activeIndex, count, onIndexChange, disabled = false }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const indexRef = useRef(activeIndex);
  const stateRef = useRef({
    tracking: false,
    decided: false,
    horizontal: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
    dragX: 0,
    suppressClick: false,
  });

  const placeTrack = useCallback((index, dragX = 0, animate = true) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const width = viewport.clientWidth;
    track.style.transition = animate ? `transform 300ms ${EASE_OUT}` : 'none';
    track.style.transform = `translate3d(${(-index * width) + dragX}px, 0, 0)`;
  }, []);

  useEffect(() => {
    indexRef.current = activeIndex;
    placeTrack(activeIndex, 0, true);
  }, [activeIndex, placeTrack]);

  useEffect(() => {
    const handleResize = () => placeTrack(indexRef.current, 0, false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [placeTrack]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const isInteractive = (element) => {
      if (!(element instanceof Element)) return false;
      return Boolean(element.closest('button, a, input, select, textarea, [data-no-swipe], [role="button"]'));
    };

    const reset = () => {
      stateRef.current.tracking = false;
      stateRef.current.decided = false;
      stateRef.current.horizontal = false;
      stateRef.current.pointerId = null;
      stateRef.current.dragX = 0;
    };

    const onPointerDown = (event) => {
      if (disabled || !event.isPrimary || isInteractive(event.target)) return;
      if (event.clientX < 24 || event.clientX > window.innerWidth - 24) return;

      const now = performance.now();
      stateRef.current = {
        tracking: true,
        decided: false,
        horizontal: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastTime: now,
        velocityX: 0,
        dragX: 0,
        suppressClick: false,
      };
      viewport.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
      const state = stateRef.current;
      if (!state.tracking || state.pointerId !== event.pointerId) return;

      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (!state.decided && (absX > 7 || absY > 7)) {
        state.decided = true;
        state.horizontal = absX > absY * 1.12;
        if (!state.horizontal) {
          reset();
          return;
        }
      }

      if (!state.horizontal) return;
      event.preventDefault();

      const now = performance.now();
      const elapsed = Math.max(now - state.lastTime, 1);
      const instantVelocity = (event.clientX - state.lastX) / elapsed;
      state.velocityX = (state.velocityX * 0.65) + (instantVelocity * 0.35);
      state.lastX = event.clientX;
      state.lastTime = now;

      const atStart = indexRef.current === 0 && dx > 0;
      const atEnd = indexRef.current === count - 1 && dx < 0;
      state.dragX = atStart || atEnd ? dx * 0.24 : dx;
      state.suppressClick = absX > 10;
      placeTrack(indexRef.current, state.dragX, false);
    };

    const finishGesture = (event, cancelled = false) => {
      const state = stateRef.current;
      if (!state.tracking || state.pointerId !== event.pointerId) return;

      let nextIndex = indexRef.current;
      if (!cancelled && state.horizontal) {
        const width = viewport.clientWidth;
        const projectedX = state.dragX + (state.velocityX * 180);
        const crossedDistance = Math.abs(state.dragX) > width * 0.22;
        const fastFlick = Math.abs(state.velocityX) > 0.5;
        if (crossedDistance || fastFlick) {
          nextIndex += projectedX < 0 ? 1 : -1;
          nextIndex = Math.max(0, Math.min(count - 1, nextIndex));
        }
      }

      placeTrack(nextIndex, 0, true);
      if (nextIndex !== indexRef.current) {
        indexRef.current = nextIndex;
        onIndexChange(nextIndex);
      }
      state.tracking = false;
      state.pointerId = null;
      state.dragX = 0;
      window.setTimeout(() => { state.suppressClick = false; }, 320);
    };

    const onClickCapture = (event) => {
      if (stateRef.current.suppressClick) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onPointerUp = (event) => finishGesture(event, false);
    const onPointerCancel = (event) => finishGesture(event, true);

    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove, { passive: false });
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerCancel);
    viewport.addEventListener('click', onClickCapture, true);

    return () => {
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', onPointerUp);
      viewport.removeEventListener('pointercancel', onPointerCancel);
      viewport.removeEventListener('click', onClickCapture, true);
    };
  }, [count, disabled, onIndexChange, placeTrack]);

  return { viewportRef, trackRef };
}
