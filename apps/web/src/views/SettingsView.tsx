import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Trash2, Upload } from 'lucide-react';
import {
  ACCENT_PRESETS,
  DEFAULT_BREAK_REMINDERS,
  DEFAULT_SETTINGS,
  ImportError,
  LIMITS,
  NOTIFICATION_SOUNDS,
  buildExportBundle,
  getNotificationAdapter,
  parseImportBundle,
  resolveAccent,
  resolveLanguage,
  serializeJson,
  sessionsToCsv,
  tasksToCsv,
} from '@nebula-clock/core';
import type { LanguageSetting, NotificationPermissionState, ThemeMode } from '@nebula-clock/core';
import {
  Button,
  Card,
  NumberField,
  SegmentedControl,
  SelectField,
  Slider,
  TextArea,
  Toggle,
  cn,
} from '@nebula-clock/ui';
import {
  downloadCsv,
  downloadJson,
  pickDataUrl,
  pickTextFile,
  timestampedFilename,
} from '../lib/download.js';
import { revealDelay } from '../lib/reveal.js';
import { getSoundEngine } from '../lib/sound.js';
import { getDesktop, type UpdateEvent } from '../lib/platform.js';
import { useDataStore } from '../store/dataStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useTimerStore } from '../store/timerStore.js';

const APP_VERSION = __APP_VERSION__;

