import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GlowBackground, Logo } from '@nebula-clock/ui';

/** Long enough for the mark to finish drawing, short enough not to annoy. */
const DURATION_MS = 1500;

export interface SplashScreenProps {
  onDone: () => void;
}

/**
 * The launch screen: the Nebula Clock mark draws itself over the ambient
 * glow, then hands over to the app.
 *
 * The app is already mounted underneath, and this overlay never takes pointer
 * events, so nothing is actually blocked while it plays - it can be dismissed
 * early by any key or click, and it is skipped entirely under reduced motion.
 */
export function SplashScreen({ onDone }: SplashScreenProps) {
  const { t } = useTranslation(['common']);

  useEffect(() => {
    const timer = window.setTimeout(onDone, DURATION_MS);
    const skip = () => onDone();
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [onDone]);

  return (
    <motion.div
      // Decorative: the real UI is behind it and already reachable.
      aria-hidden="true"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-canvas"
    >
      <GlowBackground />

      <div className="relative z-10 flex flex-col items-center gap-5">
        <Logo size={104} animated />

        <div className="overflow-hidden text-center">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62, duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
            className="text-xl font-bold tracking-tight"
          >
            {t('common:app.name')}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.78, duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
            className="mt-1 text-sm text-text-secondary"
          >
            {t('common:app.tagline')}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
