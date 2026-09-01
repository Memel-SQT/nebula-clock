/**
 * Optional distraction blocking during focus phases.
 *
 * Two independent mechanisms, both strictly opt-in:
 *
 *  - **Websites** are blocked by pointing them at 127.0.0.1 in the system
 *    hosts file, inside a clearly delimited block this app owns. That file is
 *    only writable with administrator rights, so the call reports back
 *    `{ ok: false, reason: 'permission' }` rather than failing silently, and
 *    the UI surfaces that to the user.
 *  - **Applications** cannot be killed without being hostile, so instead the
 *    process list is polled and the user is *notified* when something on
 *    their own block list is running. Nothing is ever terminated.
 *
 * Everything written here is reverted when focus ends or the app exits.
 */
import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { promisify } from 'node:util';
import type { BlockerConfig } from './ipc.js';

const execFileAsync = promisify(execFile);

const BEGIN = '# >>> nebula-clock begin >>>';
const END = '# <<< nebula-clock end <<<';

/** How often the process watcher looks for blocked applications. */
const APP_POLL_MS = 15_000;

function hostsPath(): string {
  return process.platform === 'win32' ? 'C:\\Windows\\System32\\drivers\\etc\\hosts' : '/etc/hosts';
}

/** Drop any block this app previously wrote, leaving the rest untouched. */
function stripOwnBlock(contents: string): string {
  const begin = contents.indexOf(BEGIN);
  const end = contents.indexOf(END);
  if (begin === -1 || end === -1 || end < begin) return contents;
  return `${contents.slice(0, begin)}${contents.slice(end + END.length)}`.replace(
    /\n{3,}/g,
    '\n\n',
  );
}

export interface BlockerResult {
  ok: boolean;
  reason?: string;
}

let watcher: NodeJS.Timeout | null = null;
let hostsWritten = false;

/**
 * Rewrite the hosts file so `sites` resolve nowhere.
 *
 * `whitelist` mode is deliberately *not* implemented as "block the whole
 * internet except these": redirecting every domain would break the machine.
 * In that mode only the explicitly listed sites are left alone and nothing is
 * added, which is reported honestly to the caller.
 */
function applyHosts(config: BlockerConfig): BlockerResult {
  const path = hostsPath();

  let current: string;
  try {
    current = readFileSync(path, 'utf8');
  } catch {
    return { ok: false, reason: 'unreadable' };
  }

  const cleaned = stripOwnBlock(current);
  const shouldBlock = config.enabled && config.active && config.mode === 'blacklist';

  let next = cleaned;
  if (shouldBlock && config.sites.length > 0) {
    const lines = config.sites
      .flatMap((site) => [`127.0.0.1 ${site}`, `127.0.0.1 www.${site}`, `::1 ${site}`])
      .join('\n');
    next = `${cleaned.trimEnd()}\n\n${BEGIN}\n${lines}\n${END}\n`;
  }

  if (next === current) return { ok: true };

  try {
    writeFileSync(path, next, 'utf8');
    hostsWritten = shouldBlock;
    return { ok: true };
  } catch {
    // Almost always EACCES: the app is not running elevated.
    return { ok: false, reason: 'permission' };
  }
}

/** Names of the processes currently running, lower-cased. */
async function runningProcesses(): Promise<string[]> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execFileAsync('tasklist', ['/fo', 'csv', '/nh'], {
        windowsHide: true,
      });
      return stdout
        .split('\n')
        .map((line) => line.split('","')[0]?.replace(/^"/, '').trim().toLowerCase() ?? '')
        .filter(Boolean);
    }
    const { stdout } = await execFileAsync('ps', ['-Ao', 'comm=']);
    return stdout
      .split('\n')
      .map((line) => line.trim().split('/').pop()?.toLowerCase() ?? '')
      .filter(Boolean);
  } catch {
    return [];
  }
}

export interface BlockerCallbacks {
  /** Called with the name of a blocked app that is currently running. */
  onBlockedApp: (name: string) => void;
}

function stopWatcher(): void {
  if (watcher) clearInterval(watcher);
  watcher = null;
}

function startWatcher(config: BlockerConfig, callbacks: BlockerCallbacks): void {
  stopWatcher();
  if (config.apps.length === 0) return;

  const wanted = config.apps.map((name) => name.toLowerCase());
  const alreadyReported = new Set<string>();

  const check = () => {
    void runningProcesses().then((running) => {
      for (const name of wanted) {
        const isRunning = running.includes(name);
        // Only a block list produces warnings; an allow list says nothing
        // about the apps it does not mention.
        const shouldWarn = config.mode === 'blacklist' && isRunning;
        if (shouldWarn && !alreadyReported.has(name)) {
          alreadyReported.add(name);
          callbacks.onBlockedApp(name);
        }
        if (!isRunning) alreadyReported.delete(name);
      }
    });
  };

  check();
  watcher = setInterval(check, APP_POLL_MS);
}

/** Reconcile the whole blocker with the config the renderer just sent. */
export function applyBlocker(config: BlockerConfig, callbacks: BlockerCallbacks): BlockerResult {
  if (!config.enabled || !config.active) {
    stopWatcher();
    return config.sites.length > 0 || hostsWritten ? applyHosts(config) : { ok: true };
  }

  startWatcher(config, callbacks);

  if (config.mode === 'whitelist') {
    // See the note on applyHosts: an allow-list of hostnames cannot be
    // enforced through the hosts file without breaking everything else.
    return { ok: true, reason: 'whitelist-sites-not-enforced' };
  }

  // `hostsWritten` matters as much as the current list: emptying the sites
  // mid-focus has to clear the block that is already in the file.
  return config.sites.length > 0 || hostsWritten ? applyHosts(config) : { ok: true };
}

/** Always call this on quit so a crash never leaves the hosts file edited. */
export function teardownBlocker(): void {
  stopWatcher();
  if (!hostsWritten) return;
  applyHosts({ enabled: false, mode: 'blacklist', sites: [], apps: [], active: false });
  hostsWritten = false;
}
