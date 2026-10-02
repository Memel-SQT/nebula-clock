import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { MotionLevel } from '@nebula-clock/core';
import { Splash } from '@nebula-clock/ui';

export interface SplashScreenProps {
  motion: MotionLevel;
  onDone: () => void;
}

/**
 * The family opening sequence (`Splash`, Nebula Hub) with the Nebula Clock mark: the plate
 * scales in, the halo breathes, the ring draws itself, the hands pop in. The app is already
 * mounted underneath and this overlay takes no pointer events, so nothing is blocked; any key
 * or click dismisses it early.
 */
export function SplashScreen({ motion, onDone }: SplashScreenProps) {
  const { t } = useTranslation(['common']);
  const gradientId = `splash-gradient-${useId()}`;

  useEffect(() => {
    const skip = () => onDone();
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });
    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [onDone]);

  // The mark comes from packages/ui/src/nebula-clock-mark.svg (viewBox 100: transform origins
  // in viewBox units, see splash.css).
  const mark = (
    <svg className="splash-mark" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <circle
        className="splash-mark-halo"
        style={{ transformOrigin: '50px 50px' }}
        cx="50"
        cy="50"
        r="48"
        fill="var(--accent-glow)"
      />
      <rect
        className="splash-mark-plate splash-plate"
        style={{ transformOrigin: '50px 50px' }}
        width="100"
        height="100"
        rx="24"
      />
      <circle
        className="splash-mark-draw"
        pathLength={100}
        cx="50"
        cy="50"
        r="32"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="8"
        transform="rotate(-90 50 50)"
      />
      <path
        className="splash-mark-star"
        style={{ transformOrigin: '50px 50px' }}
        d="M50 50V32.5M50 50l10.83 6.25"
        stroke={`url(#${gradientId})`}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

  return (
    // Decorative: the real UI is behind it and already reachable.
    <div className="splash-overlay" aria-hidden="true">
      <Splash
        title={t('common:app.name')}
        tagline={t('common:app.tagline')}
        mark={mark}
        motion={motion}
        onFinish={onDone}
      />
    </div>
  );
}
