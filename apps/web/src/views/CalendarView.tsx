import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildCalendar, formatFocusTime } from '@nebula-clock/core';
import { Card, IconButton, cn } from '@nebula-clock/ui';
import { useDataStore } from '../store/dataStore.js';
import { useSettingsStore } from '../store/settingsStore.js';

/** Heat ramp, from "nothing" to "well past the daily goal". */
const LEVELS = [
  'bg-card-alt',
  'bg-accent/25',
  'bg-accent/45',
  'bg-accent/70',
  'bg-nebula-gradient',
] as const;

export function CalendarView() {
  const { t, i18n } = useTranslation(['stats', 'common']);
  const sessions = useDataStore((state) => state.sessions);
  const goals = useSettingsStore((state) => state.settings.goals);
  const [monthOffset, setMonthOffset] = useState(0);

  const reference = useMemo(() => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + monthOffset);
    return date.getTime();
  }, [monthOffset]);

  const cells = useMemo(
    () => buildCalendar(sessions, goals, reference),
    [sessions, goals, reference],
  );

  const weekdays = t('common:weekdaysShort', { returnObjects: true }) as unknown as string[];
  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(reference));
  const dayFormatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{t('stats:calendar.title')}</h1>
      </header>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <IconButton
            label={t('stats:calendar.previousMonth')}
            icon={<ChevronLeft size={16} />}
            onClick={() => setMonthOffset((current) => current - 1)}
          />
          <h2 className="text-sm font-semibold capitalize">{monthLabel}</h2>
          <IconButton
            label={t('stats:calendar.nextMonth')}
            icon={<ChevronRight size={16} />}
            disabled={monthOffset >= 0}
            onClick={() => setMonthOffset((current) => Math.min(0, current + 1))}
          />
        </div>

        <div role="grid" aria-label={monthLabel}>
          <div role="row" className="mb-1 grid grid-cols-7 gap-1.5">
            {(Array.isArray(weekdays) ? weekdays : []).map((day) => (
              <div
                key={day}
                role="columnheader"
                className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-text-secondary"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell) => (
              <div
                key={cell.day}
                role="gridcell"
                tabIndex={0}
                aria-label={t('stats:calendar.cellAria', {
                  date: dayFormatter.format(new Date(cell.date)),
                  count: cell.pomodoros,
                })}
                title={`${dayFormatter.format(new Date(cell.date))} — ${cell.pomodoros} · ${formatFocusTime(cell.focusSeconds)}`}
                className={cn(
                  'grid aspect-square place-items-center rounded text-xs font-medium tabular-nums',
                  'transition-transform duration-fast ease-nebula hover:scale-105',
                  LEVELS[cell.level],
                  cell.level >= 3 ? 'text-white' : 'text-text-secondary',
                  !cell.inMonth && 'opacity-35',
                )}
              >
                {new Date(cell.date).getDate()}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-text-secondary">
          <span>{t('stats:calendar.legendLess')}</span>
          {LEVELS.map((level, index) => (
            <span key={index} aria-hidden="true" className={cn('h-3 w-3 rounded-sm', level)} />
          ))}
          <span>{t('stats:calendar.legendMore')}</span>
        </div>
      </Card>
    </div>
  );
}
