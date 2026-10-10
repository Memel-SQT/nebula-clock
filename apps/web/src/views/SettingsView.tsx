import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ACCENT_PRESETS,
  BACKGROUNDS,
  DEFAULT_APPEARANCE,
  DEFAULT_BREAK_REMINDERS,
  DEFAULT_SETTINGS,
  ImportError,
  LIMITS,
  MOTIONS,
  NOTIFICATION_SOUNDS,
  THEMES,
  buildExportBundle,
  findPackTheme,
  isTheme,
  packLabel,
  getNotificationAdapter,
  isGlassTheme,
  normalizeAppName,
  normalizeSite,
  parseImportBundle,
  resolveLanguage,
  resolveTheme,
  serializeJson,
  sessionsToCsv,
  tasksToCsv,
  type BackgroundEffect,
  type LanguageSetting,
  type NotificationPermissionState,
  type ParsedImport,
} from '@nebula-clock/core';
import {
  Button,
  Icon,
  Modal,
  NumberField,
  PageHeader,
  SegmentedControl,
  SelectField,
  Slider,
  TextArea,
  Toggle,
  cn,
  playSound,
  type IconName,
} from '@nebula-clock/ui';
import {
  downloadCsv,
  downloadJson,
  pickDataUrl,
  pickTextFile,
  timestampedFilename,
} from '../lib/download.js';
import { getSoundEngine } from '../lib/sound.js';
import { getDesktop, type UpdateEvent } from '../lib/platform.js';
import { useNebulaHub } from '../hooks/useNebulaHub.js';
import { useDataStore } from '../store/dataStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { useActivePack, usePackStore } from '../store/packStore.js';
import { useTimerStore } from '../store/timerStore.js';

const APP_VERSION = __APP_VERSION__;

/** Same previews as Nebula Hub's settings (`controls.css` `.effect-*`). */
const BACKGROUND_ICONS: Record<BackgroundEffect, IconName> = {
  glow: 'sparkles',
  aurora: 'droplet',
  stars: 'moon',
  particles: 'layers',
  waves: 'bolt',
  none: 'close',
};

type Confirmation =
  { kind: 'clear' } | { kind: 'reset' } | { kind: 'import'; parsed: ParsedImport };

