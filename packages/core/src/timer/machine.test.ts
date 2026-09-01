import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../config/index.js';
import {
  createInitialState,
  createTimerConfig,
  elapsedSeconds,
  isPhaseComplete,
  nextPhase,
  phaseDuration,
  progress,
  reduce,
  remainingSeconds,
  transition,
} from './machine.js';
import type { TimerConfig, TimerEffect, TimerState } from './types.js';

const T0 = 1_700_000_000_000;

const config = (overrides: Partial<TimerConfig> = {}): TimerConfig => ({
  focusSeconds: 1500,
  shortBreakSeconds: 300,
  longBreakSeconds: 900,
  cyclesBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  ...overrides,
});

const seconds = (n: number) => T0 + n * 1000;

/** Run a focus phase to completion and return the resulting transition. */
function runFocusToEnd(cfg: TimerConfig, from: TimerState = createInitialState()) {
  const started = reduce(from, { type: 'START', now: T0 }, cfg);
  return transition(started, { type: 'TICK', now: seconds(cfg.focusSeconds) }, cfg);
}

const effectTypes = (effects: TimerEffect[]) => effects.map((e) => e.type);

describe('createTimerConfig', () => {
  it('converts the user-facing minutes into seconds', () => {
    const cfg = createTimerConfig(DEFAULT_SETTINGS.timer);
    expect(cfg.focusSeconds).toBe(25 * 60);
    expect(cfg.shortBreakSeconds).toBe(5 * 60);
    expect(cfg.longBreakSeconds).toBe(15 * 60);
    expect(cfg.cyclesBeforeLongBreak).toBe(4);
  });
});

describe('initial state', () => {
  it('starts idle on a focus phase with empty counters', () => {
    const state = createInitialState();
    expect(state).toMatchObject({
      status: 'idle',
      phase: 'focus',
      startedAt: null,
      elapsedBeforeStart: 0,
      completedInCycle: 0,
      completedFocusSessions: 0,
    });
  });
});

describe('phaseDuration', () => {
  it('maps every phase to its configured length', () => {
    const cfg = config();
    expect(phaseDuration('focus', cfg)).toBe(1500);
    expect(phaseDuration('shortBreak', cfg)).toBe(300);
    expect(phaseDuration('longBreak', cfg)).toBe(900);
  });
});

describe('elapsed and remaining', () => {
  it('reports nothing elapsed while idle', () => {
    const state = createInitialState();
    expect(elapsedSeconds(state, seconds(120))).toBe(0);
    expect(remainingSeconds(state, config(), seconds(120))).toBe(1500);
  });

  it('derives elapsed time from the wall clock, not from tick count', () => {
    const cfg = config();
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    // No ticks at all in between - the value still has to be exact.
    expect(elapsedSeconds(running, seconds(300))).toBe(300);
    expect(remainingSeconds(running, cfg, seconds(300))).toBe(1200);
  });

  it('never reports a negative remaining time', () => {
    const cfg = config();
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    expect(remainingSeconds(running, cfg, seconds(9999))).toBe(0);
  });

  it('clamps a clock that jumps backwards', () => {
    const cfg = config();
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    expect(elapsedSeconds(running, T0 - 60_000)).toBe(0);
  });

  it('reports progress as a 0..1 ratio', () => {
    const cfg = config();
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    expect(progress(running, cfg, seconds(750))).toBeCloseTo(0.5);
    expect(progress(running, cfg, seconds(3000))).toBe(1);
  });

  it('treats a zero-length phase as already complete', () => {
    const cfg = config({ focusSeconds: 0 });
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    expect(progress(running, cfg, T0)).toBe(1);
  });
});

