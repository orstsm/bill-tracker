import { useCallback, useEffect, useMemo, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Native-feeling page navigation powered by Embla's direct-manipulation
 * physics. The page rail and tab indicator share the same scroll progress so
 * they always remain visually connected to the user's finger.
 */
export default function useSwipeNav({ activeIndex, count, onIndexChange, disabled = false }) {
  const indexRef = useRef(activeIndex);
  const initialIndexRef = useRef(activeIndex);
  const onIndexChangeRef = useRef(onIndexChange);
  const disabledRef = useRef(disabled);
  const trackRef = useRef(null);

  // Keep modal gesture-locking current without changing Embla's options. A
  // changing options object makes Embla re-initialize, which can interrupt a
  // programmatic tab transition and leave the rail between two snap points.
  disabledRef.current = disabled;

  useEffect(() => {
    indexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    onIndexChangeRef.current = onIndexChange;
  }, [onIndexChange]);

  const watchDrag = useCallback((_api, event) => {
    if (disabledRef.current) return false;

    const target = event.target;
    if (!(target instanceof Element)) return true;

    // Form controls and explicitly locked regions own their gestures. Normal
    // buttons, links, cards, and rows remain swipeable; Embla suppresses their
    // click only when the movement becomes a real drag.
    return !target.closest('input, select, textarea, [contenteditable="true"], [role="slider"], [data-swipe-lock]');
  }, []);

  const options = useMemo(() => ({
    active: true,
    align: 'start',
    axis: 'x',
    containScroll: 'trimSnaps',
    dragFree: false,
    dragThreshold: 9,
    duration: 24,
    loop: false,
    skipSnaps: false,
    slidesToScroll: 1,
    startIndex: initialIndexRef.current,
    watchDrag,
  }), [watchDrag]);

  const [viewportRef, emblaApi] = useEmblaCarousel(options);

  const resetNativeScroll = useCallback(() => {
    if (!emblaApi) return;
    const viewport = emblaApi.rootNode();
    if (viewport.scrollLeft !== 0) viewport.scrollLeft = 0;
  }, [emblaApi]);

  const scrollToIndex = useCallback((nextIndex, jump = false) => {
    if (!emblaApi) return;
    const boundedIndex = Math.max(0, Math.min(count - 1, nextIndex));

    // iOS Safari may natively scroll an overflow-hidden viewport to keep a
    // tapped control in view while Embla is translating the rail. Clear that
    // independent offset before and after direct navigation.
    resetNativeScroll();
    emblaApi.scrollTo(boundedIndex, jump);
    window.requestAnimationFrame(resetNativeScroll);
  }, [count, emblaApi, resetNativeScroll]);

  useEffect(() => {
    if (!emblaApi) return undefined;

    const viewport = emblaApi.rootNode();
    const shell = viewport.closest('.app-shell');

    const handleNativeScroll = () => resetNativeScroll();

    const updateProgress = () => {
      const progress = Math.max(0, Math.min(1, emblaApi.scrollProgress()));
      shell?.style.setProperty('--tab-progress', String(progress * Math.max(0, count - 1)));
    };

    const handleSelect = () => {
      const selectedIndex = emblaApi.selectedScrollSnap();
      updateProgress();
      if (selectedIndex === indexRef.current) return;

      indexRef.current = selectedIndex;
      onIndexChangeRef.current(selectedIndex);
    };

    const handleSettle = () => updateProgress();

    updateProgress();
    viewport.addEventListener('scroll', handleNativeScroll, { passive: true });
    emblaApi
      .on('scroll', updateProgress)
      .on('select', handleSelect)
      .on('reInit', updateProgress)
      .on('settle', handleSettle);

    return () => {
      viewport.removeEventListener('scroll', handleNativeScroll);
      emblaApi
        .off('scroll', updateProgress)
        .off('select', handleSelect)
        .off('reInit', updateProgress)
        .off('settle', handleSettle);
    };
  }, [count, emblaApi, resetNativeScroll]);

  useEffect(() => {
    if (!emblaApi || emblaApi.selectedScrollSnap() === activeIndex) {
      resetNativeScroll();
      return;
    }
    const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    scrollToIndex(activeIndex, reduceMotion);
  }, [activeIndex, emblaApi, resetNativeScroll, scrollToIndex]);

  return { viewportRef, trackRef, scrollToIndex };
}
