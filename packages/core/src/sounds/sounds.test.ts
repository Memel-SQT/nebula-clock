import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Howler needs a real AudioContext, so it is replaced by a recording stub.
 * What matters here is the mixer logic: two independent buses, per-track
 * volumes multiplied by the master gain, and lazy instantiation.
 */
interface FakeHowl {
  src: string[];
  loop: boolean;
  volumeCalls: number[];
  playing: () => boolean;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  unload: ReturnType<typeof vi.fn>;
  volume: (value?: number) => number;
}

const created: FakeHowl[] = [];
const ctx = { state: 'suspended', resume: vi.fn() };

vi.mock('howler', () => {
  class Howl {
    src: string[];
    loop: boolean;
    volumeCalls: number[] = [];
    private isPlaying = false;
    private current = 0;
    play = vi.fn(() => {
      this.isPlaying = true;
    });
    pause = vi.fn(() => {
      this.isPlaying = false;
    });
    unload = vi.fn(() => {
      this.isPlaying = false;
    });

    constructor(options: { src: string[]; loop?: boolean }) {
      this.src = options.src;
      this.loop = options.loop ?? false;
      created.push(this);
    }

    playing(): boolean {
      return this.isPlaying;
    }

    volume(value?: number): number {
      if (value !== undefined) {
        this.current = value;
        this.volumeCalls.push(value);
      }
      return this.current;
    }
  }
  return { Howl, Howler: { ctx } };
});

const { SoundEngine, dataUrlFormat } = await import('./index.js');

function engine() {
  return new SoundEngine({
    resolveNotification: (file) => `/sounds/notifications/${file}`,
    resolveAmbient: (file) => `/sounds/ambient/${file}`,
  });
}

beforeEach(() => {
  created.length = 0;
  ctx.state = 'suspended';
  ctx.resume.mockClear();
});

describe('notification bus', () => {
  it('resolves the configured sound id to a URL and plays it', () => {
    const sound = engine();
    sound.playNotification('bell');
    expect(created[0]?.src).toEqual(['/sounds/notifications/bell.wav']);
    expect(created[0]?.play).toHaveBeenCalled();
  });

  it('falls back to the first catalogue entry for an unknown id', () => {
    const sound = engine();
    sound.playNotification('does-not-exist');
    expect(created[0]?.src[0]).toContain('chime.wav');
  });

  it('prefers an imported custom sound over the catalogue', () => {
    const sound = engine();
    sound.playNotification('bell', 'data:audio/wav;base64,AAAA');
    expect(created[0]?.src).toEqual(['data:audio/wav;base64,AAAA']);
  });

  it('reuses the decoded buffer instead of reloading it', () => {
    const sound = engine();
    sound.playNotification('bell');
    sound.playNotification('bell');
    expect(created).toHaveLength(1);
    expect(created[0]?.play).toHaveBeenCalledTimes(2);
  });

  it('applies the notification volume, independent of the ambient master', () => {
    const sound = engine();
    sound.setNotificationVolume(0.3);
    sound.setMasterVolume(1);
    sound.playNotification('chime');
    expect(created[0]?.volume()).toBe(0.3);
  });

  it('clamps the volume into 0..1', () => {
    const sound = engine();
    sound.setNotificationVolume(9);
    sound.playNotification('chime');
    expect(created[0]?.volume()).toBe(1);
  });
});

