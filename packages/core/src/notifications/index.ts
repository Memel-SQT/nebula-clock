/**
 * One notification interface for both surfaces.
 *
 * The web app registers the `Notification`-API adapter; the Electron
 * renderer registers a bridge adapter that forwards to the main process so
 * notifications come from the real app identity (and respect Do Not
 * Disturb). Callers only ever see `notify()`.
 */
import type { Phase } from '../types.js';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NotificationPayload {
  title: string;
  body: string;
  /** Collapses repeat notifications instead of stacking them. */
  tag?: string;
  silent?: boolean;
}

export interface NotificationAdapter {
  readonly id: string;
  isSupported(): boolean;
  getPermission(): NotificationPermissionState;
  requestPermission(): Promise<NotificationPermissionState>;
  notify(payload: NotificationPayload): Promise<void>;
}

/** Used in tests, in SSR, and whenever the platform has no notifications. */
export const noopNotificationAdapter: NotificationAdapter = {
  id: 'noop',
  isSupported: () => false,
  getPermission: () => 'unsupported',
  requestPermission: () => Promise.resolve('unsupported'),
  notify: () => Promise.resolve(),
};

/** Browser `Notification` API. */
export function createWebNotificationAdapter(): NotificationAdapter {
  const supported = () => typeof window !== 'undefined' && 'Notification' in window;

  return {
    id: 'web',
    isSupported: supported,
    getPermission: () => (supported() ? Notification.permission : 'unsupported'),
    async requestPermission() {
      if (!supported()) return 'unsupported';
      if (Notification.permission !== 'default') return Notification.permission;
      return Notification.requestPermission();
    },
    async notify(payload) {
      if (!supported() || Notification.permission !== 'granted') return;
      // A registered service worker gives notifications that survive the tab
      // being backgrounded on mobile; fall back to the constructor otherwise.
      const registration = await navigator.serviceWorker?.getRegistration();
      const options: NotificationOptions = {
        body: payload.body,
        tag: payload.tag ?? 'nebula-clock',
        icon: '/icon-192.png',
        badge: '/icon-64.png',
        silent: payload.silent ?? false,
      };
      if (registration) {
        await registration.showNotification(payload.title, options);
      } else {
        new Notification(payload.title, options);
      }
    },
  };
}

/** Shape the Electron preload exposes on `window`. */
export interface NotificationBridge {
  notify(payload: NotificationPayload): Promise<void>;
}

export function createBridgeNotificationAdapter(bridge: NotificationBridge): NotificationAdapter {
  return {
    id: 'electron',
    isSupported: () => true,
    // The main process asks the OS; Electron apps do not need a prompt.
    getPermission: () => 'granted',
    requestPermission: () => Promise.resolve('granted'),
    notify: (payload) => bridge.notify(payload),
  };
}

let active: NotificationAdapter = noopNotificationAdapter;

export function setNotificationAdapter(adapter: NotificationAdapter): void {
  active = adapter;
}

export function getNotificationAdapter(): NotificationAdapter {
  return active;
}

export async function notify(payload: NotificationPayload): Promise<void> {
  await active.notify(payload);
}

/** i18n keys for the notification fired when a phase begins. */
export function phaseNotificationKeys(phase: Phase): { title: string; body: string } {
  return {
    title: `notifications:${phase}.title`,
    body: `notifications:${phase}.body`,
  };
}
