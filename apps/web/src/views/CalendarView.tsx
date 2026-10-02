import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { buildCalendar, formatFocusTime, toDayKey } from '@nebula-clock/core';
import { Card, IconButton, PageHeader, cn } from '@nebula-clock/ui';
import { useDataStore } from '../store/dataStore.js';
import { useSettingsStore } from '../store/settingsStore.js';

const LEVELS = [0, 1, 2, 3, 4] as const;

/**
 * Month heat map. A real ARIA grid: weeks are rows, one roving tab stop, the arrow keys move
 * between days (Home / End within the week). It used to put all 42 days in the tab order.
 */
export function CalendarView() {
  const { t, i18n } = useTranslation(['stats', 'common']);
  const sessions = useDataStore((state) => state.sessions);
  const goals = useSettingsStore((state) => state.settings.goals);
  const [monthOffset, setMonthOffset] = useState(0);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  const todayKey = toDayKey(Date.now());
  const weekdays = t('common:weekdaysShort', { returnObjects: true }) as unknown as string[];
  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(reference));
  const dayFormatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' });

  // The roving tab stop: the focused cell, else today, else the 1st of the month.
  const defaultIndex = Math.max(
    0,
    cells.findIndex((cell) => cell.day === todayKey) >= 0
      ? cells.findIndex((cell) => cell.day === todayKey)
      : cells.findIndex((cell) => cell.inMonth),
  );
  const tabIndex = focusIndex ?? defaultIndex;

  const moveFocus = (index: number) => {
    const next = Math.min(cells.length - 1, Math.max(0, index));
    setFocusIndex(next);
    cellRefs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 7,
      ArrowUp: -7,
    };
    if (event.key in steps) {
      event.preventDefault();
      moveFocus(index + (steps[event.key] ?? 0));
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveFocus(index - (index % 7));
    } else if (event.key === 'End') {
      event.preventDefault();
      moveFocus(index - (index % 7) + 6);
    }
  };

  const changeMonth = (delta: number) => {
    setFocusIndex(null);
    setMonthOffset((current) => Math.min(0, current + delta));
  };

  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, week) =>
    cells.slice(week * 7, week * 7 + 7),
  );

  return (
    <>
      <PageHeader
        eyebrow={t('common:pages.calendar.eyebrow')}
        title={t('stats:calendar.title')}
        intro={t('stats:calendar.intro')}
      />

      <Card className="calendar-panel">
        <div className="calendar-head">
          <IconButton
            label={t('stats:calendar.previousMonth')}
            icon="chevronLeft"
            variant="ghost"
            size="sm"
            onClick={() => changeMonth(-1)}
          />
          <h2 className="calendar-month">{monthLabel}</h2>
          <IconButton
            label={t('stats:calendar.nextMonth')}
            icon="chevronRight"
            variant="ghost"
            size="sm"
            disabled={monthOffset >= 0}
            onClick={() => changeMonth(1)}
          />
        </div>

        <div role="grid" aria-label={monthLabel} className="calendar-grid">
          <div role="row" className="calendar-row">
            {(Array.isArray(weekdays) ? weekdays : []).map((day) => (
              <div key={day} role="columnheader" className="calendar-weekday">
                {day}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={week[0]?.day ?? weekIndex} role="row" className="calendar-row">
              {week.map((cell, dayIndex) => {
                const index = weekIndex * 7 + dayIndex;
                const isToday = cell.day === todayKey;
                const label = t('stats:calendar.cellAria', {
                  date: dayFormatter.format(new Date(cell.date)),
                  count: cell.pomodoros,
                });
                return (
                  <div
                    key={cell.day}
                    ref={(element) => {
                      cellRefs.current[index] = element;
                    }}
                    role="gridcell"
                    tabIndex={index === tabIndex ? 0 : -1}
                    aria-label={isToday ? `${label} · ${t('stats:calendar.today')}` : label}
                    aria-current={isToday ? 'date' : undefined}
                    title={`${dayFormatter.format(new Date(cell.date))} — ${cell.pomodoros} · ${formatFocusTime(cell.focusSeconds)}`}
                    onKeyDown={(event) => onKeyDown(event, index)}
                    onFocus={() => setFocusIndex(index)}
                    className={cn(
                      'calendar-cell',
                      `level-${cell.level}`,
                      !cell.inMonth && 'is-outside',
                      isToday && 'is-today',
                    )}
                  >
                    {new Date(cell.date).getDate()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="calendar-legend" aria-hidden="true">
          <span>{t('stats:calendar.legendLess')}</span>
          {LEVELS.map((level) => (
            <i key={level} className={`calendar-cell level-${level}`} />
          ))}
          <span>{t('stats:calendar.legendMore')}</span>
        </div>
      </Card>
    </>
  );
}
