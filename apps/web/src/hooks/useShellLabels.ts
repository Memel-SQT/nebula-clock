import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getDesktop } from '../lib/platform.js';

/**
 * The tray menu and the "blocked app" notification are drawn by the main process, which has no
 * catalogue of its own: the renderer sends it the translated texts, again on every language
 * change (they used to be hard-coded in English).
 */
export function useShellLabels(): void {
  const { t, i18n } = useTranslation(['common']);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop?.setShellLabels) return;
    const raw = (key: string): string =>
      String(
        i18n.getResource(i18n.language, 'common', key) ??
          i18n.getResource('en', 'common', key) ??
          '',
      );
    desktop.setShellLabels({
      phase: {
        focus: t('common:tray.phase.focus'),
        shortBreak: t('common:tray.phase.shortBreak'),
        longBreak: t('common:tray.phase.longBreak'),
      },
      start: t('common:tray.start'),
      pause: t('common:tray.pause'),
      resume: t('common:tray.resume'),
      skip: t('common:tray.skip'),
      reset: t('common:tray.reset'),
      miniMode: t('common:tray.miniMode'),
      open: t('common:tray.open'),
      quit: t('common:tray.quit'),
      // Raw templates: the main process fills in the count and the app name itself.
      todayOne: raw('tray.today_one'),
      todayOther: raw('tray.today_other'),
      blockedTitle: t('common:tray.blockedTitle'),
      blockedBody: raw('tray.blockedBody'),
    });
  }, [t, i18n, i18n.language]);
}
