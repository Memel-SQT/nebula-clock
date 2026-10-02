import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Icon } from '@nebula-clock/ui';
import { getDesktop, type UpdateEvent } from '../lib/platform.js';

/**
 * Surfaces electron-updater progress. Only ever renders in the desktop build, and only once an
 * update has actually finished downloading. Its button is secondary: the screen's own primary
 * action (Start, Add…) keeps the gradient.
 */
export function UpdateBanner() {
  const { t } = useTranslation(['settings']);
  const [event, setEvent] = useState<UpdateEvent | null>(null);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;
    return desktop.onUpdateEvent(setEvent);
  }, []);

  if (event?.type !== 'downloaded') return null;

  return (
    <div role="status" className="state-banner tone-accent">
      <Icon name="download" size={18} />
      <div>
        <strong>{t('settings:about.updateReady')}</strong>
      </div>
      <Button size="sm" variant="secondary" onClick={() => getDesktop()?.quitAndInstall()}>
        {t('settings:about.restartNow')}
      </Button>
    </div>
  );
}
