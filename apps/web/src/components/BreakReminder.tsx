import { useTranslation } from 'react-i18next';
import { Icon } from '@nebula-clock/ui';
import { useBreakReminders } from '../hooks/useBreakReminders.js';

/**
 * Stretch and hydration prompt shown during breaks. A polite live region announces it without
 * cutting across whatever else is being read out.
 */
export function BreakReminder() {
  const { t } = useTranslation(['timer']);
  const message = useBreakReminders();

  return (
    <div role="status" aria-live="polite">
      {message ? (
        <div key={message} className="toast nebula-surface">
          <Icon name="sparkles" size={18} />
          <div>
            <p className="eyebrow">{t('timer:reminders.title')}</p>
            <p>{message}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
