import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBridgeNotificationAdapter,
  createWebNotificationAdapter,
  getNotificationAdapter,
  noopNotificationAdapter,
  notify,
  phaseNotificationKeys,
  setNotificationAdapter,
} from './index.js';

beforeEach(() => {
  setNotificationAdapter(noopNotificationAdapter);
});

describe('noop adapter', () => {
  it('reports itself unsupported and swallows every call', async () => {
    expect(noopNotificationAdapter.isSupported()).toBe(false);
    expect(noopNotificationAdapter.getPermission()).toBe('unsupported');
    await expect(noopNotificationAdapter.requestPermission()).resolves.toBe('unsupported');
    await expect(
      noopNotificationAdapter.notify({ title: 't', body: 'b' }),
    ).resolves.toBeUndefined();
  });
});

describe('registry', () => {
  it('routes notify() through whichever adapter is registered', async () => {
    const seen: string[] = [];
    setNotificationAdapter({
      id: 'spy',
      isSupported: () => true,
      getPermission: () => 'granted',
      requestPermission: () => Promise.resolve('granted'),
      notify: (payload) => {
        seen.push(payload.title);
        return Promise.resolve();
      },
    });

    expect(getNotificationAdapter().id).toBe('spy');
    await notify({ title: 'Focus time', body: 'go' });
    expect(seen).toEqual(['Focus time']);
  });

  it('defaults to the noop adapter', () => {
    expect(getNotificationAdapter()).toBe(noopNotificationAdapter);
  });
});

describe('bridge adapter', () => {
  it('forwards straight to the Electron bridge and needs no permission', async () => {
    const bridgeNotify = vi.fn().mockResolvedValue(undefined);
    const adapter = createBridgeNotificationAdapter({ notify: bridgeNotify });

    expect(adapter.id).toBe('electron');
    expect(adapter.isSupported()).toBe(true);
    expect(adapter.getPermission()).toBe('granted');
    await expect(adapter.requestPermission()).resolves.toBe('granted');

    await adapter.notify({ title: 'Break', body: 'stretch' });
    expect(bridgeNotify).toHaveBeenCalledWith({ title: 'Break', body: 'stretch' });
  });
});

describe('web adapter without a DOM', () => {
  it('degrades gracefully when the Notification API is absent', async () => {
    const adapter = createWebNotificationAdapter();
    expect(adapter.id).toBe('web');
    expect(adapter.isSupported()).toBe(false);
    expect(adapter.getPermission()).toBe('unsupported');
    await expect(adapter.requestPermission()).resolves.toBe('unsupported');
    // Must not throw: the caller fires this on every phase change.
    await expect(adapter.notify({ title: 't', body: 'b' })).resolves.toBeUndefined();
  });
});

describe('phaseNotificationKeys', () => {
  it('builds namespaced i18n keys for each phase', () => {
    expect(phaseNotificationKeys('focus')).toEqual({
      title: 'notifications:focus.title',
      body: 'notifications:focus.body',
    });
    expect(phaseNotificationKeys('longBreak').title).toBe('notifications:longBreak.title');
  });
});
