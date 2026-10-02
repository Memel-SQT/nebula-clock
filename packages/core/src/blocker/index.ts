/**
 * Distraction blocker entries, validated in one place for the settings screen, the import and
 * the Electron main process (which writes the sites into the system hosts file, so nothing but a
 * plain hostname may ever reach it).
 */

const HOSTNAME =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/** Windows forbids these in a file name; a process name never contains them. */
// eslint-disable-next-line no-control-regex -- control characters are exactly what it rejects
const APP_NAME = /^[^\\/:*?"<>|\u0000-\u001f]{1,100}$/;

/**
 * `https://www.YouTube.com/watch?v=1` -> `youtube.com`. The scheme, credentials, port, path,
 * query and a leading `www.` are dropped (the blocker adds the `www.` variant itself). Returns
 * null for anything that is not a plain public hostname.
 */
export function normalizeSite(input: string): string | null {
  let host = input.trim().toLowerCase();
  if (!host) return null;
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  host = host.replace(/^[^@/]*@/, '');
  host = host.split(/[/?#]/)[0] ?? '';
  host = host.replace(/:\d+$/, '').replace(/\.$/, '');
  host = host.replace(/^www\./, '');
  return HOSTNAME.test(host) ? host : null;
}

/** An executable name as the process list shows it (`Discord.exe`), or null. */
export function normalizeAppName(input: string): string | null {
  const name = input.trim();
  return APP_NAME.test(name) && name !== '.' && name !== '..' ? name : null;
}

/** Valid, de-duplicated entries of a list, in their original order. */
export function normalizeList(
  values: readonly unknown[],
  normalize: (value: string) => string | null,
  max = 200,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const normalized = normalize(value);
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    result.push(normalized);
    if (result.length >= max) break;
  }
  return result;
}
