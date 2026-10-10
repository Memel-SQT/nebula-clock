import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimerView } from '../store/timerStore.js';
import { updateFavicon } from '../lib/favicon.js';
import { usePackBrand } from '../store/packStore.js';

/**
 * Live countdown in the tab title, plus a favicon that draws the current
 * progress ring - so a backgrounded tab still tells you where you are.
 */
export function useDocumentTitle(): void {
  const { t } = useTranslation(['timer', 'common']);
  const view = useTimerView();
  const brand = usePackBrand();

  useEffect(() => {
    const appName = brand.name ?? t('common:app.name');
    const phase = t(`timer:phaseShort.${view.phase}`);

    document.title =
      view.status === 'idle' && view.progress === 0
        ? appName
        : `${view.display} · ${phase}${view.status === 'paused' ? ` (${t('timer:paused')})` : ''}`;

    updateFavicon(view.phase, view.progress, view.status !== 'running');
  }, [t, view.display, view.phase, view.progress, view.status, brand.name]);

  // Leave a sensible title behind if the component ever unmounts.
  useEffect(() => () => void (document.title = 'Nebula Clock'), []);
}
