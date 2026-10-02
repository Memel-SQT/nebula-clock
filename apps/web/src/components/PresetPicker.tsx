import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createId } from '@nebula-clock/core';
import type { Preset } from '@nebula-clock/core';
import { Button, IconButton, TextField, cn } from '@nebula-clock/ui';
import { allPresets, useDataStore } from '../store/dataStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useTimerStore } from '../store/timerStore.js';

/** Built-in preset names come from the catalogue; custom ones are literal. */
function presetLabel(preset: Preset, t: (key: string) => string): string {
  const keys: Record<string, string> = {
    classic: 'timer:presets.classic',
    'deep-work': 'timer:presets.deepWork',
    sprint: 'timer:presets.sprint',
    ultradian: 'timer:presets.ultradian',
  };
  const key = keys[preset.id];
  return key ? t(key) : preset.name;
}

/** The presets as pills (the active one in the accent), plus "save the current durations". */
export function PresetPicker() {
  const { t } = useTranslation(['timer', 'common']);
  const settings = useSettingsStore((state) => state.settings);
  const applyPreset = useSettingsStore((state) => state.applyPreset);
  const customPresets = useDataStore((state) => state.customPresets);
  const addPreset = useDataStore((state) => state.addPreset);
  const removePreset = useDataStore((state) => state.removePreset);
  const configure = useTimerStore((state) => state.configure);

  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const presets = allPresets(customPresets);
  const activeId = settings.timer.activePresetId;

  const saveCurrent = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const preset: Preset = {
      id: createId(),
      name: trimmed.slice(0, 80),
      focusMinutes: settings.timer.focusMinutes,
      shortBreakMinutes: settings.timer.shortBreakMinutes,
      longBreakMinutes: settings.timer.longBreakMinutes,
      cyclesBeforeLongBreak: settings.timer.cyclesBeforeLongBreak,
      builtIn: false,
    };
    void addPreset(preset).then(() => applyPreset(preset));
    setName('');
    setNaming(false);
  };

  return (
    <div className="preset-picker">
      <div className="preset-row" role="group" aria-label={t('timer:presets.title')}>
        {presets.map((preset) => {
          const active = preset.id === activeId;
          return (
            <span key={preset.id} className={cn('preset', !preset.builtIn && 'is-custom')}>
              <button
                type="button"
                aria-pressed={active}
                data-sound="toggle"
                className={cn('preset-pill', active && 'active')}
                onClick={() => {
                  applyPreset(preset);
                  // A shorter preset can leave the running phase already over.
                  configure();
                }}
              >
                {presetLabel(preset, t)}
              </button>
              {!preset.builtIn ? (
                <IconButton
                  label={`${t('timer:presets.deletePreset')} : ${preset.name}`}
                  icon="close"
                  size="sm"
                  className="preset-remove"
                  onClick={() => void removePreset(preset.id)}
                />
              ) : null}
            </span>
          );
        })}

        {!naming ? (
          <Button size="sm" variant="quiet" icon="plus" onClick={() => setNaming(true)}>
            {t('timer:presets.savePreset')}
          </Button>
        ) : null}
      </div>

      {naming ? (
        <div className="preset-form">
          <TextField
            autoFocus
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveCurrent();
              if (event.key === 'Escape') setNaming(false);
            }}
            placeholder={t('timer:presets.namePlaceholder')}
            wrapperClassName="flex-1"
            aria-label={t('timer:presets.namePlaceholder')}
          />
          <Button variant="secondary" size="sm" onClick={saveCurrent}>
            {t('common:actions.save')}
          </Button>
          <Button size="sm" variant="quiet" onClick={() => setNaming(false)}>
            {t('common:actions.cancel')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
