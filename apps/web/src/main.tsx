import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBridgeNotificationAdapter,
  createWebNotificationAdapter,
  setNotificationAdapter,
} from '@nebula-clock/core';
import { App } from './App.js';
import { MiniApp } from './MiniApp.js';
import { initI18n } from './lib/i18n.js';
import { getDesktop, isMiniWindow } from './lib/platform.js';
import { useDataStore } from './store/dataStore.js';
import { useSettingsStore } from './store/settingsStore.js';
import './styles/index.css';

/**
 * Boot order matters: translations and the notification adapter must be in
 * place before the first render, otherwise the UI flashes raw i18n keys and
 * an early phase change would be announced through the wrong channel.
 */
async function bootstrap(): Promise<void> {
  const settings = useSettingsStore.getState().settings;
  await initI18n(settings.language);

  // One notification interface, two implementations: the OS via Electron,
  // or the browser's Notification API.
  const desktop = getDesktop();
  setNotificationAdapter(
    desktop ? createBridgeNotificationAdapter(desktop) : createWebNotificationAdapter(),
  );

  // Load persisted data before mounting so the first paint is not empty.
  await useDataStore.getState().load();

  const container = document.getElementById('root');
  if (!container) throw new Error('Root container missing from index.html');

  // The Electron mini window shares this bundle but must not start a second
  // timer; it gets a root that only mirrors the main window.
  const Root = isMiniWindow() ? MiniApp : App;

  createRoot(container).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}

void bootstrap();
