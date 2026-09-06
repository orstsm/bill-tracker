import { useEffect, useRef, useState } from 'react';

const PHASES = {
  'ready-right': { next: 'run-right', duration: 80 },
  'run-right': { next: 'rest-right', duration: 1750 },
  'rest-right': { next: 'run-left', duration: 2000 },
  'run-left': { next: 'rest-left', duration: 1750 },
  'rest-left': { next: 'run-right', duration: 2000 },
};

const PHASE_IMAGES = {
  'ready-right': '/mascot/billy-run-right-v3-poster.png',
  'run-right': '/mascot/billy-run-right-v3.webp',
  'rest-right': '/mascot/billy-tired-right-v3.png',
  'run-left': '/mascot/billy-run-left-v3.webp',
  'rest-left': '/mascot/billy-tired-left-v3.png',
};

export default function HeaderMascot({ active = true }) {
  const containerRef = useRef(null);
  const runnerRef = useRef(null);
  const [phase, setPhase] = useState('ready-right');
  const [reduceMotion] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));

  useEffect(() => {
    if (!active) {
      setPhase('ready-right');
      return undefined;
    }
    if (reduceMotion) return undefined;

    const current = PHASES[phase] || PHASES['ready-right'];
    const timer = window.setTimeout(() => setPhase(current.next), current.duration);
    return () => window.clearTimeout(timer);
  }, [active, phase, reduceMotion]);

  useEffect(() => {
    const container = containerRef.current;
    const runner = runnerRef.current;
    if (!container || !runner) return undefined;

    const updateDistance = () => {
      const distance = Math.max(0, container.clientWidth - runner.offsetWidth);
      runner.style.setProperty('--billy-run-distance', `${distance}px`);
    };

    updateDistance();
    const observer = new ResizeObserver(updateDistance);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleTransitionEnd = (event) => {
    if (!active) return;
    if (event.propertyName !== 'transform') return;
    if (phase === 'run-right') setPhase('rest-right');
    if (phase === 'run-left') setPhase('rest-left');
  };

  const visiblePhase = reduceMotion ? 'reduced-motion' : (active ? phase : 'ready-right');
  const image = reduceMotion ? PHASE_IMAGES['ready-right'] : (PHASE_IMAGES[visiblePhase] || PHASE_IMAGES['ready-right']);

  return (
    <span className="header-mascot-inline" aria-hidden="true" ref={containerRef}>
      <span
        ref={runnerRef}
        className={`header-mascot-runner is-${visiblePhase}`}
        onTransitionEnd={handleTransitionEnd}
        data-billy-phase={visiblePhase}
      >
        <img src={image} alt="" draggable="false" />
      </span>
    </span>
  );
}
