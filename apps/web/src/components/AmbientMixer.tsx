import { useTranslation } from 'react-i18next';
import { AMBIENT_TRACKS } from '@nebula-clock/core';
import type { AmbientTrackId } from '@nebula-clock/core';
import { Card, Icon, Slider, Toggle, type IconName } from '@nebula-clock/ui';
import { getSoundEngine } from '../lib/sound.js';
import { useSettingsStore } from '../store/settingsStore.js';

const ICONS: Record<AmbientTrackId, IconName> = {
  rain: 'rain',
  forest: 'forest',
  cafe: 'coffee',
  whiteNoise: 'waves',
};

const percent = (value: number) => `${Math.round(value * 100)} %`;

/**
 * Per-track volumes under a shared master gain, entirely separate from the notification volume
 * (turning the rain up never makes the chime louder). The engine itself is driven from the app
 * root (`useAmbientSync`), so the mix plays whatever screen is open.
 */
export function AmbientMixer() {
  const { t } = useTranslation(['timer', 'settings']);
  const ambient = useSettingsStore((state) => state.settings.ambient);
  const updateAmbient = useSettingsStore((state) => state.updateAmbient);

  return (
    <Card title={t('timer:ambient.title')} className="ambient-mixer">
      <Toggle
        checked={ambient.enabled}
        onChange={(enabled) => {
          // Playback needs a gesture; this switch is one.
          getSoundEngine().unlock();
          updateAmbient({ enabled });
        }}
        label={t('timer:ambient.enable')}
      />

      <div className="ambient-tracks">
        <Slider
          value={ambient.masterVolume}
          onChange={(masterVolume) => updateAmbient({ masterVolume })}
          label={t('timer:ambient.master')}
          valueLabel={percent(ambient.masterVolume)}
          ariaValueText={percent(ambient.masterVolume)}
          disabled={!ambient.enabled}
        />
        {AMBIENT_TRACKS.map(({ id }) => {
          const value = ambient.tracks[id];
          return (
            <Slider
              key={id}
              value={value}
              onChange={(next) => updateAmbient({ tracks: { ...ambient.tracks, [id]: next } })}
              label={
                <>
                  <Icon name={ICONS[id]} size={16} className="text-accent-hover" />
                  {t(`timer:ambient.${id}`)}
                </>
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
