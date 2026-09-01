import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
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
      name: trimmed,
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
    <div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {presets.map((preset) => {
          const active = preset.id === activeId;
          return (
            <span key={preset.id} className="group relative inline-flex items-center">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => {
                  applyPreset(preset);
                  // A shorter preset can leave the running phase already over.
                  configure();
                }}
                className={cn(
                  'rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors duration-fast ease-nebula',
                  active
                    ? 'border-transparent bg-nebula-gradient text-white shadow-glow'
                    : 'border-border bg-card-alt text-text-secondary hover:border-accent hover:text-text',
                  !preset.builtIn && 'pr-7',
                )}
              >
                {presetLabel(preset, t)}
              </button>
              {!preset.builtIn ? (
                <IconButton
                  label={t('timer:presets.deletePreset')}
                  icon={<Trash2 size={12} />}
                  size="sm"
                  className="absolute right-0 h-6 w-6 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={() => void removePreset(preset.id)}
                />
              ) : null}
            </span>
          );
        })}

        {!naming ? (
          <Button
            size="sm"
            variant="ghost"
            icon={<Plus size={14} />}
            onClick={() => setNaming(true)}
          >
            {t('timer:presets.savePreset')}
          </Button>
        ) : null}
      </div>

      {naming ? (
        <div className="mx-auto mt-3 flex max-w-sm items-end gap-2">
          <TextField
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveCurrent();
              if (event.key === 'Escape') setNaming(false);
            }}
            placeholder={t('timer:presets.namePlaceholder')}
            wrapperClassName="flex-1"
            aria-label={t('timer:presets.namePlaceholder')}
          />
          <Button variant="primary" size="sm" onClick={saveCurrent} className="mb-1">
            {t('common:actions.save')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNaming(false)} className="mb-1">
            {t('common:actions.cancel')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
