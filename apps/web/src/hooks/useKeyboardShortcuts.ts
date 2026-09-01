import { useEffect } from 'react';
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
 */
export function useKeyboardShortcuts({
  onToggleFullscreen,
  onOpenSettings,
}: ShortcutHandlers): void {
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
          onToggleFullscreen();
          break;
        case KEYBOARD_SHORTCUTS.settings:
          event.preventDefault();
          onOpenSettings();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onToggleFullscreen, onOpenSettings]);
}
