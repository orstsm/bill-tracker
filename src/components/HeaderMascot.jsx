import { useEffect, useState } from 'react';

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

  const handleTransitionEnd = (event) => {
    if (!active) return;
    if (event.propertyName !== 'left') return;
    if (phase === 'run-right') setPhase('rest-right');
    if (phase === 'run-left') setPhase('rest-left');
  };

  const visiblePhase = reduceMotion ? 'reduced-motion' : (active ? phase : 'ready-right');
  const image = reduceMotion ? PHASE_IMAGES['ready-right'] : (PHASE_IMAGES[visiblePhase] || PHASE_IMAGES['ready-right']);

  return (
    <span className="header-mascot-inline" aria-hidden="true">
      <span
        className={`header-mascot-runner is-${visiblePhase}`}
        onTransitionEnd={handleTransitionEnd}
        data-billy-phase={visiblePhase}
      >
        <img src={image} alt="" draggable="false" />
      </span>
    </span>
  );
}
