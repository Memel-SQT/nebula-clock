import { useTranslation } from 'react-i18next';
import { Maximize2, PictureInPicture2 } from 'lucide-react';
import { Button, Card, LiveRegion } from '@nebula-clock/ui';
import {
  formatFocusTime,
  getRange,
  filterByRange,
  isPomodoro,
  summarize,
} from '@nebula-clock/core';
import { revealDelay } from '../lib/reveal.js';
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

export function TimerView({ onEnterFullscreen }: TimerViewProps) {
  const { t } = useTranslation(['timer', 'stats', 'common']);
  const view = useTimerView();
  const announcement = useTimerStore((state) => state.announcement);
  const sessions = useDataStore((state) => state.sessions);
  const goals = useSettingsStore((state) => state.settings.goals);

  const today = filterByRange(sessions, getRange('day'));
  const todaySummary = summarize(today);
  const desktop = getDesktop();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Every view needs a level-1 heading; here the countdown itself is the
          title, so the heading is for assistive technology only. */}
      <h1 className="sr-only">{t('common:nav.timer')}</h1>

      {/* Phase changes are announced here rather than by moving focus. */}
      <LiveRegion assertive>{announcement}</LiveRegion>

      <section
        className="nebula-reveal flex flex-col items-center gap-7 rounded-lg border border-border bg-card p-6 shadow-card sm:p-10"
        style={revealDelay(0)}
      >
        <PresetPicker />

        <TimerDisplay
          phase={view.phase}
          status={view.status}
          remaining={view.remaining}
          progress={view.progress}
          completedInCycle={view.completedInCycle}
          cycleTarget={view.cycleTarget}
        />

        <TimerControls status={view.status} phase={t(`timer:phase.${view.phase}`)} />

        <ActiveTaskPicker />

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border pt-5">
          <Button
            size="sm"
            variant="ghost"
            icon={<Maximize2 size={14} />}
            onClick={onEnterFullscreen}
          >
            {t('timer:fullscreen.enter')}
          </Button>
          {desktop && !desktop.isMiniWindow ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<PictureInPicture2 size={14} />}
              onClick={() => void desktop.openMiniMode()}
            >
              {t('timer:miniMode.enter')}
            </Button>
          ) : null}
        </div>
      </section>

      <aside className="space-y-4">
        {/* Each card arrives just after the one above it. */}
        <Card title={t('stats:range.today')} className="nebula-reveal" style={revealDelay(1)}>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-secondary">
                {t('stats:metrics.pomodoros')}
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">
                {todaySummary.pomodoros}
                <span className="text-sm text-text-secondary"> / {goals.dailyPomodoros}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-secondary">
                {t('stats:metrics.focusTime')}
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">
                {formatFocusTime(todaySummary.focusSeconds)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-text-secondary">
            {t('timer:cycle.sessionsToday', { count: today.filter(isPomodoro).length })}
          </p>
        </Card>

        <div className="nebula-reveal" style={revealDelay(2)}>
          <AmbientMixer />
        </div>

        <Card title={t('timer:shortcuts.title')} className="nebula-reveal" style={revealDelay(3)}>
          <dl className="space-y-1.5 text-sm">
            {[
              ['Space', t('timer:shortcuts.toggle')],
              ['N', t('timer:shortcuts.skip')],
              ['R', t('timer:shortcuts.reset')],
              ['F', t('timer:shortcuts.fullscreen')],
              [',', t('timer:shortcuts.settings')],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">{label}</dt>
                <dd>
                  <kbd className="rounded border border-border bg-card-alt px-1.5 py-0.5 font-mono text-xs">
                    {key}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </aside>
    </div>
  );
}
