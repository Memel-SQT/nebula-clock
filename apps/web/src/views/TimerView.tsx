import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, LiveRegion, PageHeader } from '@nebula-clock/ui';
import {
  KEYBOARD_SHORTCUTS,
  formatFocusTime,
  getRange,
  filterByRange,
  summarize,
} from '@nebula-clock/core';
import { ActiveTaskPicker } from '../components/ActiveTaskPicker.js';
import { AmbientMixer } from '../components/AmbientMixer.js';
import { PresetPicker } from '../components/PresetPicker.js';
import { TimerControls } from '../components/TimerControls.js';
import { TimerDisplay } from '../components/TimerDisplay.js';
import { getDesktop } from '../lib/platform.js';
import { useDataStore } from '../store/dataStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useTimerStore, useTimerView } from '../store/timerStore.js';

export interface TimerViewProps {
  onEnterFullscreen: () => void;
}

/** The ring follows the window: 220 px on a phone, up to 480 px on a large screen. */
function ringSize(): number {
  return Math.round(
    Math.min(480, Math.max(220, Math.min(window.innerHeight * 0.42, window.innerWidth - 96))),
  );
}

export function TimerView({ onEnterFullscreen }: TimerViewProps) {
  const [size, setSize] = useState(ringSize);
  useEffect(() => {
    const onResize = () => setSize(ringSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { t } = useTranslation(['timer', 'stats', 'common']);
  const view = useTimerView();
  const announcement = useTimerStore((state) => state.announcement);
  const sessions = useDataStore((state) => state.sessions);
  const goals = useSettingsStore((state) => state.settings.goals);

  const today = filterByRange(sessions, getRange('day'));
  const todaySummary = summarize(today);
  const desktop = getDesktop();

  const shortcuts: [string, string][] = [
    [t('timer:shortcuts.keySpace'), t('timer:shortcuts.toggle')],
    [KEYBOARD_SHORTCUTS.skip.toUpperCase(), t('timer:shortcuts.skip')],
    [KEYBOARD_SHORTCUTS.reset.toUpperCase(), t('timer:shortcuts.reset')],
    [KEYBOARD_SHORTCUTS.fullscreen.toUpperCase(), t('timer:shortcuts.fullscreen')],
    [KEYBOARD_SHORTCUTS.settings, t('timer:shortcuts.settings')],
  ];

  return (
    <>
      <PageHeader
        eyebrow={t('common:pages.timer.eyebrow')}
        title={t('common:nav.timer')}
        actions={
          <>
            <Button variant="ghost" size="sm" icon="expand" onClick={onEnterFullscreen}>
              {t('timer:fullscreen.enter')}
            </Button>
            {desktop && !desktop.isMiniWindow ? (
              <Button
                variant="ghost"
                size="sm"
                icon="miniWindow"
                onClick={() => void desktop.openMiniMode()}
              >
                {t('timer:miniMode.enter')}
              </Button>
            ) : null}
          </>
        }
      />

      {/* Phase changes are announced here rather than by moving focus. */}
      <LiveRegion assertive>{announcement}</LiveRegion>

      <div className="timer-layout">
        <section className="timer-stage panel nebula-surface" aria-label={t('common:nav.timer')}>
          <PresetPicker />

          <TimerDisplay
            phase={view.phase}
            status={view.status}
            remaining={view.remaining}
            progress={view.progress}
            completedInCycle={view.completedInCycle}
            cycleTarget={view.cycleTarget}
            size={size}
          />

          <TimerControls status={view.status} phase={t(`timer:phase.${view.phase}`)} />

          <ActiveTaskPicker />
        </section>

        <div className="timer-side motion-stagger">
          <Card
            title={t('stats:range.today')}
            count={t('stats:goals.progress', {
              done: todaySummary.pomodoros,
              target: goals.dailyPomodoros,
            })}
          >
            <div className="snapshot-row">
              <span>{t('stats:metrics.pomodoros')}</span>
              <strong>{todaySummary.pomodoros}</strong>
            </div>
            <div className="snapshot-row">
              <span>{t('stats:metrics.focusTime')}</span>
              <strong>{formatFocusTime(todaySummary.focusSeconds)}</strong>
            </div>
          </Card>

          <AmbientMixer />

          <Card title={t('timer:shortcuts.title')}>
            <dl className="shortcut-list">
              {shortcuts.map(([key, label]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <kbd className="kbd">{key}</kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