describe('ambient bus', () => {
  it('creates nothing until a track is turned up', () => {
    const sound = engine();
    sound.setAmbientEnabled(true);
    expect(created).toHaveLength(0);
  });

  it('starts a looping track at track volume times master', () => {
    const sound = engine();
    sound.setAmbientEnabled(true);
    sound.setMasterVolume(0.5);
    sound.setTrackVolume('rain', 0.8);

    expect(created).toHaveLength(1);
    expect(created[0]?.src).toEqual(['/sounds/ambient/rain.wav']);
    expect(created[0]?.loop).toBe(true);
    expect(created[0]?.volume()).toBeCloseTo(0.4);
    expect(created[0]?.play).toHaveBeenCalled();
  });

  it('mixes several tracks at their own volumes', () => {
    const sound = engine();
    sound.setAmbientEnabled(true);
    sound.setMasterVolume(1);
    sound.setTrackVolumes({ rain: 1, forest: 0.5, cafe: 0, whiteNoise: 0 });

    expect(created).toHaveLength(2);
    expect(created[0]?.volume()).toBe(1);
    expect(created[1]?.volume()).toBe(0.5);
  });

  it('pauses a track turned back down to zero', () => {
    const sound = engine();
    sound.setAmbientEnabled(true);
    sound.setMasterVolume(1);
    sound.setTrackVolume('rain', 0.8);
    sound.setTrackVolume('rain', 0);

    expect(created[0]?.pause).toHaveBeenCalled();
    expect(created[0]?.volume()).toBe(0);
  });

  it('silences everything when the bus is disabled, keeping the mix', () => {
    const sound = engine();
    sound.setAmbientEnabled(true);
    sound.setMasterVolume(1);
    sound.setTrackVolume('rain', 0.8);
    sound.setAmbientEnabled(false);
    expect(created[0]?.volume()).toBe(0);

    sound.setAmbientEnabled(true);
    expect(created[0]?.volume()).toBeCloseTo(0.8);
  });

  it('suspends and restores the bus around a break', () => {
    const sound = engine();
    sound.setAmbientEnabled(true);
    sound.setMasterVolume(1);
    sound.setTrackVolume('cafe', 0.6);

    sound.suspendAmbient(true);
    expect(created[0]?.volume()).toBe(0);
    expect(created[0]?.pause).toHaveBeenCalled();

    sound.suspendAmbient(false);
    expect(created[0]?.volume()).toBeCloseTo(0.6);
  });

  it('changing the master gain does not touch the notification volume', () => {
    const sound = engine();
    sound.setNotificationVolume(0.9);
    sound.setAmbientEnabled(true);
    sound.setMasterVolume(0.1);
    sound.setTrackVolume('rain', 1);
    sound.playNotification('chime');

    const chime = created.find((h) => h.src[0]?.includes('chime'));
    expect(chime?.volume()).toBe(0.9);
  });
});

describe('lifecycle', () => {
  it('resumes a suspended AudioContext on unlock', () => {
    const sound = engine();
    sound.unlock();
    expect(ctx.resume).toHaveBeenCalled();
  });

  it('leaves a running AudioContext alone', () => {
    ctx.state = 'running';
    engine().unlock();
    expect(ctx.resume).not.toHaveBeenCalled();
  });

  it('unloads every Howl on dispose', () => {
    const sound = engine();
    sound.setAmbientEnabled(true);
    sound.setMasterVolume(1);
    sound.setTrackVolume('rain', 1);
    sound.playNotification('chime');

    sound.dispose();
    expect(created).toHaveLength(2);
    for (const howl of created) expect(howl.unload).toHaveBeenCalled();
  });
});

describe('dataUrlFormat', () => {
  it('reads the extension off the data URL MIME type', () => {
    expect(dataUrlFormat('data:audio/wav;base64,AAAA')).toBe('wav');
    expect(dataUrlFormat('data:audio/x-wav;base64,AAAA')).toBe('wav');
    expect(dataUrlFormat('data:audio/mpeg;base64,AAAA')).toBe('mp3');
    expect(dataUrlFormat('data:audio/ogg;base64,AAAA')).toBe('ogg');
    expect(dataUrlFormat('data:audio/x-m4a;base64,AAAA')).toBe('m4a');
    expect(dataUrlFormat('data:audio/flac;base64,AAAA')).toBe('flac');
  });

  it('is case-insensitive and tolerates a missing charset', () => {
    expect(dataUrlFormat('data:AUDIO/MPEG,AAAA')).toBe('mp3');
  });

  it('falls back to mp3 for anything it does not recognise', () => {
    expect(dataUrlFormat('data:audio/weird;base64,AAAA')).toBe('mp3');
    expect(dataUrlFormat('not-a-data-url')).toBe('mp3');
    expect(dataUrlFormat('')).toBe('mp3');
  });
});

describe('custom notification sounds', () => {
  it('tells Howler the real format of an imported file', () => {
    const sound = engine();
    sound.playNotification('chime', 'data:audio/mpeg;base64,AAAA');
    expect(created[0]?.src).toEqual(['data:audio/mpeg;base64,AAAA']);
  });
});