function Section({
  icon,
  title,
  id,
  children,
}: {
  icon: IconName;
  title: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-section" id={id} aria-label={title}>
      <h2>
        <Icon name={icon} size={15} />
        {title}
      </h2>
      {children}
    </section>
  );
}

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
  const setActiveTask = useTimerStore((state) => state.setActiveTask);
  const desktop = getDesktop();
  const hub = useNebulaHub();

  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [status, setStatus] = useState<{ text: string; tone: 'accent' | 'warning' } | null>(null);
  const [update, setUpdate] = useState<UpdateEvent | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => setPermission(getNotificationAdapter().getPermission()), []);
  useEffect(() => desktop?.onUpdateEvent(setUpdate), [desktop]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setPrefersDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // Transient confirmation messages clear themselves.
  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => setStatus(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const appearance = settings.appearance;
  const packs = usePackStore((state) => state.packs);
  const setPackChoice = usePackStore((state) => state.setChoice);
  const activePack = useActivePack();
  const resolved = resolveTheme(appearance.theme, prefersDark);
  const language = resolveLanguage(settings.language, [i18n.language]);
  const notify = (text: string, tone: 'accent' | 'warning' = 'accent') => setStatus({ text, tone });

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

  // The file is read and checked first, then the replacement is confirmed with its contents.
  const importBackup = async () => {
    const file = await pickTextFile('application/json,.json');
    if (!file) return;
    try {
      setConfirmation({ kind: 'import', parsed: parseImportBundle(file.text) });
    } catch (error) {
      const reason =
        error instanceof ImportError
          ? t(`settings:data.reasons.${error.message}`, {
              defaultValue: t('settings:data.reasons.unknown'),
            })
          : t('settings:data.reasons.unknown');
      notify(t('settings:data.importFailed', { reason }), 'warning');
    }
  };

  const confirm = async () => {
    const current = confirmation;
    setConfirmation(null);
    if (!current) return;
    if (current.kind === 'import') {
      try {
        await data.importAll(current.parsed);
        replaceAll(current.parsed.settings);
        setActiveTask(null);
        notify(
          t('settings:data.importSuccess', {
            sessions: current.parsed.sessions.length,
            tasks: current.parsed.tasks.length,
          }),
        );
      } catch {
        notify(
          t('settings:data.importFailed', { reason: t('settings:data.reasons.unknown') }),
          'warning',
        );
      }
    } else if (current.kind === 'clear') {
      await data.clearEverything();
      resetAll();
      setActiveTask(null);
      notify(t('settings:data.cleared'));
    } else {
      replaceAll(DEFAULT_SETTINGS);
    }
  };

  const importSound = async () => {
    const file = await pickDataUrl('audio/*');
    if (!file) return;
    if (!file.dataUrl.startsWith('data:audio/')) {
      notify(t('settings:notifications.customSoundInvalid'), 'warning');
    } else if (file.dataUrl.length > LIMITS.customSoundBytes.max) {
      // It would not fit next to the settings in localStorage, and every later change to the
      // settings would then fail to save without a word.
      notify(t('settings:notifications.customSoundTooLarge'), 'warning');
    } else {
      updateNotifications({
        customSound: { name: file.name.slice(0, 200), dataUrl: file.dataUrl },
      });
    }
  };

  const commitList = (kind: 'sites' | 'apps', lines: string[]) => {
    const normalize = kind === 'sites' ? normalizeSite : normalizeAppName;
    setIgnored(lines.filter((line) => normalize(line) === null));
    updateBlocker({ [kind]: lines });
  };

  const confirmTexts =
    confirmation?.kind === 'clear'
      ? {
          title: t('common:confirm.clearDataTitle'),
          body: t('common:confirm.clearData'),
          action: t('common:confirm.clearDataConfirm'),
          tone: 'danger' as const,
          icon: 'trash' as const,
        }
      : confirmation?.kind === 'import'
        ? {
            title: t('common:confirm.importTitle'),
            body: `${t('common:confirm.importReplace')} ${t('settings:data.importSuccess', {
              sessions: confirmation.parsed.sessions.length,
              tasks: confirmation.parsed.tasks.length,
            })}.`,
            action: t('common:confirm.importConfirm'),
            tone: 'warning' as const,
            icon: 'upload' as const,
          }
        : {
            title: t('common:confirm.resetTitle'),
            body: t('common:confirm.resetBody'),
            action: t('common:confirm.resetConfirm'),
            tone: 'warning' as const,
            icon: 'refresh' as const,
          };

  return (
    <>
      <PageHeader
        eyebrow={t('common:pages.settings.eyebrow')}
        title={t('settings:title')}
        intro={t('settings:intro')}
      />

      {status ? (
        <p
          className={cn('state-banner', status.tone === 'warning' ? 'tone-warning' : 'tone-accent')}
          role="status"
        >
          <Icon name={status.tone === 'warning' ? 'alert' : 'check'} size={18} />
          <span>{status.text}</span>
        </p>
      ) : null}

      <div className="settings-layout">
        {/* ------------------------------------------------------- appearance */}
        <div className="settings-panel nebula-surface">
          <Section icon="palette" title={t('settings:sections.appearance')}>
            <p className="settings-label" id="settings-theme-label">
              {t('settings:appearance.theme')}
            </p>
            <SegmentedControl<string>
              labelledBy="settings-theme-label"
              value={activePack?.theme.id ?? appearance.theme}
              onChange={(value) => {
                // A theme of an installed appearance pack (NEBULA_LINK.md § 18), or a built-in one.
                if (findPackTheme(packs, value)) {
                  setPackChoice(value);
                  return;
                }
                setPackChoice(null);
                if (isTheme(value)) updateAppearance({ theme: value });
              }}
              options={[
                ...THEMES.map((theme) => ({
                  value: theme,
                  label: t(`settings:appearance.themes.${theme}`),
                })),
                ...packs
                  .flatMap((pack) => pack.themes)
                  .map((theme) => ({
                    value: theme.id,
                    label: packLabel(theme.label, i18n.language),
                  })),
              ]}
            />
            {isGlassTheme(resolved) && appearance.background !== 'aurora' ? (
              <small className="path-note settings-hint">
                <Icon name="info" size={14} />
                {t('settings:appearance.glassHint')}
              </small>
            ) : null}

            <p className="settings-label" id="settings-language-label">
              {t('settings:appearance.language')}
            </p>
            <SegmentedControl<LanguageSetting>
              labelledBy="settings-language-label"
              value={settings.language}
              onChange={setLanguage}
              options={[
                { value: 'system', label: t('settings:language.system') },
                { value: 'fr', label: t('settings:language.fr'), lang: 'fr' },
                { value: 'en', label: t('settings:language.en'), lang: 'en' },
              ]}
            />

            <p className="settings-label" id="settings-accent-label">
              {t('settings:appearance.accent')}
            </p>
            {activePack ? (
              <small className="path-note settings-hint">
                <Icon name="info" size={14} />
                {t('settings:appearance.packAccentHint')}
              </small>
            ) : null}
            <div className="swatch-row" role="radiogroup" aria-labelledby="settings-accent-label">
              {[...ACCENT_PRESETS, null].map((preset) => {
                const id = preset?.id ?? 'custom';
                const active = appearance.accentPreset === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-sound="toggle"
                    className={cn('btn swatch', active && 'active')}
                    style={
                      {
                        '--swatch-a': preset?.secondary ?? appearance.customSecondary,
                        '--swatch-b': preset?.primary ?? appearance.customPrimary,
                      } as CSSProperties
                    }
                    onClick={() => updateAppearance({ accentPreset: id })}
                  >
                    <i aria-hidden="true" />
                    <span>{t(`settings:appearance.accents.${id}`)}</span>
                  </button>
                );
              })}
            </div>
            {appearance.accentPreset === 'custom' ? (
              <div className="settings-fields color-fields">
                <label className="color-field">
                  <input
                    type="color"
                    value={appearance.customPrimary}
                    onChange={(event) => updateAppearance({ customPrimary: event.target.value })}
                  />
                  {t('settings:appearance.accentPrimary')}
                </label>
                <label className="color-field">
                  <input
                    type="color"
                    value={appearance.customSecondary}
                    onChange={(event) => updateAppearance({ customSecondary: event.target.value })}
                  />
                  {t('settings:appearance.accentSecondary')}
                </label>
              </div>
            ) : null}
          </Section>

          <Section icon="sparkles" title={t('settings:sections.effects')}>
            <p className="settings-label" id="settings-background-label">
              {t('settings:appearance.background')}
            </p>
            <div
              className="effect-grid"
              role="radiogroup"
              aria-labelledby="settings-background-label"
            >
              {BACKGROUNDS.map((background) => (
                <button
                  key={background}
                  type="button"
                  role="radio"
                  aria-checked={appearance.background === background}
                  data-sound="toggle"
                  className={cn(
                    'btn effect-tile',
                    `effect-${background}`,
                    appearance.background === background && 'active',
                  )}
                  onClick={() => updateAppearance({ background })}
                >
                  <span className="effect-preview" aria-hidden="true">
                    <Icon name={BACKGROUND_ICONS[background]} size={18} />
                  </span>
                  <span>{t(`settings:appearance.backgrounds.${background}`)}</span>
                </button>
              ))}
            </div>

            <p className="settings-label" id="settings-motion-label">
              {t('settings:appearance.motion')}
            </p>
            <SegmentedControl
              labelledBy="settings-motion-label"
              value={appearance.motion}
              onChange={(motion) => updateAppearance({ motion })}
              options={MOTIONS.map((motion) => ({
                value: motion,
                label: t(`settings:appearance.motions.${motion}`),
              }))}
            />
          </Section>

          <Section
            icon={appearance.soundEnabled ? 'volume' : 'volumeOff'}
            title={t('settings:sections.sounds')}
          >
            <div className="sound-row">
              <button
                type="button"
                role="switch"
                aria-checked={appearance.soundEnabled}
                className={cn('btn switch', appearance.soundEnabled && 'on')}
                data-sound="none"
                onClick={() => {
                  const next = !appearance.soundEnabled;
                  updateAppearance({ soundEnabled: next });
                  if (next) playSound('toggle', { force: true });
                }}
              >
                <i aria-hidden="true" />
                <span>
                  {t('settings:appearance.soundEnabled')} —{' '}
                  {t(
                    appearance.soundEnabled ? 'settings:appearance.on' : 'settings:appearance.off',
                  )}
                </span>
              </button>
              <label className="range-field">
                {t('settings:appearance.soundVolume')}
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={appearance.soundVolume}
                  disabled={!appearance.soundEnabled}
                  onChange={(event) =>
                    updateAppearance({ soundVolume: Number(event.target.value) })
                  }
                />
                <b>{appearance.soundVolume} %</b>
              </label>
              <Button
                variant="ghost"
                size="sm"
                icon="volume"
                sound="none"
                disabled={!appearance.soundEnabled}
                onClick={() => playSound('success')}
              >
                {t('settings:appearance.soundTest')}
              </Button>
            </div>
            <div className="settings-actions settings-reset">
              <Button
                variant="ghost"
                size="sm"
                icon="refresh"
                sound="none"
                onClick={() =>
                  // The accessibility settings are not part of the family appearance.
                  updateAppearance({
                    ...DEFAULT_APPEARANCE,
                    fontScale: appearance.fontScale,
                    highContrast: appearance.highContrast,
                  })
                }
              >
                {t('settings:appearance.reset')}
              </Button>
            </div>
          </Section>

          <Section icon="eye" title={t('settings:sections.accessibility')}>
            <Slider
              label={t('settings:accessibility.fontScale')}
              value={appearance.fontScale}
              min={LIMITS.fontScale.min}
              max={LIMITS.fontScale.max}
              step={0.0625}
              valueLabel={`${Math.round(appearance.fontScale * 100)} %`}
              ariaValueText={`${Math.round(appearance.fontScale * 100)} %`}
              onChange={(fontScale) => updateAppearance({ fontScale })}
              className="max-w-md"
            />
            <small className="path-note">{t('settings:accessibility.fontScaleHint')}</small>
            <Toggle
              checked={appearance.highContrast}
              onChange={(highContrast) => updateAppearance({ highContrast })}
              label={t('settings:accessibility.highContrast')}
              description={t('settings:accessibility.highContrastHint')}
            />
          </Section>
        </div>

        {/* ------------------------------------------------------------ timer */}
        <div className="settings-panel nebula-surface">
          <Section icon="timer" title={t('settings:sections.timer')}>
            <div className="settings-grid">
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
            <div className="switch-list settings-reset">
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
          </Section>

          <Section icon="target" title={t('settings:sections.goals')}>
            <div className="settings-grid">
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
          </Section>

          <Section icon="sparkles" title={t('settings:sections.breaks')}>
            <Toggle
              checked={settings.breakReminders.enabled}
              onChange={(enabled) => updateBreakReminders({ enabled })}
              label={t('settings:breaks.enable')}
            />
            <div className="settings-grid settings-reset">
              <NumberField
                label={t('settings:breaks.interval')}
                suffix={t('settings:breaks.intervalSuffix')}
                value={settings.breakReminders.intervalSeconds}
                min={LIMITS.breakReminderSeconds.min}
                max={LIMITS.breakReminderSeconds.max}
                onChange={(intervalSeconds) => updateBreakReminders({ intervalSeconds })}
              />
            </div>
            <TextArea
              label={t('settings:breaks.messages')}
              hint={t('settings:breaks.messagesHint')}
              lines={settings.breakReminders.customMessages}
              onCommit={(customMessages) => updateBreakReminders({ customMessages })}
              wrapperClassName="settings-reset"
            />
            <div className="settings-actions settings-reset">
              <Button
                size="sm"
                variant="ghost"
                icon="refresh"
                onClick={() =>
                  updateBreakReminders({
                    customMessages: [...(DEFAULT_BREAK_REMINDERS[language] ?? [])],
                  })
                }
              >
                {t('settings:breaks.resetMessages')}
              </Button>
            </div>
          </Section>
        </div>

        {/* ---------------------------------------------------- notifications */}
        <div className="settings-panel nebula-surface">
          <Section icon="bell" title={t('settings:sections.notifications')}>
            <div className="switch-list">
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
              <div className="settings-actions settings-reset">
                {permission === 'denied' ? (
                  <small className="path-note settings-hint">
                    <Icon name="alert" size={14} />
                    {t('settings:notifications.permissionDenied')}
                  </small>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="bell"
                    onClick={() =>
                      void getNotificationAdapter().requestPermission().then(setPermission)
                    }
                  >
                    {t('settings:notifications.permissionPrompt')}
                  </Button>
                )}
              </div>
            ) : null}

            <div className="settings-fields settings-reset">
              <SelectField
                label={t('settings:notifications.soundChoice')}
                value={settings.notifications.soundId}
                onChange={(event) => updateNotifications({ soundId: event.target.value })}
                options={NOTIFICATION_SOUNDS.map((sound) => ({
                  value: sound.id,
                  label: t(`settings:notifications.sounds.${sound.id}`),
                }))}
                wrapperClassName="min-w-[12rem] flex-1"
              />
              <Button
                size="md"
                variant="ghost"
                icon="start"
                sound="none"
                className="self-end"
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
              valueLabel={`${Math.round(settings.notifications.volume * 100)} %`}
              ariaValueText={`${Math.round(settings.notifications.volume * 100)} %`}
              className="settings-reset max-w-md"
            />

            <div className="settings-actions settings-reset">
              <Button size="sm" variant="ghost" icon="upload" onClick={() => void importSound()}>
                {t('settings:notifications.importSound')}
              </Button>
              {settings.notifications.customSound ? (
                <>
                  <span className="settings-copy">
                    {t('settings:notifications.customSoundActive', {
                      name: settings.notifications.customSound.name,
                    })}
                  </span>
                  <Button
                    size="sm"
                    variant="quiet"
                    icon="close"
                    onClick={() => updateNotifications({ customSound: null })}
                  >
                    {t('settings:notifications.removeCustom')}
                  </Button>
                </>
              ) : null}
            </div>
          </Section>

          <Section icon="waves" title={t('settings:sections.ambient')}>
            <p className="settings-copy">{t('settings:ambient.hint')}</p>
            <div className="switch-list settings-reset">
              <Toggle
                checked={settings.ambient.enabled}
                onChange={(enabled) => {
                  getSoundEngine().unlock();
                  updateAmbient({ enabled });
                }}
                label={t('settings:ambient.enable')}
              />
              <Toggle
                checked={settings.ambient.pauseOnBreak}
                onChange={(pauseOnBreak) => updateAmbient({ pauseOnBreak })}
                label={t('settings:ambient.pauseOnBreak')}
              />
            </div>
          </Section>
        </div>

        {/* ---------------------------------------------------------- desktop */}
        <div className={cn('settings-panel nebula-surface', !desktop && 'is-unavailable')}>
          <Section icon="miniWindow" title={t('settings:sections.desktop')}>
            {!desktop ? <p className="settings-copy">{t('settings:desktop.unavailable')}</p> : null}
            <div className="switch-list">
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
          </Section>

          <Section icon="shield" title={t('settings:desktop.blocker.title')}>
            <Toggle
              disabled={!desktop}
              checked={settings.desktop.blocker.enabled}
              onChange={(enabled) => updateBlocker({ enabled })}
              label={t('settings:desktop.blocker.enable')}
            />
            <p className="settings-label" id="settings-blocker-mode">
              {t('settings:desktop.blocker.mode')}
            </p>
            <SegmentedControl
              labelledBy="settings-blocker-mode"
              disabled={!desktop}
              value={settings.desktop.blocker.mode}
              onChange={(mode) => updateBlocker({ mode })}
              options={[
                { value: 'blacklist', label: t('settings:desktop.blocker.blacklist') },
                { value: 'whitelist', label: t('settings:desktop.blocker.whitelist') },
              ]}
            />
            <div className="settings-grid settings-reset">
              <TextArea
                label={t('settings:desktop.blocker.sites')}
                hint={t('settings:desktop.blocker.sitesHint')}
                placeholder={t('settings:desktop.blocker.sitesPlaceholder')}
                disabled={!desktop}
                lines={settings.desktop.blocker.sites}
                onCommit={(lines) => commitList('sites', lines)}
              />
              <TextArea
                label={t('settings:desktop.blocker.apps')}
                hint={t('settings:desktop.blocker.appsHint')}
                placeholder={t('settings:desktop.blocker.appsPlaceholder')}
                disabled={!desktop}
                lines={settings.desktop.blocker.apps}
                onCommit={(lines) => commitList('apps', lines)}
              />
            </div>
            {ignored.length > 0 ? (
              <small className="path-note settings-hint" role="status">
                <Icon name="alert" size={14} />
                {t('settings:desktop.blocker.ignored', { entries: ignored.join(', ') })}
              </small>
            ) : null}
            <small className="path-note settings-hint">
              <Icon name="info" size={14} />
              {t('settings:desktop.blocker.permission')}
            </small>
          </Section>

          {desktop?.getHubState ? (
            <Section icon="orbit" title={t('settings:sections.nebula')} id="settings-nebula">
              <p className="settings-copy">{t('settings:nebula.privacy')}</p>
              <p className="settings-copy settings-reset" role="status">
                <span
                  className={cn('status-dot', !hub.state?.connected && 'off')}
                  aria-hidden="true"
                />{' '}
                {hub.state?.connected
                  ? t('settings:nebula.connected', { version: hub.state.hubVersion ?? '' })
                  : t('settings:nebula.offline')}
              </p>
              <div className="switch-list settings-reset">
                <Toggle
                  checked={hub.follow}
                  onChange={hub.setFollow}
                  label={t('settings:nebula.follow')}
                  description={t('settings:nebula.followHint')}
                />
                <Toggle
                  checked={Boolean(hub.state?.updatesByHub)}
                  onChange={hub.setUpdatesByHub}
                  label={t('settings:nebula.updatesByHub')}
                  description={t('settings:nebula.updatesByHubHint')}
                />
                {desktop.setBreakReading ? (
                  <Toggle
                    checked={hub.state?.breakReading !== false}
                    onChange={hub.setBreakReading}
                    label={t('settings:nebula.breakReading')}
                    description={t('settings:nebula.breakReadingHint')}
                  />
                ) : null}
              </div>
            </Section>
          ) : null}
        </div>

        {/* ------------------------------------------------------- data, about */}
        <div className="settings-panel nebula-surface">
          <Section icon="folderSync" title={t('settings:sections.data')}>
            <p className="settings-copy">{t('settings:data.privacy')}</p>
            <div className="settings-actions settings-reset">
              <Button size="sm" variant="ghost" icon="download" onClick={exportJson}>
                {t('settings:data.exportJson')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon="download"
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
                variant="ghost"
                icon="download"
                onClick={() =>
                  downloadCsv(
                    tasksToCsv(data.tasks, data.tags),
                    timestampedFilename('tasks', 'csv'),
                  )
                }
              >
                {t('settings:data.exportCsvTasks')}
              </Button>
              <Button size="sm" variant="ghost" icon="upload" onClick={() => void importBackup()}>
                {t('settings:data.import')}
              </Button>
            </div>
            <div className="settings-actions settings-reset">
              <Button
                size="sm"
                variant="danger"
                icon="trash"
                onClick={() => setConfirmation({ kind: 'clear' })}
              >
                {t('settings:data.clear')}
              </Button>
            </div>
          </Section>

          <Section icon="info" title={t('settings:sections.about')}>
            <p className="settings-copy">
              {t('settings:about.version', { version: APP_VERSION })} ·{' '}
              {t('settings:about.license')}
            </p>

            {desktop ? (
              <div className="settings-actions settings-reset" role="status">
                <Button
                  size="sm"
                  variant="ghost"
                  icon="update"
                  onClick={() => void desktop.checkForUpdates()}
                >
                  {t('settings:about.checkUpdates')}
                </Button>
                {update?.type === 'checking' ? (
                  <span className="settings-copy">{t('settings:about.checking')}</span>
                ) : null}
                {update?.type === 'available' ? (
                  <span className="settings-copy">
                    {t('settings:about.updateAvailable', { version: update.version })}
                  </span>
                ) : null}
                {update?.type === 'progress' ? (
                  <span className="settings-copy">
                    {t('settings:about.updateDownloading', { percent: Math.round(update.percent) })}
                  </span>
                ) : null}
                {update?.type === 'not-available' ? (
                  <span className="settings-copy">{t('settings:about.upToDate')}</span>
                ) : null}
                {update?.type === 'error' ? (
                  <span className="settings-copy text-warning">
                    {t('settings:about.updateError')}
                  </span>
                ) : null}
                {update?.type === 'downloaded' ? (
                  <Button size="sm" variant="secondary" onClick={() => desktop.quitAndInstall()}>
                    {t('settings:about.restartNow')}
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="settings-actions settings-reset">
              <Button
                size="sm"
                variant="ghost"
                icon="refresh"
                onClick={() => setConfirmation({ kind: 'reset' })}
              >
                {t('common:actions.reset')}
              </Button>
            </div>
          </Section>
        </div>
      </div>

      <Modal
        open={confirmation !== null}
        onClose={() => setConfirmation(null)}
        title={confirmTexts.title}
        description={confirmTexts.body}
        icon={confirmTexts.icon}
        tone={confirmTexts.tone}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmation(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant={confirmTexts.tone === 'danger' ? 'danger' : 'primary'}
              className={confirmTexts.tone === 'danger' ? 'solid-danger' : undefined}
              onClick={() => void confirm()}
            >
              {confirmTexts.action}
            </Button>
          </>
        }
      />
    </>
  );
}
