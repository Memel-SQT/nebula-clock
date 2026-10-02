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
 * Space and Enter belong to a focused control: taking Space for the timer used to swallow the
 * keyboard activation of every button, switch and radio in the app.
 */
function isActivatable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest(
      'button, a[href], [role="button"], [role="switch"], [role="radio"], [role="gridcell"], [role="tab"], [role="option"]',
    ) !== null
  );
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
      // Leave browser and OS chords alone, and a held key toggling the timer on and off.
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      // A dialog (or the immersive mode, which keeps its own keys) owns the keyboard.
      if (document.querySelector('[aria-modal="true"]:not(.fullscreen-timer)')) return;

      const timer = useTimerStore.getState();
      const key = event.key === ' ' ? 'Space' : event.key;
      if (key === 'Space' && isActivatable(event.target)) return;

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
