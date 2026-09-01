/**
 * The Pomodoro engine: a pure state machine over
 * `idle -> running -> paused` across the `focus | shortBreak | longBreak`
 * phases.
 *
 * It imports nothing from React, storage or the DOM, so the whole cycle can
 * be exercised in tests by feeding it timestamps. The host calls
 * `transition(state, { type: 'TICK', now })` on some cadence; the cadence
 * only affects how quickly a finished phase is *noticed*, never how long the
 * phase actually lasted -- elapsed time is always derived from wall-clock
 * timestamps, which is what keeps the countdown exact after the tab is
 * throttled or the machine sleeps.
 */
import type { Phase, TimerSettings } from '../types.js';
import type { TimerConfig, TimerEffect, TimerEvent, TimerState, TimerTransition } from './types.js';

/** Phases shorter than this are not worth writing to the session history. */
const MIN_RECORDED_SECONDS = 1;

export function createTimerConfig(settings: TimerSettings): TimerConfig {
  return {
    focusSeconds: Math.round(settings.focusMinutes * 60),
    shortBreakSeconds: Math.round(settings.shortBreakMinutes * 60),
    longBreakSeconds: Math.round(settings.longBreakMinutes * 60),
    cyclesBeforeLongBreak: settings.cyclesBeforeLongBreak,
    autoStartBreaks: settings.autoStartBreaks,
    autoStartFocus: settings.autoStartFocus,
  };
}

export function createInitialState(): TimerState {
  return {
    status: 'idle',
    phase: 'focus',
    startedAt: null,
    elapsedBeforeStart: 0,
    completedInCycle: 0,
    completedFocusSessions: 0,
  };
}

/** Configured length of a phase, in seconds. */
export function phaseDuration(phase: Phase, config: TimerConfig): number {
  switch (phase) {
    case 'focus':
      return config.focusSeconds;
    case 'shortBreak':
      return config.shortBreakSeconds;
    case 'longBreak':
      return config.longBreakSeconds;
  }
}

/** Seconds spent in the current phase, including the live run segment. */
export function elapsedSeconds(state: TimerState, now: number): number {
  if (state.status !== 'running' || state.startedAt === null) {
    return state.elapsedBeforeStart;
  }
  return state.elapsedBeforeStart + Math.max(0, (now - state.startedAt) / 1000);
}

/** Seconds left in the current phase, never negative. */
export function remainingSeconds(state: TimerState, config: TimerConfig, now: number): number {
  return Math.max(0, phaseDuration(state.phase, config) - elapsedSeconds(state, now));
}

/** Phase completion as a 0..1 ratio, for the progress ring. */
export function progress(state: TimerState, config: TimerConfig, now: number): number {
  const total = phaseDuration(state.phase, config);
  if (total <= 0) return 1;
  return Math.min(1, elapsedSeconds(state, now) / total);
}

export function isPhaseComplete(state: TimerState, config: TimerConfig, now: number): boolean {
  return state.status === 'running' && remainingSeconds(state, config, now) <= 0;
}

/**
 * Which phase follows the current one.
 *
 * `counted` says whether the focus phase being left actually earned a
 * pomodoro: a *skipped* focus session must not push the user closer to a
 * long break, otherwise skipping four times in a row would "earn" one.
 */
export function nextPhase(state: TimerState, config: TimerConfig, counted: boolean): Phase {
  if (state.phase !== 'focus') return 'focus';
  const total = counted ? state.completedInCycle + 1 : state.completedInCycle;
  return total >= config.cyclesBeforeLongBreak ? 'longBreak' : 'shortBreak';
}

function shouldAutoStart(phase: Phase, config: TimerConfig): boolean {
  return phase === 'focus' ? config.autoStartFocus : config.autoStartBreaks;
}

/** Timestamp at which the current phase began (start of its first segment). */
function phaseStartedAt(state: TimerState, now: number): number {
  return now - elapsedSeconds(state, now) * 1000;
}

function record(
  state: TimerState,
  config: TimerConfig,
  now: number,
  completed: boolean,
): TimerEffect | null {
  const planned = phaseDuration(state.phase, config);
  const elapsed = elapsedSeconds(state, now);
  if (!completed && elapsed < MIN_RECORDED_SECONDS) return null;

  const startedAt = phaseStartedAt(state, now);
  return {
    type: completed ? 'phaseCompleted' : 'phaseAborted',
    phase: state.phase,
    startedAt,
    // A completed phase ends exactly on its deadline, even if the tick that
    // noticed it arrived late; an aborted one ends when the user acted.
    endedAt: completed ? startedAt + planned * 1000 : now,
    durationSeconds: Math.round(completed ? planned : elapsed),
    plannedSeconds: planned,
  };
}

