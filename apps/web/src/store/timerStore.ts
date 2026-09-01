/**
 * The timer, driven by the pure state machine in `@nebula-clock/core/timer`.
 *
 * This store owns no timing logic of its own: it forwards events to the
 * machine, persists the resulting state, and turns the machine's declared
 * effects into real side effects (a stored session, a notification, a chime).
 * Because the machine derives elapsed time from wall-clock timestamps, a
 * reload or a laptop sleep resumes exactly where it should.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  createId,
  createInitialState,
  createTimerConfig,
  elapsedSeconds,
  formatDuration,
  phaseDuration,
  progress as machineProgress,
  remainingSeconds,
  transition,
} from '@nebula-clock/core';
import type { Phase, Session, TimerEffect, TimerEvent, TimerState } from '@nebula-clock/core';
import { notify } from '@nebula-clock/core';
import { i18next } from '../lib/i18n.js';
import { getSoundEngine } from '../lib/sound.js';
import { useDataStore } from './dataStore.js';
import { useSettingsStore } from './settingsStore.js';

export const TIMER_STORAGE_KEY = 'nebula-clock-timer';

interface TimerStore {
  machine: TimerState;
  /** Clock value the UI renders against; advanced by the ticker. */
  now: number;
  activeTaskId: string | null;
  /** Announced in the live region on every phase change. */
  announcement: string;

  start: () => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  skip: () => void;
  reset: () => void;
  tick: (now?: number) => void;
  /** Re-evaluate the running phase after the durations changed. */
  configure: () => void;
  setActiveTask: (taskId: string | null) => void;
}

const config = () => createTimerConfig(useSettingsStore.getState().settings.timer);

/** Turn a machine effect into a stored session row. */
function toSession(effect: TimerEffect, taskId: string | null, tagIds: string[]): Session | null {
  if (effect.type !== 'phaseCompleted' && effect.type !== 'phaseAborted') return null;
  return {
    id: createId(),
    phase: effect.phase,
    startedAt: effect.startedAt,
    endedAt: effect.endedAt,
    durationSeconds: effect.durationSeconds,
    plannedSeconds: effect.plannedSeconds,
    completed: effect.type === 'phaseCompleted',
    // Only focus phases belong to a task; a break is not work on anything.
    taskId: effect.phase === 'focus' ? taskId : null,
    tagIds: effect.phase === 'focus' ? tagIds : [],
  };
}

/** Notification + chime announcing the phase the user is entering. */
function announcePhase(phase: Phase): string {
  const settings = useSettingsStore.getState().settings;
  const minutes = Math.round(phaseDuration(phase, createTimerConfig(settings.timer)) / 60);
  const title = i18next.t(`notifications:${phase}.title`);
  const body = i18next.t(`notifications:${phase}.body`, { minutes });

  if (settings.notifications.sound) {
    getSoundEngine().playNotification(
      settings.notifications.soundId,
      settings.notifications.customSound?.dataUrl ?? null,
    );
  }
  if (settings.notifications.system) {
    void notify({ title, body, tag: 'nebula-clock-phase' });
  }

  // Ambient sound is a focus aid, so it steps aside during breaks.
  if (settings.ambient.pauseOnBreak) {
    getSoundEngine().suspendAmbient(phase !== 'focus');
  }

  return `${title}. ${body}`;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => {
      /**
       * Apply one event, persist any sessions it produced, and announce a
       * phase change. Announcements only fire for *automatic* transitions:
       * a user who just pressed Skip does not need to be told what happened.
       */
      const dispatch = (event: TimerEvent): void => {
        const before = get().machine;
        const { state, effects } = transition(before, event, config());

        const { activeTaskId } = get();
        const tagIds =
          useDataStore.getState().tasks.find((task) => task.id === activeTaskId)?.tagIds ?? [];

        for (const effect of effects) {
          const session = toSession(effect, activeTaskId, tagIds);
          if (session && session.durationSeconds > 0) {
            void useDataStore.getState().recordSession(session);
          }
        }

        const phaseChanged = state.phase !== before.phase;
        const announcement =
          phaseChanged && event.type === 'TICK' ? announcePhase(state.phase) : get().announcement;

        set({ machine: state, now: event.now, announcement });
      };

      return {
        machine: createInitialState(),
        now: Date.now(),
        activeTaskId: null,
        announcement: '',

        start: () => dispatch({ type: 'START', now: Date.now() }),
        pause: () => dispatch({ type: 'PAUSE', now: Date.now() }),
        resume: () => dispatch({ type: 'RESUME', now: Date.now() }),
        toggle: () => dispatch({ type: 'TOGGLE', now: Date.now() }),
        skip: () => dispatch({ type: 'SKIP', now: Date.now() }),
        reset: () => dispatch({ type: 'RESET', now: Date.now() }),
        configure: () => dispatch({ type: 'CONFIGURE', now: Date.now() }),

        tick: (now = Date.now()) => {
          const state = get();
          // Nothing can elapse while idle or paused, so skip the work and,
          // more importantly, skip the re-render.
          if (state.machine.status !== 'running') return;
          dispatch({ type: 'TICK', now });
        },

        setActiveTask: (activeTaskId) => set({ activeTaskId }),
      };
    },
    {
      name: TIMER_STORAGE_KEY,
      version: 1,
      // `now` and `announcement` are derived; persisting them would resurrect
      // a stale clock on the next launch.
      partialize: (state) => ({ machine: state.machine, activeTaskId: state.activeTaskId }),
    },
  ),
);

/* ------------------------------------------------------------- selectors */

export interface TimerView {
  phase: Phase;
  status: TimerState['status'];
  remaining: number;
  display: string;
  progress: number;
  elapsed: number;
  total: number;
  completedInCycle: number;
  cycleTarget: number;
}

/**
 * Everything the timer UI needs, derived from the machine and the clock.
 *
 * This builds a fresh object on every call, so components must subscribe
 * through `useTimerView()` rather than passing it to `useTimerStore`
 * directly: Zustand compares selector results by reference, and a new object
 * each render is an infinite render loop.
 */
export function selectTimerView(state: TimerStore): TimerView {
  const timerConfig = config();
  const { machine, now } = state;
  return {
    phase: machine.phase,
    status: machine.status,
    remaining: remainingSeconds(machine, timerConfig, now),
    display: formatDuration(remainingSeconds(machine, timerConfig, now)),
    progress: machineProgress(machine, timerConfig, now),
    elapsed: elapsedSeconds(machine, now),
    total: phaseDuration(machine.phase, timerConfig),
    completedInCycle: machine.completedInCycle,
    cycleTarget: timerConfig.cyclesBeforeLongBreak,
  };
}

/**
 * Subscribe to the derived timer view.
 *
 * `useShallow` compares the returned fields one by one, so a re-render only
 * happens when a value the UI actually shows has changed.
 */
export function useTimerView(): TimerView {
  return useTimerStore(useShallow(selectTimerView));
}
