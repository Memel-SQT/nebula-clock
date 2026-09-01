import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, createInitialState } from '@nebula-clock/core';
import type { Session } from '@nebula-clock/core';

// Howler needs a real AudioContext, and the notification adapter would try to
// reach the OS; neither is interesting here.
vi.mock('howler', () => ({
  Howl: class {
    play = vi.fn();
    pause = vi.fn();
    unload = vi.fn();
    volume = vi.fn();
    playing = () => false;
  },
  Howler: { ctx: { state: 'running', resume: vi.fn() } },
}));

const recorded: Session[] = [];
vi.mock('./dataStore.js', () => ({
  useDataStore: {
    getState: () => ({
      tasks: [{ id: 'task-1', tagIds: ['tag-1'] }],
      recordSession: (session: Session) => {
        recorded.push(session);
        return Promise.resolve();
      },
    }),
  },
  allPresets: () => [],
}));

const { useTimerStore, selectTimerView } = await import('./timerStore.js');
const { useSettingsStore } = await import('./settingsStore.js');

const T0 = 1_700_000_000_000;

beforeEach(() => {
  recorded.length = 0;
  useSettingsStore.setState({ settings: structuredClone(DEFAULT_SETTINGS) });
  useTimerStore.setState({
    machine: createInitialState(),
    now: T0,
    activeTaskId: null,
    announcement: '',
  });
  vi.useRealTimers();
});

describe('timer store', () => {
  it('starts, pauses and resumes through the machine', () => {
    vi.useFakeTimers({ now: T0 });
    const store = useTimerStore.getState();

    store.start();
    expect(useTimerStore.getState().machine.status).toBe('running');

    vi.setSystemTime(T0 + 60_000);
    useTimerStore.getState().pause();
    const paused = useTimerStore.getState().machine;
    expect(paused.status).toBe('paused');
    expect(paused.elapsedBeforeStart).toBeCloseTo(60, 0);

    // Time passing while paused must not be counted.
    vi.setSystemTime(T0 + 600_000);
    useTimerStore.getState().resume();
    expect(useTimerStore.getState().machine.elapsedBeforeStart).toBeCloseTo(60, 0);
  });

  it('derives the view from the machine and the clock', () => {
    vi.useFakeTimers({ now: T0 });
    useTimerStore.getState().start();
    vi.setSystemTime(T0 + 300_000);
    useTimerStore.getState().tick();

    const view = selectTimerView(useTimerStore.getState());
    expect(view.phase).toBe('focus');
    expect(view.display).toBe('20:00');
    expect(view.progress).toBeCloseTo(0.2, 2);
    expect(view.cycleTarget).toBe(4);
  });

  it('does nothing on a tick while idle', () => {
    const before = useTimerStore.getState().machine;
    useTimerStore.getState().tick(T0 + 999_999);
    expect(useTimerStore.getState().machine).toBe(before);
  });

  it('records a completed focus session against the active task', () => {
    vi.useFakeTimers({ now: T0 });
    useTimerStore.getState().setActiveTask('task-1');
    useTimerStore.getState().start();

    vi.setSystemTime(T0 + 25 * 60_000);
    useTimerStore.getState().tick();

    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      phase: 'focus',
      completed: true,
      durationSeconds: 1500,
      taskId: 'task-1',
      tagIds: ['tag-1'],
    });
    expect(useTimerStore.getState().machine.phase).toBe('shortBreak');
  });

  it('does not attach a task to a break session', () => {
    vi.useFakeTimers({ now: T0 });
    useTimerStore.getState().setActiveTask('task-1');
    useTimerStore.getState().start();

    vi.setSystemTime(T0 + 25 * 60_000);
    useTimerStore.getState().tick();
    // autoStartBreaks defaults to true, so the break is already running.
    vi.setSystemTime(T0 + 30 * 60_000);
    useTimerStore.getState().tick();

    const breakSession = recorded.find((session) => session.phase === 'shortBreak');
    expect(breakSession?.taskId).toBeNull();
    expect(breakSession?.tagIds).toEqual([]);
  });

  it('records a skipped phase as not completed', () => {
    vi.useFakeTimers({ now: T0 });
    useTimerStore.getState().start();
    vi.setSystemTime(T0 + 120_000);
    useTimerStore.getState().skip();

    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ completed: false, durationSeconds: 120 });
  });

  it('announces an automatic transition but stays quiet on a manual skip', () => {
    vi.useFakeTimers({ now: T0 });
    useTimerStore.getState().start();
    vi.setSystemTime(T0 + 120_000);
    useTimerStore.getState().skip();
    expect(useTimerStore.getState().announcement).toBe('');

    useTimerStore.getState().start();
    vi.setSystemTime(T0 + 500_000);
    useTimerStore.getState().tick();
    expect(useTimerStore.getState().announcement).not.toBe('');
  });

  it('closes out a phase the shortened duration already overran', () => {
    vi.useFakeTimers({ now: T0 });
    useTimerStore.getState().start();
    vi.setSystemTime(T0 + 10 * 60_000);

    useSettingsStore.getState().updateTimer({ focusMinutes: 5 });
    useTimerStore.getState().configure();

    expect(useTimerStore.getState().machine.phase).toBe('shortBreak');
  });
});
