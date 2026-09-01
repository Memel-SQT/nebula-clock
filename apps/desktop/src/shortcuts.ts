/**
 * OS-level accelerators, which keep working while the app is in the
 * background — the whole point of the desktop build.
 */
import { globalShortcut } from 'electron';
import { GLOBAL_SHORTCUTS } from '@nebula-clock/core/config';
import type { DesktopCommand } from './ipc.js';

const BINDINGS: { accelerator: string; command: DesktopCommand }[] = [
  { accelerator: GLOBAL_SHORTCUTS.toggle, command: 'toggle' },
  { accelerator: GLOBAL_SHORTCUTS.skip, command: 'skip' },
  { accelerator: GLOBAL_SHORTCUTS.reset, command: 'reset' },
  { accelerator: GLOBAL_SHORTCUTS.miniMode, command: 'mini-mode' },
];

let registered = false;

/**
 * Register or tear down every accelerator.
 *
 * A shortcut already claimed by another app cannot be taken, and Electron
 * reports that by returning false rather than throwing; the failure is logged
 * and the remaining bindings still register.
 */
export function applyGlobalShortcuts(
  enabled: boolean,
  onCommand: (command: DesktopCommand) => void,
): boolean {
  if (!enabled) {
    globalShortcut.unregisterAll();
    registered = false;
    return true;
  }

  if (registered) return true;

  let allOk = true;
  for (const { accelerator, command } of BINDINGS) {
    const ok = globalShortcut.register(accelerator, () => onCommand(command));
    if (!ok) {
      allOk = false;
      console.warn(`[shortcuts] "${accelerator}" is already taken by another application`);
    }
  }
  registered = true;
  return allOk;
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
  registered = false;
}