describe('start / pause / resume', () => {
  it('emits phaseStarted on START and marks the state running', () => {
    const cfg = config();
    const { state, effects } = transition(createInitialState(), { type: 'START', now: T0 }, cfg);
    expect(state.status).toBe('running');
    expect(state.startedAt).toBe(T0);
    expect(effects).toEqual([{ type: 'phaseStarted', phase: 'focus', at: T0 }]);
  });

  it('ignores START while already running', () => {
    const cfg = config();
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    const again = transition(running, { type: 'START', now: seconds(10) }, cfg);
    expect(again.state).toBe(running);
    expect(again.effects).toEqual([]);
  });

  it('banks elapsed time on PAUSE and keeps it across RESUME', () => {
    const cfg = config();
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    const paused = reduce(running, { type: 'PAUSE', now: seconds(600) }, cfg);
    expect(paused.status).toBe('paused');
    expect(paused.elapsedBeforeStart).toBe(600);
    expect(paused.startedAt).toBeNull();

    // Idle for an hour while paused - the banked time must not grow.
    expect(elapsedSeconds(paused, seconds(4200))).toBe(600);

    const resumed = reduce(paused, { type: 'RESUME', now: seconds(4200) }, cfg);
    expect(resumed.status).toBe('running');
    expect(elapsedSeconds(resumed, seconds(4260))).toBe(660);
  });

  it('ignores PAUSE when not running and RESUME when not paused', () => {
    const cfg = config();
    const idle = createInitialState();
    expect(transition(idle, { type: 'PAUSE', now: T0 }, cfg).state).toBe(idle);
    expect(transition(idle, { type: 'RESUME', now: T0 }, cfg).state).toBe(idle);
  });

  it('TOGGLE cycles idle -> running -> paused -> running', () => {
    const cfg = config();
    const running = reduce(createInitialState(), { type: 'TOGGLE', now: T0 }, cfg);
    expect(running.status).toBe('running');
    const paused = reduce(running, { type: 'TOGGLE', now: seconds(30) }, cfg);
    expect(paused.status).toBe('paused');
    const resumed = reduce(paused, { type: 'TOGGLE', now: seconds(60) }, cfg);
    expect(resumed.status).toBe('running');
  });
});

describe('phase completion', () => {
  it('does nothing on a TICK before the deadline', () => {
    const cfg = config();
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    const result = transition(running, { type: 'TICK', now: seconds(1499) }, cfg);
    expect(result.state).toBe(running);
    expect(result.effects).toEqual([]);
  });

  it('does not complete a phase that is merely idle', () => {
    const cfg = config();
    expect(isPhaseComplete(createInitialState(), cfg, seconds(99_999))).toBe(false);
  });

  it('completes focus, counts the pomodoro and moves to the short break', () => {
    const cfg = config();
    const { state, effects } = runFocusToEnd(cfg);
    expect(state.phase).toBe('shortBreak');
    expect(state.status).toBe('idle');
    expect(state.completedFocusSessions).toBe(1);
    expect(state.completedInCycle).toBe(1);
    expect(effectTypes(effects)).toEqual(['phaseCompleted']);

    const [completed] = effects;
    expect(completed).toMatchObject({
      type: 'phaseCompleted',
      phase: 'focus',
      startedAt: T0,
      endedAt: seconds(1500),
      durationSeconds: 1500,
      plannedSeconds: 1500,
    });
  });

  it('dates the completion on the deadline even when the tick arrives late', () => {
    const cfg = config();
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    // The tab was throttled: the tick lands two minutes past the deadline.
    const { effects } = transition(running, { type: 'TICK', now: seconds(1620) }, cfg);
    expect(effects[0]).toMatchObject({
      startedAt: T0,
      endedAt: seconds(1500),
      durationSeconds: 1500,
    });
  });

  it('advances only one phase per tick, however long the machine slept', () => {
    const cfg = config({ autoStartBreaks: true, autoStartFocus: true });
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    // Slept for six hours: fabricating the intervening sessions would be a lie.
    const { state, effects } = transition(running, { type: 'TICK', now: seconds(21_600) }, cfg);
    expect(state.phase).toBe('shortBreak');
    expect(state.completedFocusSessions).toBe(1);
    expect(effects.filter((e) => e.type === 'phaseCompleted')).toHaveLength(1);
    // The new phase restarts from the wake-up moment, not from the deadline.
    expect(state.startedAt).toBe(seconds(21_600));
  });

  it('auto-starts the break when configured, emitting phaseStarted', () => {
    const cfg = config({ autoStartBreaks: true });
    const { state, effects } = runFocusToEnd(cfg);
    expect(state.status).toBe('running');
    expect(effectTypes(effects)).toEqual(['phaseCompleted', 'phaseStarted']);
  });

  it('does not auto-start focus after a break unless asked', () => {
    const cfg = config({ autoStartBreaks: true, autoStartFocus: false });
    const afterFocus = runFocusToEnd(cfg).state;
    const afterBreak = transition(afterFocus, { type: 'TICK', now: seconds(1500 + 300) }, cfg);
    expect(afterBreak.state.phase).toBe('focus');
    expect(afterBreak.state.status).toBe('idle');
  });

  it('reaches the long break after the configured number of cycles', () => {
    const cfg = config({ cyclesBeforeLongBreak: 4, autoStartBreaks: true, autoStartFocus: true });
    let state = createInitialState();
    let now = T0;
    const phases: string[] = [];

    state = reduce(state, { type: 'START', now }, cfg);
    for (let i = 0; i < 8; i += 1) {
      now += phaseDuration(state.phase, cfg) * 1000;
      state = reduce(state, { type: 'TICK', now }, cfg);
      phases.push(state.phase);
    }

    expect(phases).toEqual([
      'shortBreak',
      'focus',
      'shortBreak',
      'focus',
      'shortBreak',
      'focus',
      'longBreak',
      'focus',
    ]);
    expect(state.completedFocusSessions).toBe(4);
  });

  it('emits cycleCompleted and resets the cycle counter on the long break', () => {
    const cfg = config({ cyclesBeforeLongBreak: 1 });
    const { state, effects } = runFocusToEnd(cfg);
    expect(state.phase).toBe('longBreak');
    expect(state.completedInCycle).toBe(0);
    expect(effectTypes(effects)).toContain('cycleCompleted');
  });
});