/**
 * Move into `target`, either idle-and-waiting or already running.
 *
 * `counted` mirrors `nextPhase`: it decides whether the focus phase we are
 * leaving advances the long-break cycle.
 */
function enterPhase(
  state: TimerState,
  target: Phase,
  now: number,
  autoStart: boolean,
  counted: boolean,
): TimerTransition {
  const earnedPomodoro = state.phase === 'focus' && counted;

  const next: TimerState = {
    status: autoStart ? 'running' : 'idle',
    phase: target,
    startedAt: autoStart ? now : null,
    elapsedBeforeStart: 0,
    // The counter resets once the long break is reached, so the UI reads as
    // "sessions done in the current cycle".
    completedInCycle:
      target === 'longBreak'
        ? 0
        : earnedPomodoro
          ? state.completedInCycle + 1
          : state.completedInCycle,
    completedFocusSessions: earnedPomodoro
      ? state.completedFocusSessions + 1
      : state.completedFocusSessions,
  };

  const effects: TimerEffect[] = [];
  if (target === 'longBreak') effects.push({ type: 'cycleCompleted', at: now });
  if (autoStart) effects.push({ type: 'phaseStarted', phase: target, at: now });
  return { state: next, effects };
}

/**
 * Finish the current phase and move on.
 *
 * A phase is only ever advanced **once** per call, even when `now` is far
 * past the deadline (a laptop that slept through an entire break).
 * Fabricating the sessions that "would have" happened would pollute the
 * statistics, so the next phase simply starts fresh at `now`.
 */
function completePhase(state: TimerState, config: TimerConfig, now: number): TimerTransition {
  const completion = record(state, config, now, true);
  const target = nextPhase(state, config, true);
  const entered = enterPhase(state, target, now, shouldAutoStart(target, config), true);
  return {
    state: entered.state,
    effects: completion ? [completion, ...entered.effects] : entered.effects,
  };
}

/** Apply one event. Always returns a new state; never mutates the input. */
export function transition(
  state: TimerState,
  event: TimerEvent,
  config: TimerConfig,
): TimerTransition {
  switch (event.type) {
    case 'START': {
      if (state.status === 'running') return { state, effects: [] };
      return {
        state: { ...state, status: 'running', startedAt: event.now },
        effects: [{ type: 'phaseStarted', phase: state.phase, at: event.now }],
      };
    }

    case 'PAUSE': {
      if (state.status !== 'running') return { state, effects: [] };
      return {
        state: {
          ...state,
          status: 'paused',
          startedAt: null,
          elapsedBeforeStart: elapsedSeconds(state, event.now),
        },
        effects: [],
      };
    }

    case 'RESUME': {
      if (state.status !== 'paused') return { state, effects: [] };
      return {
        state: { ...state, status: 'running', startedAt: event.now },
        effects: [{ type: 'phaseStarted', phase: state.phase, at: event.now }],
      };
    }

    case 'TOGGLE': {
      const mapped =
        state.status === 'running' ? 'PAUSE' : state.status === 'paused' ? 'RESUME' : 'START';
      return transition(state, { type: mapped, now: event.now }, config);
    }

    case 'TICK': {
      if (!isPhaseComplete(state, config, event.now)) return { state, effects: [] };
      return completePhase(state, config, event.now);
    }

    case 'SKIP': {
      // A skip banks whatever was done as an *aborted* phase, so the timeline
      // still shows the attempt without it counting as a pomodoro.
      const aborted = record(state, config, event.now, false);
      const target = nextPhase(state, config, false);
      const entered = enterPhase(state, target, event.now, shouldAutoStart(target, config), false);
      return {
        state: entered.state,
        effects: aborted ? [aborted, ...entered.effects] : entered.effects,
      };
    }

    case 'RESET': {
      // Back to the start of the *current* phase; cycle counters stay intact.
      const aborted = record(state, config, event.now, false);
      return {
        state: { ...state, status: 'idle', startedAt: null, elapsedBeforeStart: 0 },
        effects: aborted ? [aborted] : [],
      };
    }

    case 'CONFIGURE': {
      // Durations changed under our feet. If the running phase is already
      // over against the new config, close it out; otherwise carry on.
      if (isPhaseComplete(state, config, event.now)) return completePhase(state, config, event.now);
      return { state, effects: [] };
    }
  }
}

/** Convenience for hosts that only care about the resulting state. */
export function reduce(state: TimerState, event: TimerEvent, config: TimerConfig): TimerState {
  return transition(state, event, config).state;
}
