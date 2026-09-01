import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudRain, Coffee, Trees, Waves } from 'lucide-react';
import { AMBIENT_TRACKS } from '@nebula-clock/core';
import type { AmbientTrackId } from '@nebula-clock/core';
import { Card, Slider, Toggle } from '@nebula-clock/ui';
import { getSoundEngine } from '../lib/sound.js';
import { useSettingsStore } from '../store/settingsStore.js';

const ICONS: Record<AmbientTrackId, typeof CloudRain> = {
  rain: CloudRain,
  forest: Trees,
  cafe: Coffee,
  whiteNoise: Waves,
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

/**
 * Per-track volumes under a shared master gain, entirely separate from the
 * notification volume - turning the rain up never makes the chime louder.
 */
export function AmbientMixer() {
  const { t } = useTranslation(['timer', 'settings']);
  const ambient = useSettingsStore((state) => state.settings.ambient);
  const updateAmbient = useSettingsStore((state) => state.updateAmbient);

  // Push the mix into the engine whenever it changes.
  useEffect(() => {
    const engine = getSoundEngine();
    engine.setAmbientEnabled(ambient.enabled);
    engine.setMasterVolume(ambient.masterVolume);
    engine.setTrackVolumes(ambient.tracks);
  }, [ambient.enabled, ambient.masterVolume, ambient.tracks]);

  return (
    <Card title={t('timer:ambient.title')}>
      <Toggle
        checked={ambient.enabled}
        onChange={(enabled) => {
          // Playback needs a gesture; this toggle is one.
          getSoundEngine().unlock();
          updateAmbient({ enabled });
        }}
        label={t('timer:ambient.enable')}
      />

      <div className="mt-3 border-t border-border pt-3">
        <Slider
          value={ambient.masterVolume}
          onChange={(masterVolume) => updateAmbient({ masterVolume })}
          label={t('timer:ambient.master')}
          valueLabel={percent(ambient.masterVolume)}
          ariaValueText={percent(ambient.masterVolume)}
          disabled={!ambient.enabled}
        />
      </div>

      <div className="mt-2 space-y-1">
        {AMBIENT_TRACKS.map(({ id }) => {
          const Icon = ICONS[id];
          const value = ambient.tracks[id];
          return (
            <Slider
              key={id}
              value={value}
              onChange={(next) => updateAmbient({ tracks: { ...ambient.tracks, [id]: next } })}
              label={
                <span className="inline-flex items-center gap-2">
                  <Icon size={14} aria-hidden="true" className="text-accent" />
                  {t(`timer:ambient.${id}`)}
                </span>
              }
              valueLabel={value === 0 ? t('timer:ambient.muted') : percent(value)}
              ariaValueText={value === 0 ? t('timer:ambient.muted') : percent(value)}
              disabled={!ambient.enabled}
            />
          );
        })}
      </div>
    </Card>
  );
}
