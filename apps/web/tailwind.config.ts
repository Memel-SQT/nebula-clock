import type { Config } from 'tailwindcss';
import { nebulaPreset } from '@nebula-clock/ui/tailwind-preset';

export default {
  presets: [nebulaPreset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // The design system ships as source, so its classes must be scanned too.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
