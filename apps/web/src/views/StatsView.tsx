import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Percent,
  Target,
  Timer,
} from 'lucide-react';
import {
  addDays,
  bucketize,
  buildTimeline,
  computeStreak,
  dailyGoalProgress,
  evaluateBadges,
  filterByRange,
  formatFocusTime,
  getRange,
  summarize,
  weeklyGoalProgress,
  type RangeKind,
} from '@nebula-clock/core';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ProgressBar,
  SegmentedControl,
  Stat,
  cn,
} from '@nebula-clock/ui';
import { StatsCharts } from '../components/StatsCharts.js';
import { buildStatsReport, reportFilename } from '../lib/pdfReport.js';
import { useDataStore } from '../store/dataStore.js';
import { useSettingsStore } from '../store/settingsStore.js';

const APP_VERSION = __APP_VERSION__;

export function StatsView() {
  const { t, i18n } = useTranslation(['stats', 'common', 'timer']);
  const sessions = useDataStore((state) => state.sessions);
  const tasks = useDataStore((state) => state.tasks);
  const goals = useSettingsStore((state) => state.settings.goals);

  const [range, setRange] = useState<RangeKind>('week');
  // Offset in whole periods from the current one; 0 is "now".
  const [offset, setOffset] = useState(0);

  const reference = useMemo(() => {
    const now = Date.now();
    if (offset === 0) return now;
    if (range === 'day') return addDays(now, offset);
    if (range === 'week') return addDays(now, offset * 7);
    const date = new Date(now);
    if (range === 'month') date.setMonth(date.getMonth() + offset);
    else date.setFullYear(date.getFullYear() + offset);
    return date.getTime();
  }, [range, offset]);

  const period = getRange(range, reference);
  const inRange = useMemo(() => filterByRange(sessions, period), [sessions, period]);
  const summary = useMemo(() => summarize(inRange), [inRange]);
  const buckets = useMemo(() => bucketize(inRange, range, reference), [inRange, range, reference]);

  const streak = useMemo(
    () => computeStreak(sessions, goals.dailyPomodoros),
    [sessions, goals.dailyPomodoros],
  );
  const badges = useMemo(() => evaluateBadges(sessions, goals), [sessions, goals]);
  const daily = dailyGoalProgress(sessions, goals);
  const weekly = weeklyGoalProgress(sessions, goals);

  const taskTitles = useMemo(() => new Map(tasks.map((task) => [task.id, task.title])), [tasks]);
  const timeline = useMemo(() => buildTimeline(inRange, taskTitles, 40), [inRange, taskTitles]);

  // Intl.DateTimeFormat throws if `dateStyle` is combined with individual
  // component options, so each range picks one shape or the other.
  const periodFormat: Intl.DateTimeFormatOptions =
    range === 'year'
      ? { year: 'numeric' }
      : range === 'month'
        ? { year: 'numeric', month: 'long' }
        : { dateStyle: 'medium' };
  const periodLabel = new Intl.DateTimeFormat(i18n.language, periodFormat).format(
    new Date(period.start),
  );

  const exportPdf = () => {
    const doc = buildStatsReport({
      sessions,
      tasks,
      range,
      reference,
      locale: i18n.language,
      t,
      appVersion: APP_VERSION,
    });
    doc.save(reportFilename(range, reference));
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('stats:title')}</h1>
          <p className="text-sm text-text-secondary">{t('stats:subtitle')}</p>
        </div>
        <Button size="sm" onClick={exportPdf}>
          {t('stats:report.export')}
        </Button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label={t('stats:range.label')}
          value={range}
          onChange={(next) => {
            setRange(next);
            setOffset(0);
          }}
          options={[
            { value: 'day', label: t('stats:range.day') },
            { value: 'week', label: t('stats:range.week') },
            { value: 'month', label: t('stats:range.month') },
            { value: 'year', label: t('stats:range.year') },
          ]}
        />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            aria-label={t('stats:range.previous')}
            onClick={() => setOffset((current) => current - 1)}
            icon={<ChevronLeft size={16} />}
          />
          <span className="min-w-32 text-center text-sm font-medium tabular-nums">
            {offset === 0 ? t('stats:range.today') : periodLabel}
          </span>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t('stats:range.next')}
            disabled={offset >= 0}
            onClick={() => setOffset((current) => Math.min(0, current + 1))}
            icon={<ChevronRight size={16} />}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<Clock size={14} />}
          label={t('stats:metrics.focusTime')}
          value={formatFocusTime(summary.focusSeconds)}
        />
        <Stat
          icon={<Timer size={14} />}
          label={t('stats:metrics.pomodoros')}
          value={summary.pomodoros}
        />
        <Stat
          icon={<Percent size={14} />}
          label={t('stats:metrics.completionRate')}
          value={`${Math.round(summary.completionRate * 100)}%`}
        />
        <Stat
          icon={<Target size={14} />}
          label={t('stats:metrics.averageSession')}
          value={formatFocusTime(summary.averagePomodoroSeconds)}
        />
      </div>

      <Card>
        <StatsCharts buckets={buckets} range={range} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t('stats:goals.title')}>
          <div className="space-y-4">
            {[
              { label: t('stats:goals.daily'), progress: daily },
              { label: t('stats:goals.weekly'), progress: weekly },
            ].map(({ label, progress }) => (
              <div key={label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-mono tabular-nums text-text-secondary">
                    {t('stats:goals.progress', {
                      done: progress.done,
                      target: progress.target,
                    })}
                  </span>
                </div>
                <ProgressBar
                  value={progress.ratio}
                  label={label}
                  tone={progress.reached ? 'success' : 'accent'}
                />
                {progress.reached ? (
                  <p className="mt-1 text-xs text-success">{t('stats:goals.reached')}</p>
                ) : (
                  <p className="mt-1 text-xs text-text-secondary">
                    {t('stats:goals.remaining', { count: progress.target - progress.done })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card title={t('stats:streak.title')}>
          <div className="flex items-center gap-6">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-pill bg-nebula-gradient shadow-glow">
              <Flame size={30} className="text-white" aria-hidden="true" />
            </div>
            <dl className="flex-1 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">{t('stats:streak.current')}</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {t('stats:streak.days', { count: streak.current })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">{t('stats:streak.longest')}</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {t('stats:streak.days', { count: streak.longest })}
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            {streak.achievedToday ? t('stats:streak.todayDone') : t('stats:streak.todayPending')}
          </p>
        </Card>
      </div>

      <Card title={t('stats:badges.title')}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => (
            <li
              key={badge.id}
              className={cn(
                'flex items-center gap-3 rounded-md border p-3 transition-colors duration-base',
                badge.earned ? 'border-accent/40 bg-accent/5' : 'border-border opacity-70',
              )}
            >
              <div
                aria-hidden="true"
                className={cn(
                  'grid h-10 w-10 shrink-0 place-items-center rounded-pill',
                  badge.earned
                    ? 'bg-nebula-gradient text-white shadow-glow'
                    : 'bg-card-alt text-text-secondary',
                )}
              >
                <Award size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {t(`stats:badges.${badge.labelKey}`)}
                </p>
                {badge.earned ? (
                  <Chip tone="accent" size="sm">
                    {t('stats:badges.earned')}
                  </Chip>
                ) : (
                  <ProgressBar
                    value={badge.progress}
                    label={t(`stats:badges.${badge.labelKey}`)}
                    size="sm"
                    className="mt-1.5"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t('stats:timeline.title')}>
        {timeline.length === 0 ? (
          <EmptyState title={t('stats:timeline.empty')} />
        ) : (
          <ol className="relative space-y-3 border-l border-border pl-5">
            {timeline.map((entry) => (
              <li key={entry.id} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-pill ring-4 ring-[var(--card)]',
                    entry.phase === 'focus'
                      ? entry.completed
                        ? 'bg-nebula-gradient'
                        : 'bg-warning'
                      : 'bg-success',
                  )}
                />
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium">{t(`timer:phase.${entry.phase}`)}</span>
                  <span className="font-mono text-xs tabular-nums text-text-secondary">
                    {formatFocusTime(entry.durationSeconds)}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {t('stats:timeline.at', {
                      time: new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(entry.startedAt)),
                    })}
                  </span>
                  {!entry.completed ? (
                    <Chip tone="warning" size="sm">
                      {t('stats:timeline.aborted')}
                    </Chip>
                  ) : null}
                  {entry.taskTitle ? (
                    <span className="truncate text-xs text-text-secondary">
                      · {entry.taskTitle}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
