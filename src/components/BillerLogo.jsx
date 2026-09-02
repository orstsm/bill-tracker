import { useEffect, useState } from 'react';
import { findBiller, normalizeBillerName } from '../data/billerCatalog';

const LOGO_MAP = {
  bpi: 'BPI.png',
  bdo: 'bdo.png',
  unionbank: 'Unionbank.png',
  eastwest: 'EastWest.png',
  mp2: 'MP2.png',
  pldt: 'PLDT.png',
  pnb: 'PNB.png',
  zed: 'ZED.png',
  insurance: 'Insurance.png',
};

export default function BillerLogo({ biller = '', size = 38, className = '', style = {} }) {
  const [hasError, setHasError] = useState(false);

  const cleanKey = normalizeBillerName(biller);
  const catalogBiller = findBiller(biller);
  const fileName = LOGO_MAP[cleanKey] || `${biller.trim()}.png`;
  const logoSrc = catalogBiller?.logo || `/logos/${fileName}`;

  useEffect(() => {
    setHasError(false);
  }, [logoSrc]);

  const radius = Math.round(size * 0.26);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const containerStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: `${radius}px`,
    background: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    ...style,
  };

  if (hasError || !biller) {
    return (
      <div
        className={`biller-logo-fallback ${className}`}
        style={{
          ...containerStyle,
          background: 'var(--accent-soft)',
          color: 'var(--accent-strong)',
          fontSize: `${Math.round(size * 0.38)}px`,
          fontWeight: '700',
          letterSpacing: '-0.3px',
        }}
        aria-hidden="true"
      >
        {getInitials(biller)}
      </div>
    );
  }

  return (
    <div className={`biller-logo-wrap ${className}`} style={containerStyle}>
      <img
        src={logoSrc}
        alt={`${biller} logo`}
        onError={() => setHasError(true)}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          padding: size > 30 ? '3px' : '2px',
          display: 'block',
        }}
      />
    </div>
  );
}
