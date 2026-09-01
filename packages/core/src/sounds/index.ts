/**
 * Audio for the app, on top of Howler.
 *
 * Two independent buses, as the brief requires:
 *  - the *notification* bus plays a one-shot chime on phase transitions;
 *  - the *ambient* bus loops focus soundscapes, each with its own volume,
 *    under a shared master gain.
 * Changing one never touches the other.
 */
import { Howl, Howler } from 'howler';
import type { AmbientTrackId } from '../types.js';
import { AMBIENT_TRACKS, NOTIFICATION_SOUNDS } from '../config/index.js';
import { clamp } from '../utils/index.js';

/** Maps a bare filename from the config to a loadable URL. */
export type AssetResolver = (file: string) => string;

export interface SoundEngineOptions {
  resolveNotification: AssetResolver;
  resolveAmbient: AssetResolver;
}

export class SoundEngine {
  private readonly options: SoundEngineOptions;
  private readonly notificationCache = new Map<string, Howl>();
  private readonly ambientHowls = new Map<AmbientTrackId, Howl>();
  private ambientVolumes: Record<AmbientTrackId, number> = {
    rain: 0,
    forest: 0,
    cafe: 0,
    whiteNoise: 0,
  };
  private masterVolume = 0.5;
  private notificationVolume = 0.7;
  private ambientEnabled = false;
  /** Set while a break is running and `pauseOnBreak` is on. */
  private ambientSuspended = false;

  constructor(options: SoundEngineOptions) {
    this.options = options;
  }

  /* ---------------------------------------------------------- notification */

  setNotificationVolume(volume: number): void {
    this.notificationVolume = clamp(volume, 0, 1);
  }

  /**
   * Play the transition chime. `customDataUrl` wins over `soundId` so an
   * imported sound is used without touching the built-in catalogue.
   */
  playNotification(soundId: string, customDataUrl?: string | null): void {
    const source = customDataUrl ?? this.resolveNotificationUrl(soundId);
    if (!source) return;
    let howl = this.notificationCache.get(source);
    if (!howl) {
      howl = new Howl({
        src: [source],
        // A data URL carries no extension for Howler to sniff.
        format: customDataUrl ? ['wav', 'mp3', 'ogg'] : undefined,
        preload: true,
        html5: false,
      });
      this.notificationCache.set(source, howl);
    }
    howl.volume(this.notificationVolume);
    howl.play();
  }

  private resolveNotificationUrl(soundId: string): string | null {
    const entry = NOTIFICATION_SOUNDS.find((s) => s.id === soundId) ?? NOTIFICATION_SOUNDS[0];
    return entry ? this.options.resolveNotification(entry.file) : null;
  }

  /* --------------------------------------------------------------- ambient */

  setAmbientEnabled(enabled: boolean): void {
    this.ambientEnabled = enabled;
    this.applyAmbient();
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = clamp(volume, 0, 1);
    this.applyAmbient();
  }

  setTrackVolume(track: AmbientTrackId, volume: number): void {
    this.ambientVolumes[track] = clamp(volume, 0, 1);
    this.applyAmbient();
  }

  setTrackVolumes(volumes: Record<AmbientTrackId, number>): void {
    this.ambientVolumes = { ...volumes };
    this.applyAmbient();
  }

  /** Silence the ambient bus without forgetting the user's mix. */
  suspendAmbient(suspended: boolean): void {
    this.ambientSuspended = suspended;
    this.applyAmbient();
  }

  private ambientHowl(track: AmbientTrackId): Howl | null {
    const cached = this.ambientHowls.get(track);
    if (cached) return cached;
    const entry = AMBIENT_TRACKS.find((t) => t.id === track);
    if (!entry) return null;
    const howl = new Howl({
      src: [this.options.resolveAmbient(entry.file)],
      loop: true,
      volume: 0,
      // Long loops stream instead of being decoded whole into memory.
      html5: true,
      preload: false,
    });
    this.ambientHowls.set(track, howl);
    return howl;
  }

  /** Reconcile every ambient track with the current settings. */
  private applyAmbient(): void {
    const active = this.ambientEnabled && !this.ambientSuspended;
    for (const { id } of AMBIENT_TRACKS) {
      const wanted = active ? this.ambientVolumes[id] * this.masterVolume : 0;
      // Only instantiate a Howl for tracks the user has actually turned up.
      if (wanted <= 0 && !this.ambientHowls.has(id)) continue;
      const howl = this.ambientHowl(id);
      if (!howl) continue;
      howl.volume(wanted);
      if (wanted > 0 && !howl.playing()) {
        howl.play();
      } else if (wanted <= 0 && howl.playing()) {
        howl.pause();
      }
    }
  }

  /** Browsers block audio until a gesture; call this from a click handler. */
  unlock(): void {
    const ctx = Howler.ctx as AudioContext | undefined;
    if (ctx?.state === 'suspended') void ctx.resume();
  }

  /** Release every decoded buffer. Call on unmount. */
  dispose(): void {
    for (const howl of this.ambientHowls.values()) howl.unload();
    for (const howl of this.notificationCache.values()) howl.unload();
    this.ambientHowls.clear();
    this.notificationCache.clear();
  }
}
