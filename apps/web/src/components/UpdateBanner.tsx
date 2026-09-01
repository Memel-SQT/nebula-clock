import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Button } from '@nebula-clock/ui';
import { getDesktop, type UpdateEvent } from '../lib/platform.js';

/**
 * Surfaces electron-updater progress. Only ever renders in the desktop build,
 * and only once an update has actually finished downloading.
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
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent/40 bg-accent/10 px-4 py-3"
    >
      <span className="flex items-center gap-2 text-sm">
        <Download size={16} aria-hidden="true" className="text-accent" />
        {t('settings:about.updateReady')}
      </span>
      <Button size="sm" variant="primary" onClick={() => getDesktop()?.quitAndInstall()}>
        {t('settings:about.restartNow')}
      </Button>
    </div>
  );
}
