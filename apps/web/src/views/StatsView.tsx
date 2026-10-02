import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Icon,
  IconButton,
  PageHeader,
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
    // From the 1st: adding months to the 31st would skip the shorter months.
    date.setDate(1);
    if (range === 'month') date.setMonth(date.getMonth() + offset);
    else date.setFullYear(date.getFullYear() + offset);
    return date.getTime();
  }, [range, offset]);

  // Memoized: a fresh object on every render would recompute every statistic below each time.
  const period = useMemo(() => getRange(range, reference), [range, reference]);
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

  // Intl.DateTimeFormat throws if `dateStyle` is combined with individual component options,
  // so each range picks one shape or the other.
  const periodFormat: Intl.DateTimeFormatOptions =
    range === 'year'
      ? { year: 'numeric' }
      : range === 'month'
        ? { year: 'numeric', month: 'long' }
        : { dateStyle: 'medium' };
  const formatted = new Intl.DateTimeFormat(i18n.language, periodFormat).format(
    new Date(period.start),
  );
  // "Today" only made sense for a day: the current week, month or year say so instead.
  const periodLabel =
    offset === 0
      ? t(`stats:range.current.${range}`)
      : range === 'week'
        ? t('stats:range.weekOf', { date: formatted })
        : formatted;

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

  const timeFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <>
      <PageHeader
        eyebrow={t('common:pages.stats.eyebrow')}
        title={t('stats:title')}
        intro={t('stats:subtitle')}
        actions={
          <Button variant="ghost" size="sm" icon="download" onClick={exportPdf}>
            {t('stats:report.export')}
          </Button>
        }
      />

      <div className="stack">
        <div className="range-bar">
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

          <div className="period-nav">
            <IconButton
              label={t('stats:range.previous')}
              icon="chevronLeft"
              size="sm"
              variant="ghost"
              onClick={() => setOffset((current) => current - 1)}
            />
            <span className="period-label" aria-live="polite">
              {periodLabel}
            </span>
            <IconButton
              label={t('stats:range.next')}
              icon="chevronRight"
              size="sm"
              variant="ghost"
              disabled={offset >= 0}
              onClick={() => setOffset((current) => Math.min(0, current + 1))}
            />
          </div>
        </div>

        <div className="summary-grid">
          <Stat
            icon="clock"
            label={t('stats:metrics.focusTime')}
            value={formatFocusTime(summary.focusSeconds)}
          />
          <Stat
            icon="timer"
            tone="gold"
            label={t('stats:metrics.pomodoros')}
            value={summary.pomodoros}
          />
          <Stat
            icon="percent"
            tone="positive"
            label={t('stats:metrics.completionRate')}
            value={`${Math.round(summary.completionRate * 100)} %`}
          />
          <Stat
            icon="target"
            tone="warning"
            label={t('stats:metrics.averageSession')}
            value={formatFocusTime(summary.averagePomodoroSeconds)}
          />
        </div>

        <Card eyebrow={periodLabel} title={t('stats:chart.focusByPeriod')}>
          <StatsCharts buckets={buckets} range={range} />
        </Card>

        <div className="insight-grid">
          <Card title={t('stats:goals.title')}>
            <div className="goal-list">
              {[
                { label: t('stats:goals.daily'), progress: daily },
                { label: t('stats:goals.weekly'), progress: weekly },
              ].map(({ label, progress }) => (
                <div key={label}>
                  <div className="goal-head">
                    <span>{label}</span>
                    <span className="tabular">
                      {t('stats:goals.progress', {
                        done: progress.done,
                        target: progress.target,
                      })}
                    </span>
                  </div>
                  <ProgressBar
                    value={progress.ratio}
                    label={label}
                    tone={progress.reached ? 'positive' : 'accent'}
                  />
                  <p className={cn('goal-note', progress.reached && 'is-reached')}>
                    {progress.reached
                      ? t('stats:goals.reached')
                      : t('stats:goals.remaining', { count: progress.target - progress.done })}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card title={t('stats:streak.title')}>
            <div className="streak">
              <span className="streak-badge" aria-hidden="true">
                <Icon name="flame" size={28} />
              </span>
              <dl className="flex-1">
                <div className="snapshot-row">
                  <dt>{t('stats:streak.current')}</dt>
                  <dd>
                    <strong>{t('stats:streak.days', { count: streak.current })}</strong>
                  </dd>
                </div>
                <div className="snapshot-row">
                  <dt>{t('stats:streak.longest')}</dt>
                  <dd>
                    <strong>{t('stats:streak.days', { count: streak.longest })}</strong>
                  </dd>
                </div>
              </dl>
            </div>
            <p className="goal-note">
              {streak.achievedToday ? t('stats:streak.todayDone') : t('stats:streak.todayPending')}
            </p>
          </Card>
        </div>

        <Card
          title={t('stats:badges.title')}
          count={`${badges.filter((badge) => badge.earned).length} / ${badges.length}`}
        >
          <ul className="badge-grid motion-stagger">
            {badges.map((badge) => (
              <li key={badge.id} className={cn('badge', badge.earned && 'is-earned')}>
                <span className="badge-icon" aria-hidden="true">
                  <Icon name="award" size={20} />
                </span>
                <div className="badge-body">
                  <p className="badge-name">{t(`stats:badges.${badge.labelKey}`)}</p>
                  {badge.earned ? (
                    <Chip tone="accent">{t('stats:badges.earned')}</Chip>
                  ) : (
                    <ProgressBar
                      value={badge.progress}
                      label={t(`stats:badges.${badge.labelKey}`)}
                      size="sm"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t('stats:timeline.title')} count={timeline.length}>
          {timeline.length === 0 ? (
            <EmptyState icon="history" title={t('stats:timeline.empty')} />
          ) : (
            <ol className="timeline">
              {timeline.map((entry) => (
                <li
                  key={entry.id}
                  className={cn(
                    'timeline-entry',
                    entry.phase !== 'focus'
                      ? 'is-break'
                      : entry.completed
                        ? 'is-done'
                        : 'is-aborted',
                  )}
                >
                  <span className="timeline-phase">{t(`timer:phase.${entry.phase}`)}</span>
                  <span className="tabular">{formatFocusTime(entry.durationSeconds)}</span>
                  <span>
                    {t('stats:timeline.at', { time: timeFormat.format(new Date(entry.startedAt)) })}
                  </span>
                  {!entry.completed ? (
                    <Chip tone="warning">{t('stats:timeline.aborted')}</Chip>
                  ) : null}
                  {entry.taskTitle ? (
                    <span className="timeline-task">{entry.taskTitle}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
