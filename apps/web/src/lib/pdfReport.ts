/**
 * The PDF statistics report.
 *
 * Generated entirely in the browser with jsPDF - no rendering service, no
 * upload. Styled with the Nebula palette so it looks like the app it came
 * from, and localised through the caller's `t`.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  bucketize,
  filterByRange,
  formatFocusTime,
  getRange,
  isPomodoro,
  summarize,
  toDayKey,
  type RangeKind,
  type Session,
  type Task,
} from '@nebula-clock/core';
import { nebulaTokens } from '@nebula-clock/ui';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface ReportOptions {
  sessions: readonly Session[];
  tasks: readonly Task[];
  range: RangeKind;
  reference: number;
  locale: string;
  t: Translate;
  appVersion: string;
}

/** `#4C6EF5` -> `[76, 110, 245]`, which is what jsPDF wants. */
function rgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

export function buildStatsReport(options: ReportOptions): jsPDF {
  const { sessions, tasks, range, reference, locale, t, appVersion } = options;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const period = getRange(range, reference);
  const inRange = filterByRange(sessions, period);
  const summary = summarize(inRange);

  const violet = rgb(nebulaTokens.brand.violet);
  const blue = rgb(nebulaTokens.brand.blue);
  const secondary = rgb(nebulaTokens.light.textSecondary);
  const margin = 48;
  const width = doc.internal.pageSize.getWidth();

  // --- Header band, carrying the Nebula gradient's two ends.
  doc.setFillColor(...blue);
  doc.rect(0, 0, width, 6, 'F');
  doc.setFillColor(...violet);
  doc.rect(width / 2, 0, width / 2, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...rgb(nebulaTokens.light.text));
  doc.text(t('stats:report.title'), margin, 62);

  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'long' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...secondary);
  doc.text(t('stats:report.generated', { date: formatter.format(new Date()) }), margin, 80);
  doc.text(
    `${t('stats:report.period')}: ${t(`stats:range.${range}`)} — ${formatter.format(
      new Date(period.start),
    )}`,
    margin,
    95,
  );

  // --- Summary table.
  autoTable(doc, {
    startY: 120,
    head: [[t('stats:report.summary'), '']],
    body: [
      [t('stats:metrics.pomodoros'), String(summary.pomodoros)],
      [t('stats:metrics.focusTime'), formatFocusTime(summary.focusSeconds)],
      [t('stats:metrics.breakTime'), formatFocusTime(summary.breakSeconds)],
      [t('stats:metrics.completionRate'), `${Math.round(summary.completionRate * 100)}%`],
      [t('stats:metrics.averageSession'), formatFocusTime(summary.averagePomodoroSeconds)],
      [t('stats:metrics.activeDays'), String(summary.activeDays)],
    ],
    theme: 'grid',
    headStyles: { fillColor: violet, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: margin, right: margin },
  });

  // --- Focus time per task.
  const perTask = new Map<string, { title: string; pomodoros: number; seconds: number }>();
  for (const session of inRange) {
    if (session.phase !== 'focus' || !session.taskId) continue;
    const title = tasks.find((task) => task.id === session.taskId)?.title ?? '—';
    const entry = perTask.get(session.taskId) ?? { title, pomodoros: 0, seconds: 0 };
    entry.seconds += session.durationSeconds;
    if (session.completed) entry.pomodoros += 1;
    perTask.set(session.taskId, entry);
  }

  const topTasks = [...perTask.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 10);
  let cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28;

  if (topTasks.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [[t('stats:report.task'), t('stats:metrics.pomodoros'), t('stats:metrics.focusTime')]],
      body: topTasks.map((entry) => [
        entry.title,
        String(entry.pomodoros),
        formatFocusTime(entry.seconds),
      ]),
      theme: 'striped',
      headStyles: { fillColor: blue, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 6 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: margin, right: margin },
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28;
  }

  // --- Per-bucket breakdown, skipping quiet periods to keep it readable.
  const buckets = bucketize(inRange, range, reference).filter((bucket) => bucket.focusSeconds > 0);
  if (buckets.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [[t('stats:report.date'), t('stats:metrics.pomodoros'), t('stats:metrics.focusTime')]],
      body: buckets.map((bucket) => [
        range === 'day' ? `${bucket.key}:00` : bucket.key,
        String(bucket.pomodoros),
        formatFocusTime(bucket.focusSeconds),
      ]),
      theme: 'striped',
      headStyles: { fillColor: violet, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: margin, right: margin },
    });
  }

  // --- Footer on every page: the privacy promise and the app version.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(...secondary);
    doc.text(t('stats:report.privacy'), margin, doc.internal.pageSize.getHeight() - 24);
    doc.text(
      `Nebula Clock ${appVersion} — ${page}/${pages}`,
      width - margin,
      doc.internal.pageSize.getHeight() - 24,
      { align: 'right' },
    );
  }

  return doc;
}

export function reportFilename(range: RangeKind, reference: number): string {
  return `nebula-clock-report-${range}-${toDayKey(reference)}.pdf`;
}

/** Convenience for the "how many today" line on the export button. */
export function pomodorosIn(
  sessions: readonly Session[],
  range: RangeKind,
  reference: number,
): number {
  return filterByRange(sessions, getRange(range, reference)).filter(isPomodoro).length;
}
