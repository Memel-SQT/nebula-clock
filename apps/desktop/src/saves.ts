/**
 * Sealed saves (Nebula Hub ADR-040, NEBULA_LINK.md § 19): the JSON backup the desktop app exports
 * is encrypted with the Nebula family's save key, which Windows protects for this account. The
 * renderer hands the text over and gets the sealed bytes back; an import is opened here. Older
 * plain backups stay importable, and the ones left in the Downloads folder are sealed in place at
 * startup. A test-mode Hub (`NEBULA_LINK_SESSION_FILE`) gets a key file next to its session file.
 */
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  defaultSaveKeyFile,
  importRecoveryCode,
  isSealedSave,
  loadSaveKeyring,
  openSave,
  recoveryCode,
  sealFileInPlace,
  sealSave,
  type SaveKeyring,
} from '@nebula/link';
import { isBackupFileName } from '@nebula-clock/core';

export const SAVE_APP_ID = 'nebula.clock';
/** Far above any real backup; the renderer's bytes are refused beyond it. */
export const MAX_SAVE_BYTES = 50 * 1024 * 1024;

export type OpenedSave =
  | { ok: true; text: string }
  | { ok: false; reason: 'sealedElsewhere' | 'damaged' | 'notNebulaClock' };

export function saveKeyFile(env: NodeJS.ProcessEnv): string {
  return env.NEBULA_LINK_SESSION_FILE
    ? join(dirname(env.NEBULA_LINK_SESSION_FILE), 'save-key.json')
    : defaultSaveKeyFile();
}

let keyring: Promise<SaveKeyring> | null = null;

function ring(): Promise<SaveKeyring> {
  keyring ??= loadSaveKeyring({ file: saveKeyFile(process.env) }).catch((error: unknown) => {
    keyring = null;
    throw error;
  });
  return keyring;
}

/** The sealed bytes of an export (throws when the key cannot be used: nothing is saved then). */
export async function sealExport(text: string): Promise<Uint8Array> {
  return sealSave(Buffer.from(text, 'utf8'), await ring(), { app: SAVE_APP_ID, kind: 'export' });
}

/** The text of a backup to import: sealed by Nebula Clock, or an older plain one. */
export async function openBackup(bytes: Uint8Array): Promise<OpenedSave> {
  const buffer = Buffer.from(bytes);
  if (!isSealedSave(buffer)) return { ok: true, text: buffer.toString('utf8') };
  try {
    const { meta, plain } = openSave(buffer, await ring());
    // Another family app's save is not a Nebula Clock backup, even with the right key.
    if (meta.app !== SAVE_APP_ID) return { ok: false, reason: 'notNebulaClock' };
    return { ok: true, text: plain.toString('utf8') };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error && error.message === 'ERR_SAVE_KEY_UNKNOWN'
          ? 'sealedElsewhere'
          : 'damaged',
    };
  }
}

export async function saveRecoveryCode(): Promise<string> {
  return recoveryCode(await ring());
}

export async function addSaveRecoveryCode(code: string): Promise<boolean> {
  const added = await importRecoveryCode(code, { file: saveKeyFile(process.env) });
  if (added) keyring = null;
  return added;
}

/**
 * Retroactive: the plain Nebula Clock backups of a folder (by name, then by content) are sealed
 * where they are, keeping their date. Returns how many; never throws.
 */
export async function sealOldBackups(directory: string): Promise<number> {
  let names: string[];
  try {
    names = (await fs.readdir(directory)).filter(isBackupFileName);
  } catch {
    return 0;
  }
  let sealed = 0;
  for (const name of names) {
    const file = join(directory, name);
    try {
      const bytes = await fs.readFile(file);
      if (isSealedSave(bytes) || bytes.length > MAX_SAVE_BYTES) continue;
      const parsed = JSON.parse(bytes.toString('utf8')) as { format?: unknown };
      if (parsed?.format !== 'nebula-clock') continue;
      if (sealFileInPlace(file, await ring(), { app: SAVE_APP_ID, kind: 'export' })) sealed += 1;
    } catch {
      // Not a backup, or not readable: left as it is.
    }
  }
  return sealed;
}