export function SettingsView() {
  const { t, i18n } = useTranslation(['settings', 'common', 'timer']);
  const settings = useSettingsStore((state) => state.settings);
  const {
    updateTimer,
    updateGoals,
    updateNotifications,
    updateAmbient,
    updateBreakReminders,
    updateAppearance,
    updateDesktop,
    updateBlocker,
    setLanguage,
    setFullscreenOnFocus,
    replaceAll,
    resetAll,
  } = useSettingsStore.getState();

  const data = useDataStore();
  const configure = useTimerStore((state) => state.configure);
  const desktop = getDesktop();

  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [status, setStatus] = useState<string | null>(null);
  const [update, setUpdate] = useState<UpdateEvent | null>(null);

  useEffect(() => setPermission(getNotificationAdapter().getPermission()), []);
  useEffect(() => desktop?.onUpdateEvent(setUpdate), [desktop]);

  // Transient confirmation messages clear themselves.
  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => setStatus(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const language = resolveLanguage(settings.language, [i18n.language]);

  /* --------------------------------------------------------- data export */

  const exportJson = () => {
    const bundle = buildExportBundle({
      appVersion: APP_VERSION,
      settings,
      tasks: data.tasks,
      tags: data.tags,
      sessions: data.sessions,
      presets: data.customPresets,
    });
    downloadJson(serializeJson(bundle), timestampedFilename('backup', 'json'));
  };

  const importBackup = async () => {
    const file = await pickTextFile('application/json,.json');
    if (!file) return;
    if (!window.confirm(t('common:confirm.importReplace'))) return;
    try {
      const parsed = parseImportBundle(file.text);
      await data.importAll(parsed);
      replaceAll(parsed.settings);
      setStatus(
        t('settings:data.importSuccess', {
          sessions: parsed.sessions.length,
          tasks: parsed.tasks.length,
        }),
      );
    } catch (error) {
      const reason =
        error instanceof ImportError
          ? t(`settings:data.reasons.${error.message}`, {
              defaultValue: t('settings:data.reasons.unknown'),
            })
          : t('settings:data.reasons.unknown');
      setStatus(t('settings:data.importFailed', { reason }));
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{t('settings:title')}</h1>
      </header>

      {status ? (
        <p
          role="status"
          className="rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm"
        >
          {status}
        </p>
      ) : null}

      {/* ------------------------------------------------------------ timer */}
      <Card title={t('settings:sections.timer')} className="nebula-reveal" style={revealDelay(0)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label={t('settings:timer.focus')}
            suffix={t('settings:timer.minutesSuffix')}
            value={settings.timer.focusMinutes}
            min={LIMITS.focusMinutes.min}
            max={LIMITS.focusMinutes.max}
            onChange={(focusMinutes) => {
              updateTimer({ focusMinutes });
              configure();
            }}
          />
          <NumberField
            label={t('settings:timer.shortBreak')}
            suffix={t('settings:timer.minutesSuffix')}
            value={settings.timer.shortBreakMinutes}
            min={LIMITS.shortBreakMinutes.min}
            max={LIMITS.shortBreakMinutes.max}
            onChange={(shortBreakMinutes) => {
              updateTimer({ shortBreakMinutes });
              configure();
            }}
          />
          <NumberField
            label={t('settings:timer.longBreak')}
            suffix={t('settings:timer.minutesSuffix')}
            value={settings.timer.longBreakMinutes}
            min={LIMITS.longBreakMinutes.min}
            max={LIMITS.longBreakMinutes.max}
            onChange={(longBreakMinutes) => {
              updateTimer({ longBreakMinutes });
              configure();
            }}
          />
          <NumberField
            label={t('settings:timer.cycles')}
            value={settings.timer.cyclesBeforeLongBreak}
            min={LIMITS.cyclesBeforeLongBreak.min}
            max={LIMITS.cyclesBeforeLongBreak.max}
            onChange={(cyclesBeforeLongBreak) => updateTimer({ cyclesBeforeLongBreak })}
          />
        </div>

        <div className="mt-2 divide-y divide-border">
          <Toggle
            checked={settings.timer.autoStartBreaks}
            onChange={(autoStartBreaks) => updateTimer({ autoStartBreaks })}
            label={t('settings:timer.autoStartBreaks')}
          />
          <Toggle
            checked={settings.timer.autoStartFocus}
            onChange={(autoStartFocus) => updateTimer({ autoStartFocus })}
            label={t('settings:timer.autoStartFocus')}
          />
          <Toggle
            checked={settings.fullscreenOnFocus}
            onChange={setFullscreenOnFocus}
            label={t('settings:timer.fullscreenOnFocus')}
          />
        </div>
      </Card>

      {/* ------------------------------------------------------------ goals */}
      <Card title={t('settings:sections.goals')} className="nebula-reveal" style={revealDelay(1)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label={t('settings:goals.daily')}
            value={settings.goals.dailyPomodoros}
            min={LIMITS.dailyPomodoros.min}
            max={LIMITS.dailyPomodoros.max}
            onChange={(dailyPomodoros) => updateGoals({ dailyPomodoros })}
          />
          <NumberField
            label={t('settings:goals.weekly')}
            value={settings.goals.weeklyPomodoros}
            min={LIMITS.weeklyPomodoros.min}
            max={LIMITS.weeklyPomodoros.max}
            onChange={(weeklyPomodoros) => updateGoals({ weeklyPomodoros })}
          />
        </div>
      </Card>

      {/* ---------------------------------------------------- notifications */}
      <Card
        title={t('settings:sections.notifications')}
        className="nebula-reveal"
        style={revealDelay(2)}
      >
        <div className="divide-y divide-border">
          <Toggle
            checked={settings.notifications.system}
            onChange={(system) => updateNotifications({ system })}
            label={t('settings:notifications.system')}
            description={t('settings:notifications.systemHint')}
          />
          <Toggle
            checked={settings.notifications.sound}
            onChange={(sound) => updateNotifications({ sound })}
            label={t('settings:notifications.sound')}
          />
        </div>

        {permission !== 'granted' && permission !== 'unsupported' ? (
          <div className="mt-3">
            {permission === 'denied' ? (
              <p className="text-xs text-warning">{t('settings:notifications.permissionDenied')}</p>
            ) : (
              <Button
                size="sm"
                onClick={() =>
                  void getNotificationAdapter().requestPermission().then(setPermission)
                }
              >
                {t('settings:notifications.permissionPrompt')}
              </Button>
            )}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <SelectField
            label={t('settings:notifications.soundChoice')}
            value={settings.notifications.soundId}
            onChange={(event) => updateNotifications({ soundId: event.target.value })}
            options={NOTIFICATION_SOUNDS.map((sound) => ({
              value: sound.id,
              label: t(`settings:notifications.sounds.${sound.id}`),
            }))}
            wrapperClassName="flex-1 min-w-[10rem]"
          />
          <Button
            size="sm"
            icon={<Play size={14} />}
            className="mb-1"
            onClick={() => {
              const engine = getSoundEngine();
              engine.unlock();
              engine.setNotificationVolume(settings.notifications.volume);
              engine.playNotification(
                settings.notifications.soundId,
                settings.notifications.customSound?.dataUrl ?? null,
              );
            }}
          >
            {t('settings:notifications.preview')}
          </Button>
        </div>

        <Slider
          label={t('settings:notifications.volume')}
          value={settings.notifications.volume}
          onChange={(volume) => {
            updateNotifications({ volume });
            getSoundEngine().setNotificationVolume(volume);
          }}
          valueLabel={`${Math.round(settings.notifications.volume * 100)}%`}
          ariaValueText={`${Math.round(settings.notifications.volume * 100)}%`}
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<Upload size={14} />}
            onClick={() =>
              void pickDataUrl('audio/*').then((file) => {
                if (file) updateNotifications({ customSound: file });
              })
            }
          >
            {t('settings:notifications.importSound')}
          </Button>
          {settings.notifications.customSound ? (
            <>
              <span className="text-xs text-text-secondary">
                {t('settings:notifications.customSoundActive', {
                  name: settings.notifications.customSound.name,
                })}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateNotifications({ customSound: null })}
              >
                {t('settings:notifications.removeCustom')}
              </Button>
            </>
          ) : null}
        </div>
      </Card>

      {/* ---------------------------------------------------------- ambient */}
      <Card title={t('settings:sections.ambient')} description={t('settings:ambient.hint')}>
        <div className="divide-y divide-border">
          <Toggle
            checked={settings.ambient.enabled}
            onChange={(enabled) => updateAmbient({ enabled })}
            label={t('settings:ambient.enable')}
          />
          <Toggle
            checked={settings.ambient.pauseOnBreak}
            onChange={(pauseOnBreak) => updateAmbient({ pauseOnBreak })}
            label={t('settings:ambient.pauseOnBreak')}
          />
        </div>
      </Card>

      {/* ----------------------------------------------------------- breaks */}
      <Card title={t('settings:sections.breaks')} className="nebula-reveal" style={revealDelay(3)}>
        <Toggle
          checked={settings.breakReminders.enabled}
          onChange={(enabled) => updateBreakReminders({ enabled })}
          label={t('settings:breaks.enable')}
        />
        <NumberField
          label={t('settings:breaks.interval')}
          suffix={t('settings:breaks.intervalSuffix')}
          value={settings.breakReminders.intervalSeconds}
          min={LIMITS.breakReminderSeconds.min}
          max={LIMITS.breakReminderSeconds.max}
          onChange={(intervalSeconds) => updateBreakReminders({ intervalSeconds })}
          wrapperClassName="max-w-40"
        />
        <TextArea
          label={t('settings:breaks.messages')}
          hint={t('settings:breaks.messagesHint')}
          value={settings.breakReminders.customMessages.join('\n')}
          onChange={(event) =>
            updateBreakReminders({
              customMessages: event.target.value.split('\n').filter((line) => line.trim() !== ''),
            })
          }
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            updateBreakReminders({ customMessages: [...(DEFAULT_BREAK_REMINDERS[language] ?? [])] })
          }
        >
          {t('settings:breaks.resetMessages')}
        </Button>
      </Card>

      {/* ------------------------------------------------------- appearance */}
      <Card
        title={t('settings:sections.appearance')}
        className="nebula-reveal"
        style={revealDelay(4)}
      >
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium">
              {t('settings:appearance.theme')}
            </span>
            <SegmentedControl<ThemeMode>
              label={t('settings:appearance.theme')}
              value={settings.appearance.theme}
              onChange={(theme) => updateAppearance({ theme })}
              options={[
                { value: 'light', label: t('settings:appearance.themeLight') },
                { value: 'dark', label: t('settings:appearance.themeDark') },
                { value: 'system', label: t('settings:appearance.themeSystem') },
              ]}
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">
              {t('settings:appearance.accent')}
            </legend>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_PRESETS.map((preset) => {
                const active = settings.appearance.accent === preset.to;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active}
                    aria-label={t(`settings:appearance.accents.${preset.id}`)}
                    title={t(`settings:appearance.accents.${preset.id}`)}
                    onClick={() => updateAppearance({ accent: preset.to })}
                    style={{
                      backgroundImage: `linear-gradient(100deg, ${preset.from}, ${preset.to})`,
                    }}
                    className={cn(
                      'h-8 w-8 rounded-pill transition-transform duration-fast ease-nebula',
                      active ? 'scale-110 ring-2 ring-text' : 'hover:scale-105',
                    )}
                  />
                );
              })}
              <label className="ml-2 flex items-center gap-2 text-xs text-text-secondary">
                {t('settings:appearance.accentCustom')}
                <input
                  type="color"
                  value={resolveAccent(settings.appearance.accent).to}
                  onChange={(event) => updateAppearance({ accent: event.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
              </label>
            </div>
          </fieldset>
        </div>
      </Card>

      {/* ---------------------------------------------------- accessibility */}
      <Card
        title={t('settings:sections.accessibility')}
        className="nebula-reveal"
        style={revealDelay(5)}
      >
        <Slider
          label={t('settings:accessibility.fontScale')}
          value={settings.appearance.fontScale}
          min={LIMITS.fontScale.min}
          max={LIMITS.fontScale.max}
          step={0.0625}
          valueLabel={`${Math.round(settings.appearance.fontScale * 100)}%`}
          ariaValueText={`${Math.round(settings.appearance.fontScale * 100)}%`}
          onChange={(fontScale) => updateAppearance({ fontScale })}
        />
        <div className="divide-y divide-border">
          <Toggle
            checked={settings.appearance.reduceMotion}
            onChange={(reduceMotion) => updateAppearance({ reduceMotion })}
            label={t('settings:accessibility.reduceMotion')}
            description={t('settings:accessibility.reduceMotionHint')}
          />
          <Toggle
            checked={settings.appearance.highContrast}
            onChange={(highContrast) => updateAppearance({ highContrast })}
            label={t('settings:accessibility.highContrast')}
            description={t('settings:accessibility.highContrastHint')}
          />
        </div>
      </Card>

      {/* --------------------------------------------------------- language */}
      <Card
        title={t('settings:sections.language')}
        className="nebula-reveal"
        style={revealDelay(6)}
      >
        <SelectField
          label={t('settings:language.label')}
          value={settings.language}
          onChange={(event) => setLanguage(event.target.value as LanguageSetting)}
          options={[
            { value: 'system', label: t('settings:language.system') },
            { value: 'fr', label: t('settings:language.fr') },
            { value: 'en', label: t('settings:language.en') },
          ]}
          wrapperClassName="max-w-xs"
        />
      </Card>

      {/* ---------------------------------------------------------- desktop */}
      <Card
        title={t('settings:sections.desktop')}
        description={desktop ? undefined : t('settings:desktop.unavailable')}
        className={desktop ? undefined : 'opacity-60'}
      >
        <div className="divide-y divide-border">
          <Toggle
            disabled={!desktop}
            checked={settings.desktop.minimizeToTray}
            onChange={(minimizeToTray) => {
              updateDesktop({ minimizeToTray });
              void desktop?.setMinimizeToTray(minimizeToTray);
            }}
            label={t('settings:desktop.minimizeToTray')}
          />
          <Toggle
            disabled={!desktop}
            checked={settings.desktop.launchAtLogin}
            onChange={(launchAtLogin) => {
              updateDesktop({ launchAtLogin });
              void desktop?.setLaunchAtLogin(launchAtLogin);
            }}
            label={t('settings:desktop.launchAtLogin')}
          />
          <Toggle
            disabled={!desktop}
            checked={settings.desktop.globalShortcuts}
            onChange={(globalShortcuts) => {
              updateDesktop({ globalShortcuts });
              void desktop?.setGlobalShortcuts(globalShortcuts);
            }}
            label={t('settings:desktop.globalShortcuts')}
            description={t('settings:desktop.globalShortcutsHint')}
          />
          <Toggle
            disabled={!desktop}
            checked={settings.desktop.doNotDisturb}
            onChange={(doNotDisturb) => updateDesktop({ doNotDisturb })}
            label={t('settings:desktop.doNotDisturb')}
            description={t('settings:desktop.doNotDisturbHint')}
          />
          <Toggle
            disabled={!desktop}
            checked={settings.desktop.miniModeAlwaysOnTop}
            onChange={(miniModeAlwaysOnTop) => {
              updateDesktop({ miniModeAlwaysOnTop });
              void desktop?.setMiniModeAlwaysOnTop(miniModeAlwaysOnTop);
            }}
            label={t('settings:desktop.miniMode')}
          />
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-semibold">{t('settings:desktop.blocker.title')}</h3>
          <Toggle
            disabled={!desktop}
            checked={settings.desktop.blocker.enabled}
            onChange={(enabled) => updateBlocker({ enabled })}
            label={t('settings:desktop.blocker.enable')}
          />
          <SegmentedControl
            label={t('settings:desktop.blocker.mode')}
            size="sm"
            className="my-2"
            value={settings.desktop.blocker.mode}
            onChange={(mode) => updateBlocker({ mode })}
            options={[
              { value: 'blacklist', label: t('settings:desktop.blocker.blacklist') },
              { value: 'whitelist', label: t('settings:desktop.blocker.whitelist') },
            ]}
          />
          <TextArea
            label={t('settings:desktop.blocker.sites')}
            hint={t('settings:desktop.blocker.sitesHint')}
            placeholder={t('settings:desktop.blocker.sitesPlaceholder')}
            disabled={!desktop}
            value={settings.desktop.blocker.sites.join('\n')}
            onChange={(event) =>
              updateBlocker({
                sites: event.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
          />
          <TextArea
            label={t('settings:desktop.blocker.apps')}
            hint={t('settings:desktop.blocker.appsHint')}
            placeholder={t('settings:desktop.blocker.appsPlaceholder')}
            disabled={!desktop}
            value={settings.desktop.blocker.apps.join('\n')}
            onChange={(event) =>
              updateBlocker({
                apps: event.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
          />
          <p className="mt-1 text-xs text-warning">{t('settings:desktop.blocker.permission')}</p>
        </div>
      </Card>

      {/* ------------------------------------------------------------- data */}
      <Card title={t('settings:sections.data')} description={t('settings:data.privacy')}>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={exportJson}>
            {t('settings:data.exportJson')}
          </Button>
          <Button
            size="sm"
            onClick={() =>
              downloadCsv(
                sessionsToCsv(data.sessions, data.tasks, data.tags),
                timestampedFilename('sessions', 'csv'),
              )
            }
          >
            {t('settings:data.exportCsvSessions')}
          </Button>
          <Button
            size="sm"
            onClick={() =>
              downloadCsv(tasksToCsv(data.tasks, data.tags), timestampedFilename('tasks', 'csv'))
            }
          >
            {t('settings:data.exportCsvTasks')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void importBackup()}>
            {t('settings:data.import')}
          </Button>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 size={14} />}
            onClick={() => {
              if (!window.confirm(t('common:confirm.clearData'))) return;
              void data.clearEverything().then(() => {
                resetAll();
                setStatus(t('settings:data.cleared'));
              });
            }}
          >
            {t('settings:data.clear')}
          </Button>
        </div>
      </Card>

      {/* ------------------------------------------------------------ about */}
      <Card title={t('settings:sections.about')} className="nebula-reveal" style={revealDelay(7)}>
        <p className="text-sm text-text-secondary">
          {t('settings:about.version', { version: APP_VERSION })} · {t('settings:about.license')}
        </p>

        {desktop ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void desktop.checkForUpdates()}>
              {t('settings:about.checkUpdates')}
            </Button>
            {update?.type === 'available' ? (
              <span className="text-sm">
                {t('settings:about.updateAvailable', { version: update.version })}
              </span>
            ) : null}
            {update?.type === 'progress' ? (
              <span className="text-sm">
                {t('settings:about.updateDownloading', { percent: Math.round(update.percent) })}
              </span>
            ) : null}
            {update?.type === 'not-available' ? (
              <span className="text-sm text-text-secondary">{t('settings:about.upToDate')}</span>
            ) : null}
            {update?.type === 'downloaded' ? (
              <Button size="sm" variant="primary" onClick={() => desktop.quitAndInstall()}>
                {t('settings:about.restartNow')}
              </Button>
            ) : null}
          </div>
        ) : null}

        <Button
          size="sm"
          variant="ghost"
          className="mt-3"
          onClick={() => {
            if (window.confirm(t('common:confirm.title'))) replaceAll(DEFAULT_SETTINGS);
          }}
        >
          {t('common:actions.reset')}
        </Button>
      </Card>
    </div>
  );
}
