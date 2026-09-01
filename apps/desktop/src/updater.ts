/**
 * Auto-updates from GitHub Releases, via electron-updater.
 *
 * The release workflow publishes `latest.yml` alongside the installers, which
 * is what the updater polls. Downloads are automatic; installing is not — the
 * renderer shows a banner and the user chooses when to restart.
 */
import { app } from 'electron';
// Type-only: the module itself is loaded lazily in getUpdater() below, so
// importing the type here costs nothing at runtime.
import type { AppUpdater } from 'electron-updater';
import type { UpdateEvent } from './ipc.js';

/** How long after launch to run the first check, letting startup settle. */
const FIRST_CHECK_DELAY_MS = 10_000;
/** And every four hours after that. */
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

type Emit = (event: UpdateEvent) => void;

let timer: NodeJS.Timeout | null = null;
let initialised = false;

/**
 * Lazily loaded: pulling it in during development is pointless noise.
 *
 * electron-updater is CommonJS, so once this file is bundled to CJS the named
 * export can land either on the namespace or under `default` depending on the
 * interop helper. Both shapes are handled rather than assuming one.
 */
async function getUpdater(): Promise<AppUpdater | null> {
  const mod: unknown = await import('electron-updater');
  const candidate = mod as {
    autoUpdater?: AppUpdater;
    default?: { autoUpdater?: AppUpdater };
  };
  return candidate.autoUpdater ?? candidate.default?.autoUpdater ?? null;
}

export async function initUpdater(emit: Emit): Promise<void> {
  // An unpackaged app has no update feed and electron-updater warns loudly.
  if (!app.isPackaged || initialised) return;
  initialised = true;

  const autoUpdater = await getUpdater();
  if (!autoUpdater) {
    emit({ type: 'error', message: 'updater-unavailable' });
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => emit({ type: 'checking' }));
  autoUpdater.on('update-available', (info) => emit({ type: 'available', version: info.version }));
  autoUpdater.on('update-not-available', () => emit({ type: 'not-available' }));
  autoUpdater.on('download-progress', (progress) =>
    emit({ type: 'progress', percent: progress.percent }),
  );
  autoUpdater.on('update-downloaded', (info) =>
    emit({ type: 'downloaded', version: info.version }),
  );
  autoUpdater.on('error', (error: Error) => emit({ type: 'error', message: error.message }));

  setTimeout(() => void checkForUpdates(emit), FIRST_CHECK_DELAY_MS);
  timer = setInterval(() => void checkForUpdates(emit), CHECK_INTERVAL_MS);
}

export async function checkForUpdates(emit: Emit): Promise<void> {
  if (!app.isPackaged) {
    // Give the Settings screen an honest answer in development.
    emit({ type: 'not-available' });
    return;
  }
  try {
    const autoUpdater = await getUpdater();
    if (!autoUpdater) {
      emit({ type: 'error', message: 'updater-unavailable' });
      return;
    }
    await autoUpdater.checkForUpdates();
  } catch (error) {
    emit({ type: 'error', message: error instanceof Error ? error.message : 'update-failed' });
  }
}

export async function quitAndInstall(): Promise<void> {
  if (!app.isPackaged) return;
  const autoUpdater = await getUpdater();
  autoUpdater?.quitAndInstall();
}

export function disposeUpdater(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
