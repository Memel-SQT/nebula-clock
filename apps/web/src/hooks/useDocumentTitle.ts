import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimerStore, selectTimerView } from '../store/timerStore.js';
import { updateFavicon } from '../lib/favicon.js';

/**
 * Live countdown in the tab title, plus a favicon that draws the current
 * progress ring - so a backgrounded tab still tells you where you are.
 */
export function useDocumentTitle(): void {
  const { t } = useTranslation(['timer', 'common']);
  const view = useTimerStore(selectTimerView);

  useEffect(() => {
    const appName = t('common:app.name');
    const phase = t(`timer:phaseShort.${view.phase}`);

    document.title =
      view.status === 'idle' && view.progress === 0
        ? appName
        : `${view.display} · ${phase}${view.status === 'paused' ? ' ⏸' : ''}`;

    updateFavicon(view.phase, view.progress, view.status !== 'running');
  }, [t, view.display, view.phase, view.progress, view.status]);

  // Leave a sensible title behind if the component ever unmounts.
  useEffect(() => () => void (document.title = 'Nebula Clock'), []);
}
