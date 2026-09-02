import { useEffect, useRef } from 'react';
import { KEYBOARD_SHORTCUTS } from '@nebula-clock/core';
import { useTimerStore } from '../store/timerStore.js';

export interface ShortcutHandlers {
  onToggleFullscreen: () => void;
  onOpenSettings: () => void;
}

/** True when the user is typing, in which case shortcuts must stay out of it. */
function isEditing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * In-window shortcuts. The desktop app additionally registers OS-level
 * accelerators, which work when the window is not focused at all.
 *
 * The listener is attached exactly once and reads its callbacks through a
 * ref. Re-subscribing on every render is not merely wasteful: if anything
 * else re-renders the app from inside a keydown listener, the DOM removes
 * this listener mid-dispatch and the keypress is silently swallowed - which
 * is what the launch screen used to do to the very first key pressed.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditing(event.target)) return;
      // Leave browser and OS chords alone.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const timer = useTimerStore.getState();
      const key = event.key === ' ' ? 'Space' : event.key;

      switch (key.toLowerCase()) {
        case KEYBOARD_SHORTCUTS.toggle.toLowerCase():
          event.preventDefault();
          timer.toggle();
          break;
        case KEYBOARD_SHORTCUTS.skip:
          event.preventDefault();
          timer.skip();
          break;
        case KEYBOARD_SHORTCUTS.reset:
          event.preventDefault();
          timer.reset();
          break;
        case KEYBOARD_SHORTCUTS.fullscreen:
          event.preventDefault();
          latest.current.onToggleFullscreen();
          break;
        case KEYBOARD_SHORTCUTS.settings:
          event.preventDefault();
          latest.current.onOpenSettings();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
