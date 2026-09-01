import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_BREAK_REMINDERS, resolveLanguage } from '@nebula-clock/core';
import { useSettingsStore } from '../store/settingsStore.js';
import { useTimerStore } from '../store/timerStore.js';

/**
 * Stretch and hydration prompts during breaks.
 *
 * A message appears on a timer while a break is running, drawn at random from
 * the user's own list or, when that is empty, the built-in localised one.
 */
export function useBreakReminders(): string | null {
  const { i18n } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const phase = useTimerStore((state) => state.machine.phase);
  const status = useTimerStore((state) => state.machine.status);
  const [message, setMessage] = useState<string | null>(null);

  const { enabled, intervalSeconds, customMessages } = settings.breakReminders;
  const onBreak = phase !== 'focus' && status === 'running';

  useEffect(() => {
    if (!enabled || !onBreak) {
      setMessage(null);
      return;
    }

    const language = resolveLanguage(settings.language, [i18n.language]);
    const pool =
      customMessages.length > 0 ? customMessages : (DEFAULT_BREAK_REMINDERS[language] ?? []);
    if (pool.length === 0) return;

    // The auto-dismiss timer is tracked so it can be cancelled: an
    // un-cleared one would fire after the break ended and blank a prompt
    // belonging to the next one.
    let hideTimer = 0;

    const show = () => {
      const next = pool[Math.floor(Math.random() * pool.length)] ?? null;
      setMessage(next);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setMessage(null), 12_000);
    };

    show();
    const interval = window.setInterval(show, intervalSeconds * 1000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(hideTimer);
    };
  }, [enabled, onBreak, intervalSeconds, customMessages, settings.language, i18n.language]);

  return message;
}
