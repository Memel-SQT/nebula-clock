import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useBreakReminders } from '../hooks/useBreakReminders.js';

/**
 * Stretch and hydration prompt shown during breaks. Uses a polite live
 * region so it is announced without cutting across whatever else is being
 * read out.
 */
export function BreakReminder() {
  const { t } = useTranslation(['timer']);
  const message = useBreakReminders();

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 px-4"
        >
          <div className="flex items-center gap-3 rounded-pill border border-border bg-card px-5 py-3 shadow-card">
            <Sparkles size={16} aria-hidden="true" className="shrink-0 text-accent" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                {t('timer:reminders.title')}
              </p>
              <p className="text-sm">{message}</p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
