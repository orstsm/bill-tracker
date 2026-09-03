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

  useEffect(() => {
    if (!emblaApi) return undefined;

    const shell = emblaApi.rootNode().closest('.app-shell');

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
    emblaApi
      .on('scroll', updateProgress)
      .on('select', handleSelect)
      .on('reInit', updateProgress)
      .on('settle', handleSettle);

    return () => {
      emblaApi
        .off('scroll', updateProgress)
        .off('select', handleSelect)
        .off('reInit', updateProgress)
        .off('settle', handleSettle);
    };
  }, [count, emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

    // selectedScrollSnap() changes before the rail has necessarily reached the
    // selected page. Always reaffirm the target when app state changes so an
    // interrupted tap/drag cannot strand the viewport between two pages.
    emblaApi.scrollTo(activeIndex, reduceMotion);
  }, [activeIndex, emblaApi]);

  return { viewportRef, trackRef };
}
