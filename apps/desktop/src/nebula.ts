/**
 * Nebula Hub integration through Nebula Link (optional).
 *
 * Without the Hub the SDK stays offline without error and Nebula Clock works exactly as before.
 * With it, and only public data: the "Today's focus" widget, the start of each break (so the Hub
 * can offer the briefing of Nebula News during a long one), the timer's notifications in the Hub's
 * activity center. Received: the Nebula appearance (applied by the renderer if the user follows
 * it), the Hub's presence (updates handled by the Hub, on the user's choice), the Hub mode
 * placement, and intents (open the app, start the timer).
 */
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { NebulaLink, type Intent } from '@nebula/link';
import {
  breakStarted,
  focusTodayWidget,
  type FocusTodayPublication,
  type PhaseState,
} from '@nebula-clock/core';

export interface NebulaState {
  connected: boolean;
  hubVersion: string | null;
  updatesByHub: boolean;
}

export interface NebulaDeps {
  appVersion: string;
  manifestPath: string;
  settingsPath: string;
  /** To the main window (appearance, state). */
  send(channel: string, payload: unknown): void;
  focus(): void;
  startTimer(): void;
  onDock(payload: unknown): void;
  /** The Hub now handles the updates, or not anymore. */
  onUpdatesDeferred(deferred: boolean): void;
}

export class NebulaIntegration {
  readonly link: NebulaLink;
  private hub: { hubVersion: string; managesUpdates: boolean } | null = null;
  private updatesByHub = false;
  private focusToday: FocusTodayPublication | null = null;
  private lastPhase: PhaseState | null = null;
  private stopDock: (() => void) | null = null;

  constructor(private readonly deps: NebulaDeps) {
    // NEBULA_LINK_SESSION_FILE points a manual test at a test-mode Hub; never set when installed.
    this.link = NebulaLink.create({
      appId: 'nebula.clock',
      appVersion: deps.appVersion,
      manifestPath: deps.manifestPath,
      sessionFile: process.env.NEBULA_LINK_SESSION_FILE || undefined,
    });
  }

  async start(): Promise<void> {
    await this.loadSettings();
    this.link.on('nebula.appearance.changed', (appearance) =>
      this.deps.send('nebula:appearance', appearance),
    );
    this.link.on('nebula.hub.present', (presence) => {
      const value = presence as { hubVersion?: unknown; managesUpdates?: unknown };
      this.hub = {
        hubVersion: typeof value.hubVersion === 'string' ? value.hubVersion : '',
        managesUpdates: value.managesUpdates === true,
      };
      this.changed();
    });
    this.resumeDock();
    this.link.onStatus((status) => {
      if (status === 'offline') {
        this.hub = null;
        // Never stay frameless and placed for a Hub that is gone.
        this.deps.onDock({ state: 'released' });
      }
      this.changed();
    });
    this.link.onIntent((intent) => this.route(intent));
    this.link.provide('clock.focus.today', () => focusTodayWidget(this.focusToday, new Date()));
    await this.link.connect();
  }

  dispose(): void {
    this.link.dispose();
  }

  state(): NebulaState {
    return {
      connected: this.link.status === 'connected' && this.hub !== null,
      hubVersion: this.hub?.hubVersion ?? null,
      updatesByHub: this.updatesByHub,
    };
  }

  hubHandlesUpdates(): boolean {
    return this.updatesByHub && this.hub !== null && this.hub.managesUpdates;
  }

  async setUpdatesByHub(enabled: boolean): Promise<NebulaState> {
    this.updatesByHub = enabled === true;
    await this.saveSettings();
    this.changed();
    return this.state();
  }

  /** The renderer's figures for the widget (it owns the sessions and the translations). */
  publishFocus(focus: FocusTodayPublication): void {
    this.focusToday = focus;
  }

  /** Every timer snapshot: a break that just started is announced to the Hub. */
  publishPhase(state: PhaseState): void {
    const started = breakStarted(this.lastPhase, state);
    this.lastPhase = { ...state };
    if (started) this.link.emit('clock.break.started', started);
  }

  /** The timer's notifications also reach the Hub's activity center (public, no detail). */
  notify(title: string, body: string): void {
    void this.link.notify({
      title: title.slice(0, 80),
      body: body.slice(0, 300),
      sensitivity: 'public',
      deepLink: 'nebula://clock/',
      category: 'timer',
    });
  }

  routeArgv(argv: readonly string[]): boolean {
    const intent = NebulaLink.intentFromArgv(argv, this.link.manifest);
    if (!intent) return false;
    this.route(intent);
    return true;
  }

  route(intent: Intent): void {
    this.deps.focus();
    if (intent.path === '/start') this.deps.startTimer();
  }

  /** "Detach" in the app: stop listening (the Hub forgets the app), listen again later. */
  pauseDock(): void {
    this.stopDock?.();
    this.stopDock = null;
  }

  resumeDock(): void {
    if (!this.stopDock) {
      this.stopDock = this.link.on('nebula.hub.dock', (payload) => this.deps.onDock(payload));
    }
  }

  private changed(): void {
    this.deps.send('nebula:state', this.state());
    this.deps.onUpdatesDeferred(this.hubHandlesUpdates());
  }

  private async loadSettings(): Promise<void> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.deps.settingsPath, 'utf8')) as {
        updatesByHub?: unknown;
      };
      this.updatesByHub = parsed.updatesByHub === true;
    } catch {
      this.updatesByHub = false;
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await fs.mkdir(dirname(this.deps.settingsPath), { recursive: true });
      await fs.writeFile(
        this.deps.settingsPath,
        JSON.stringify({ updatesByHub: this.updatesByHub }, null, 2),
      );
    } catch {
      // A preference that cannot be saved never breaks the app.
    }
  }
}
