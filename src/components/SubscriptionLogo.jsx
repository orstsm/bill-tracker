import { useEffect, useState } from 'react';
import { findSubscription } from '../data/subscriptionCatalog';

export default function SubscriptionLogo({ subscription = '', size = 38, className = '', style = {} }) {
  const [hasError, setHasError] = useState(false);
  const catalogSubscription = findSubscription(subscription);
  const logoSrc = catalogSubscription?.logo;

  useEffect(() => {
    setHasError(false);
  }, [logoSrc]);

  const radius = Math.round(size * 0.26);
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

  if (hasError || !logoSrc) {
    const parts = subscription.trim().split(/\s+/).filter(Boolean);
    const initials = parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : (subscription.slice(0, 2).toUpperCase() || '?');

    return (
      <div
        className={`subscription-logo-fallback ${className}`}
        style={{
          ...containerStyle,
          background: 'var(--accent-soft)',
          color: 'var(--accent-strong)',
          fontSize: `${Math.round(size * 0.38)}px`,
          fontWeight: 700,
        }}
        aria-hidden="true"
      >
        {initials}
      </div>
    );
  }

  return (
    <div className={`subscription-logo-wrap ${className}`} style={containerStyle}>
      <img
        src={logoSrc}
        alt={`${subscription} logo`}
        onError={() => setHasError(true)}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: size > 30 ? 3 : 2, display: 'block' }}
      />
    </div>
  );
}
