/**
 * The app's single SoundEngine instance.
 *
 * Created lazily so that merely importing this module never constructs an
 * AudioContext (browsers warn about that before a user gesture).
 */
import { SoundEngine } from '@nebula-clock/core';

let engine: SoundEngine | null = null;

/** `import.meta.env.BASE_URL` keeps the paths right under GitHub Pages. */
const asset = (folder: string) => (file: string) =>
  `${import.meta.env.BASE_URL}sounds/${folder}/${file}`;

export function getSoundEngine(): SoundEngine {
  engine ??= new SoundEngine({
    resolveNotification: asset('notifications'),
    resolveAmbient: asset('ambient'),
  });
  return engine;
}

export function disposeSoundEngine(): void {
  engine?.dispose();
  engine = null;
}
