/**
 * Saving a generated file to disk.
 *
 * Everything the app exports is produced in the browser and handed straight
 * to the user - there is no upload step anywhere in this codebase.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string, type: string): void {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename);
}

export function downloadJson(text: string, filename: string): void {
  downloadText(text, filename, 'application/json');
}

export function downloadCsv(text: string, filename: string): void {
  // The BOM keeps Excel from mangling accented characters in the French export.
  downloadBlob(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }), filename);
}

/** `nebula-clock-sessions-2026-09-01.csv` */
export function timestampedFilename(prefix: string, extension: string): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    `${now.getMonth() + 1}`.padStart(2, '0'),
    `${now.getDate()}`.padStart(2, '0'),
  ].join('-');
  return `nebula-clock-${prefix}-${stamp}.${extension}`;
}

/** Prompt for a file and resolve with its text contents. */
export function pickTextFile(accept: string): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file
        .text()
        .then((text) => resolve({ name: file.name, text }))
        .catch(() => resolve(null));
    });
    // Safari needs the input in the document for the change event to fire.
    input.style.display = 'none';
    document.body.append(input);
    input.click();
    setTimeout(() => input.remove(), 0);
  });
}

/** Prompt for a file and resolve with a data URL (used for custom sounds). */
export function pickDataUrl(accept: string): Promise<{ name: string; dataUrl: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        // readAsDataURL always yields a string, but the union also allows
        // ArrayBuffer; treat anything else as a failed read.
        const result = reader.result;
        resolve(typeof result === 'string' ? { name: file.name, dataUrl: result } : null);
      });
      reader.addEventListener('error', () => resolve(null));
      reader.readAsDataURL(file);
    });
    input.style.display = 'none';
    document.body.append(input);
    input.click();
    setTimeout(() => input.remove(), 0);
  });
}
