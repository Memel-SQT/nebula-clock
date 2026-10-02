/**
 * Validation of everything the renderer sends over IPC. The renderer is our own code, but the
 * main process treats it as untrusted input: a compromised page must not be able to write an
 * arbitrary line into the hosts file, open any URL, or feed garbage to the tray.
 */
import { normalizeAppName, normalizeList, normalizeSite } from '@nebula-clock/core/blocker';
import type {
  BlockerConfig,
  DesktopCommand,
  DesktopTimerSnapshot,
  NotificationPayload,
  Phase,
  ShellLabels,
  WindowChrome,
} from './ipc.js';

const PHASES: readonly Phase[] = ['focus', 'shortBreak', 'longBreak'];
const STATUSES = ['idle', 'running', 'paused'] as const;
const COMMANDS: readonly DesktopCommand[] = [
  'toggle',
  'start',
  'pause',
  'skip',
  'reset',
  'mini-mode',
];
const HEX = /^#[0-9a-f]{6}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const text = (value: unknown, max: number): string | null =>
  typeof value === 'string' ? value.slice(0, max) : null;

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

export function asCommand(value: unknown): DesktopCommand | null {
  return COMMANDS.includes(value as DesktopCommand) ? (value as DesktopCommand) : null;
}

export function asNotification(value: unknown): NotificationPayload | null {
  const raw = record(value);
  const title = text(raw?.title, 120);
  const body = text(raw?.body, 400);
  if (!raw || title === null || body === null) return null;
  return { title, body, silent: raw.silent === true };
}

export function asSnapshot(value: unknown): DesktopTimerSnapshot | null {
  const raw = record(value);
  if (!raw) return null;
  const display = text(raw.display, 12);
  if (
    !PHASES.includes(raw.phase as Phase) ||
    !STATUSES.includes(raw.status as (typeof STATUSES)[number]) ||
    display === null ||
    !finite(raw.remainingSeconds) ||
    !finite(raw.completedToday) ||
    !finite(raw.progress) ||
    !finite(raw.completedInCycle) ||
    !finite(raw.cycleTarget)
  ) {
    return null;
  }
  return {
    phase: raw.phase as Phase,
    status: raw.status as DesktopTimerSnapshot['status'],
    remainingSeconds: Math.max(0, raw.remainingSeconds),
    display,
    completedToday: Math.max(0, Math.round(raw.completedToday)),
    progress: Math.min(1, Math.max(0, raw.progress)),
    completedInCycle: Math.max(0, Math.round(raw.completedInCycle)),
    cycleTarget: Math.min(12, Math.max(1, Math.round(raw.cycleTarget))),
  };
}

/** Only plain hostnames and executable names survive: see `normalizeSite`. */
export function asBlockerConfig(value: unknown): BlockerConfig | null {
  const raw = record(value);
  if (!raw || (raw.mode !== 'blacklist' && raw.mode !== 'whitelist')) return null;
  return {
    enabled: raw.enabled === true,
    active: raw.active === true,
    mode: raw.mode,
    sites: Array.isArray(raw.sites) ? normalizeList(raw.sites, normalizeSite) : [],
    apps: Array.isArray(raw.apps) ? normalizeList(raw.apps, normalizeAppName) : [],
  };
}

export function asWindowChrome(value: unknown): WindowChrome | null {
  const raw = record(value);
  return raw &&
    typeof raw.page === 'string' &&
    HEX.test(raw.page) &&
    typeof raw.ink === 'string' &&
    HEX.test(raw.ink)
    ? { page: raw.page, ink: raw.ink }
    : null;
}

export function asShellLabels(value: unknown): ShellLabels | null {
  const raw = record(value);
  const phase = record(raw?.phase);
  if (!raw || !phase) return null;
  const keys = [
    'start',
    'pause',
    'resume',
    'skip',
    'reset',
    'miniMode',
    'open',
    'quit',
    'todayOne',
    'todayOther',
    'blockedTitle',
    'blockedBody',
  ] as const;
  const labels: Record<string, string> = {};
  for (const key of keys) {
    const value = text(raw[key], 120);
    if (value === null) return null;
    labels[key] = value;
  }
  const phases: Partial<Record<Phase, string>> = {};
  for (const key of PHASES) {
    const value = text(phase[key], 60);
    if (value === null) return null;
    phases[key] = value;
  }
  return { ...(labels as Omit<ShellLabels, 'phase'>), phase: phases as Record<Phase, string> };
}

/** Links leaving the app: https only (never file:, javascript:, ms-msdt: and the like). */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
