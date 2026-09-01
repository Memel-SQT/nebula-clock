import type { Phase } from '../types.js';

export type TimerStatus = 'idle' | 'running' | 'paused';

/** Everything the machine needs, in seconds - no minutes, no UI concerns. */
export interface TimerConfig {
  focusSeconds: number;
  shortBreakSeconds: number;
  longBreakSeconds: number;
  cyclesBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}

/**
 * The machine state is serialisable and holds no timers of its own.
 *
 * Elapsed time is derived from `startedAt` (a wall-clock timestamp) rather
 * than accumulated by an interval, which is what keeps the countdown exact
 * after the tab is throttled or the machine sleeps.
 */
export interface TimerState {
  status: TimerStatus;
  phase: Phase;
  /** When the current run segment began; `null` unless `status === 'running'`. */
  startedAt: number | null;
  /** Seconds banked by previous run segments of this same phase. */
  elapsedBeforeStart: number;
  /** Focus sessions finished since the last long break. */
  completedInCycle: number;
  /** Focus sessions finished since the machine was created. */
  completedFocusSessions: number;
}

export type TimerEvent =
  | { type: 'START'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'TOGGLE'; now: number }
  | { type: 'SKIP'; now: number }
  | { type: 'RESET'; now: number }
  | { type: 'TICK'; now: number }
  /** Applied when the user edits durations mid-session. */
  | { type: 'CONFIGURE'; now: number };

/**
 * Side effects the machine wants the host to perform. Returning them instead
 * of firing them keeps the machine pure and testable: React subscribes and
 * turns them into notifications, sounds and persisted sessions.
 */
export type TimerEffect =
  | {
      type: 'phaseCompleted';
      phase: Phase;
      startedAt: number;
      endedAt: number;
      durationSeconds: number;
      plannedSeconds: number;
    }
  | {
      type: 'phaseAborted';
      phase: Phase;
      startedAt: number;
      endedAt: number;
      durationSeconds: number;
      plannedSeconds: number;
    }
  | { type: 'phaseStarted'; phase: Phase; at: number }
  | { type: 'cycleCompleted'; at: number };

export interface TimerTransition {
  state: TimerState;
  effects: TimerEffect[];
}
