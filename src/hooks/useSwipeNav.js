import { useCallback, useEffect, useRef } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// WebKit owns touch tracking, momentum and snapping. React commits only at rest.
export default function useSwipeNav({ activeIndex, count, onIndexChange, disabled = false }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const indexRef = useRef(activeIndex);
  const targetRef = useRef(activeIndex);
  const changeRef = useRef(onIndexChange);
  changeRef.current = onIndexChange;

  const scrollToIndex = useCallback((nextIndex, jump = false) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const index = Math.max(0, Math.min(count - 1, nextIndex));
    targetRef.current = index;
    viewport.scrollTo({
      left: index * viewport.clientWidth,
      behavior: jump || window.matchMedia(REDUCED_MOTION_QUERY).matches ? 'instant' : 'smooth',
    });
  }, [count]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const shell = viewport.closest('.app-shell');
    const indicator = shell?.querySelector('.tab-selection-indicator');
    let frame = 0;
    let timer = 0;
    let touching = false;
    let width = viewport.clientWidth;
    const updateIndicator = () => {
      frame = 0;
      const progress = Math.max(0, Math.min(count - 1, viewport.scrollLeft / (width || 1)));
      if (indicator) indicator.style.transform = `translate3d(${progress * 100}%, 0, 0)`;
    };
    const settle = () => {
      if (touching) return;
      clearTimeout(timer);
      updateIndicator();
      shell?.classList.remove('is-tab-swiping');
      const index = Math.max(0, Math.min(count - 1, Math.round(viewport.scrollLeft / (width || 1))));
      targetRef.current = index;
      if (index !== indexRef.current) {
        indexRef.current = index;
        changeRef.current(index);
      }
    };
    const onScroll = () => {
      shell?.classList.add('is-tab-swiping');
      if (!frame) frame = requestAnimationFrame(updateIndicator);
      clearTimeout(timer);
      // Fallback for iOS versions without scrollend; momentum resets the timer.
      timer = window.setTimeout(settle, 160);
    };
    const onTouchStart = () => { touching = true; };
    const onTouchEnd = () => {
      touching = false;
      clearTimeout(timer);
      timer = window.setTimeout(settle, 160);
    };
    const resize = new ResizeObserver(() => {
      const nextWidth = viewport.clientWidth;
      if (nextWidth === width) return;
      width = nextWidth;
      viewport.scrollTo({ left: targetRef.current * width, behavior: 'instant' });
      updateIndicator();
    });
    viewport.scrollTo({ left: indexRef.current * width, behavior: 'instant' });
    updateIndicator();
    resize.observe(viewport);
    viewport.addEventListener('scroll', onScroll, { passive: true });
    viewport.addEventListener('scrollend', settle);
    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchend', onTouchEnd, { passive: true });
    viewport.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      resize.disconnect();
      shell?.classList.remove('is-tab-swiping');
      viewport.removeEventListener('scroll', onScroll);
      viewport.removeEventListener('scrollend', settle);
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchend', onTouchEnd);
      viewport.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [count]);

  useEffect(() => {
    if (activeIndex === indexRef.current) return;
    indexRef.current = activeIndex;
    scrollToIndex(activeIndex);
  }, [activeIndex, scrollToIndex]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) viewport.style.overflowX = disabled ? 'hidden' : '';
  }, [disabled]);

  return { viewportRef, trackRef, scrollToIndex };
}
