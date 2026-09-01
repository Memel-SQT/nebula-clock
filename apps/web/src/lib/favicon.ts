/**
 * Dynamic favicon.
 *
 * The tab icon becomes a progress ring in the phase colour, so a backgrounded
 * tab still shows how far the current phase has got. Drawn on a canvas from
 * the Nebula tokens rather than shipping one icon per state.
 */
import { nebulaTokens } from '@nebula-clock/ui';
import type { Phase } from '@nebula-clock/core';

const SIZE = 64;

const PHASE_COLORS: Record<Phase, [string, string]> = {
  focus: [nebulaTokens.brand.blue, nebulaTokens.brand.violet],
  shortBreak: [nebulaTokens.brand.success, '#2DD4BF'],
  longBreak: [nebulaTokens.brand.warning, '#F97316'],
};

let link: HTMLLinkElement | null = null;
let canvas: HTMLCanvasElement | null = null;
/** Avoids repainting the canvas 60 times a second for the same visual state. */
let lastKey = '';

function faviconLink(): HTMLLinkElement {
  if (link?.isConnected) return link;
  const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-dynamic]');
  if (existing) {
    link = existing;
    return link;
  }
  link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.dataset.dynamic = 'true';
  document.head.append(link);
  return link;
}

/**
 * Repaint the tab icon. `progress` is 0..1; `idle` dims the ring so a paused
 * or unstarted timer is visually distinct from a running one.
 */
export function updateFavicon(phase: Phase, progress: number, idle: boolean): void {
  if (typeof document === 'undefined') return;

  // One repaint per whole percent is imperceptibly smooth and cheap.
  const key = `${phase}:${Math.round(progress * 100)}:${idle ? 'i' : 'r'}`;
  if (key === lastKey) return;
  lastKey = key;

  canvas ??= document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const [from, to] = PHASE_COLORS[phase];
  const center = SIZE / 2;
  const radius = center - 7;

  ctx.clearRect(0, 0, SIZE, SIZE);

  // Rounded Nebula card as the backdrop, so the icon reads at 16px.
  ctx.fillStyle = nebulaTokens.dark.card;
  ctx.beginPath();
  ctx.roundRect(0, 0, SIZE, SIZE, 15);
  ctx.fill();

  ctx.lineWidth = 9;
  ctx.lineCap = 'round';

  ctx.strokeStyle = nebulaTokens.dark.cardAlt;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();

  const clamped = Math.min(1, Math.max(0, progress));
  if (clamped > 0) {
    const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    ctx.strokeStyle = gradient;
    ctx.globalAlpha = idle ? 0.45 : 1;
    ctx.beginPath();
    ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + clamped * Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  faviconLink().href = canvas.toDataURL('image/png');
}

/** Put the static mark back, e.g. when the timer is reset to idle. */
export function resetFavicon(): void {
  lastKey = '';
  const element = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-dynamic]');
  element?.remove();
  link = null;
}
