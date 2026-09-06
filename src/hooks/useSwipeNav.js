import { useCallback, useEffect, useMemo, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Native-feeling page navigation powered by Embla's direct-manipulation
 * physics. The page rail and tab indicator share the same scroll progress so
 * they always remain visually connected to the user's finger.
 *
 * PERF: React state (activeTab) is updated on 'settle', NOT 'select'.
 * The 'select' event fires mid-animation; updating React state there triggers
 * a full re-render of the component tree (toggling inert/aria-hidden on 4
 * page sections) which blocks the main thread and drops frames.  The tab
 * indicator follows the finger purely via the --tab-progress CSS custom
 * property, so React doesn't need to know the new tab until settle.
 */
export default function useSwipeNav({ activeIndex, count, onIndexChange, disabled = false }) {
  const indexRef = useRef(activeIndex);
  const initialIndexRef = useRef(activeIndex);
  const onIndexChangeRef = useRef(onIndexChange);
  const disabledRef = useRef(disabled);
  const trackRef = useRef(null);

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

    return !target.closest('input, select, textarea, [contenteditable="true"], [role="slider"], [data-swipe-lock]');
  }, []);

  const options = useMemo(() => ({
    active: true,
    align: 'start',
    axis: 'x',
    containScroll: 'trimSnaps',
    dragFree: false,
    dragThreshold: 9,
    duration: 18,
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
    if (viewport && viewport.scrollLeft !== 0) viewport.scrollLeft = 0;
  }, [emblaApi]);

  const setSwipingClass = useCallback((isSwiping) => {
    const shell = trackRef.current?.closest('.app-shell');
    shell?.classList.toggle('is-tab-swiping', isSwiping);
  }, []);

  const scrollToIndex = useCallback((nextIndex, jump = false) => {
    if (!emblaApi) return;
    const boundedIndex = Math.max(0, Math.min(count - 1, nextIndex));
    if (!jump && boundedIndex !== emblaApi.selectedScrollSnap()) {
      setSwipingClass(true);
    }
    emblaApi.scrollTo(boundedIndex, jump);
  }, [count, emblaApi, setSwipingClass]);

  useEffect(() => {
    if (!emblaApi) return undefined;

    const viewport = emblaApi.rootNode();
    const shell = viewport?.closest('.app-shell');
    const indicator = shell?.querySelector('.tab-selection-indicator');

    const updateProgress = () => {
      const progress = Math.max(0, Math.min(1, emblaApi.scrollProgress()));
      const tabProgress = progress * Math.max(0, count - 1);
      if (indicator) {
        indicator.style.transform = `translate3d(${tabProgress * 100}%, 0, 0)`;
      }
    };

    const handleScroll = () => {
      shell?.classList.add('is-tab-swiping');
      updateProgress();
    };

    // Keep direct manipulation outside React while the rail is moving. Embla's
    // select event fires before the snap animation has finished, so committing
    // activeTab here would reconcile all four pages during the animation.
    const handleSelect = () => {
      updateProgress();
    };

    const handleSettle = () => {
      updateProgress();
      resetNativeScroll();
      shell?.classList.remove('is-tab-swiping');

      const selectedIndex = emblaApi.selectedScrollSnap();
      if (selectedIndex === indexRef.current) return;

      indexRef.current = selectedIndex;
      onIndexChangeRef.current(selectedIndex);
    };

    updateProgress();
    emblaApi
      .on('scroll', handleScroll)
      .on('select', handleSelect)
      .on('reInit', updateProgress)
      .on('settle', handleSettle);

    return () => {
      emblaApi
        .off('scroll', handleScroll)
        .off('select', handleSelect)
        .off('reInit', updateProgress)
        .off('settle', handleSettle);
    };
  }, [count, emblaApi, resetNativeScroll]);

  useEffect(() => {
    if (!emblaApi || emblaApi.selectedScrollSnap() === activeIndex) return;
    const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    scrollToIndex(activeIndex, reduceMotion);
  }, [activeIndex, emblaApi, scrollToIndex]);

  return { viewportRef, trackRef, scrollToIndex };
}