describe('nextPhase', () => {
  it('always returns to focus after a break', () => {
    const cfg = config();
    const onBreak: TimerState = { ...createInitialState(), phase: 'shortBreak' };
    expect(nextPhase(onBreak, cfg, true)).toBe('focus');
    expect(nextPhase(onBreak, cfg, false)).toBe('focus');
  });
});

describe('skip', () => {
  it('records the abandoned phase and moves on without earning a pomodoro', () => {
    const cfg = config();
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    const { state, effects } = transition(running, { type: 'SKIP', now: seconds(400) }, cfg);

    expect(state.phase).toBe('shortBreak');
    expect(state.completedFocusSessions).toBe(0);
    expect(state.completedInCycle).toBe(0);
    expect(effects[0]).toMatchObject({
      type: 'phaseAborted',
      phase: 'focus',
      startedAt: T0,
      endedAt: seconds(400),
      durationSeconds: 400,
      plannedSeconds: 1500,
    });
  });

  it('never reaches a long break by skipping focus over and over', () => {
    const cfg = config({ cyclesBeforeLongBreak: 2 });
    let state = createInitialState();
    let now = T0;
    for (let i = 0; i < 6; i += 1) {
      now += 10_000;
      state = reduce(state, { type: 'SKIP', now }, cfg);
      expect(state.phase).not.toBe('longBreak');
    }
    expect(state.completedFocusSessions).toBe(0);
  });

  it('records nothing when skipping a phase that never really started', () => {
    const cfg = config();
    const { state, effects } = transition(createInitialState(), { type: 'SKIP', now: T0 }, cfg);
    expect(effects).toEqual([]);
    expect(state.phase).toBe('shortBreak');
  });
});

describe('reset', () => {
  it('returns to the start of the current phase and keeps the cycle counters', () => {
    const cfg = config();
    const afterOne = runFocusToEnd(cfg).state;
    const running = reduce(afterOne, { type: 'START', now: seconds(2000) }, cfg);
    const { state, effects } = transition(running, { type: 'RESET', now: seconds(2100) }, cfg);

    expect(state.status).toBe('idle');
    expect(state.phase).toBe('shortBreak');
    expect(state.elapsedBeforeStart).toBe(0);
    expect(state.completedFocusSessions).toBe(1);
    expect(effects[0]).toMatchObject({ type: 'phaseAborted', durationSeconds: 100 });
  });

  it('emits nothing when resetting an untouched phase', () => {
    const cfg = config();
    const { effects } = transition(createInitialState(), { type: 'RESET', now: T0 }, cfg);
    expect(effects).toEqual([]);
  });
});

describe('CONFIGURE', () => {
  it('is a no-op while the running phase still has time left', () => {
    const cfg = config();
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, cfg);
    const result = transition(running, { type: 'CONFIGURE', now: seconds(60) }, cfg);
    expect(result.state).toBe(running);
    expect(result.effects).toEqual([]);
  });

  it('closes out a phase that the new, shorter duration already overran', () => {
    const running = reduce(createInitialState(), { type: 'START', now: T0 }, config());
    // The user drops focus from 25 to 5 minutes after 10 minutes of work.
    const shorter = config({ focusSeconds: 300 });
    const { state, effects } = transition(
      running,
      { type: 'CONFIGURE', now: seconds(600) },
      shorter,
    );
    expect(state.phase).toBe('shortBreak');
    expect(effectTypes(effects)).toContain('phaseCompleted');
  });
});

describe('immutability', () => {
  it('never mutates the state it is given', () => {
    const cfg = config();
    const state = createInitialState();
    const snapshot = structuredClone(state);
    transition(state, { type: 'START', now: T0 }, cfg);
    transition(state, { type: 'SKIP', now: T0 }, cfg);
    transition(state, { type: 'RESET', now: T0 }, cfg);
    expect(state).toEqual(snapshot);
  });
});
