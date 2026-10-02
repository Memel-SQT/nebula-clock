import { useEffect } from 'react';
import { getSoundEngine } from '../lib/sound.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useTimerStore } from '../store/timerStore.js';

/**
 * Keeps the ambient soundscape in step with the settings and the phase, from the app root.
 *
 * It used to live in the mixer on the timer screen and in the automatic phase change: the mix
 * did not start until that screen was opened, a switch flipped in Settings did nothing, and a
 * manual skip left the ambience playing through a break (or silent through the next focus).
 */
export function useAmbientSync(): void {
  const ambient = useSettingsStore((state) => state.settings.ambient);
  const phase = useTimerStore((state) => state.machine.phase);

  useEffect(() => {
    const engine = getSoundEngine();
    engine.setMasterVolume(ambient.masterVolume);
    engine.setTrackVolumes(ambient.tracks);
    engine.setAmbientEnabled(ambient.enabled);
  }, [ambient.enabled, ambient.masterVolume, ambient.tracks]);

  // Ambient sound is a focus aid, so it steps aside during breaks when asked to.
  useEffect(() => {
    getSoundEngine().suspendAmbient(ambient.pauseOnBreak && phase !== 'focus');
  }, [ambient.pauseOnBreak, phase]);
}
