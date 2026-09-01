import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Bucket, RangeKind } from '@nebula-clock/core';
import { formatFocusTime } from '@nebula-clock/core';
import { EmptyState } from '@nebula-clock/ui';

export interface StatsChartsProps {
  buckets: Bucket[];
  range: RangeKind;
}

/** Compact x-axis labels: `09:00`, `14`, `Mar`. */
function tickLabel(key: string, range: RangeKind, monthsShort: string[]): string {
  if (range === 'day') return `${key}:00`;
  if (range === 'year') {
    const month = Number(key.split('-')[1]) - 1;
    return monthsShort[month] ?? key;
  }
  return key.slice(-2);
}

export function StatsCharts({ buckets, range }: StatsChartsProps) {
  const { t } = useTranslation(['stats', 'common']);
  const monthsShort = t('common:monthsShort', { returnObjects: true }) as unknown as string[];

  const data = buckets.map((bucket) => ({
    key: bucket.key,
    label: tickLabel(bucket.key, range, Array.isArray(monthsShort) ? monthsShort : []),
    minutes: Math.round(bucket.focusSeconds / 60),
    pomodoros: bucket.pomodoros,
  }));

  if (data.every((point) => point.minutes === 0)) {
    return <EmptyState title={t('stats:chart.noData')} />;
  }

  // Recharts needs concrete colours, so the tokens are read off the document.
  const styles = getComputedStyle(document.documentElement);
  const accentFrom = styles.getPropertyValue('--accent-from').trim() || '#4C6EF5';
  const accentTo = styles.getPropertyValue('--accent-to').trim() || '#8B5CF6';
  const border = styles.getPropertyValue('--border').trim() || '#2A2A45';
  const textSecondary = styles.getPropertyValue('--text-secondary').trim() || '#9A94B8';
  const card = styles.getPropertyValue('--card').trim() || '#1A1A2E';
  const text = styles.getPropertyValue('--text').trim() || '#F1F1F6';

  const axis = { stroke: textSecondary, fontSize: 11, tickLine: false, axisLine: false };
  const tooltipStyle = {
    backgroundColor: card,
    border: `1px solid ${border}`,
    borderRadius: 12,
    color: text,
    fontSize: 12,
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium text-text-secondary">
          {t('stats:chart.focusByPeriod')}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentTo} stopOpacity={0.45} />
                <stop offset="100%" stopColor={accentFrom} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} width={44} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ stroke: accentTo, strokeOpacity: 0.3 }}
              formatter={(value: number) => [
                formatFocusTime(value * 60),
                t('stats:metrics.focusTime'),
              ]}
            />
            <Area
              type="monotone"
              dataKey="minutes"
              stroke={accentTo}
              strokeWidth={2}
              fill="url(#focusFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-text-secondary">
          {t('stats:chart.pomodorosByPeriod')}
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} width={44} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: accentTo, fillOpacity: 0.08 }}
              formatter={(value: number) => [value, t('stats:metrics.pomodoros')]}
            />
            <Bar dataKey="pomodoros" fill={accentTo} radius={[6, 6, 0, 0]} maxBarSize={38} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
