/**
 * `@nebula-clock/ui` - the Nebula design system for Nebula Clock.
 *
 * Import `@nebula-clock/ui/tokens.css` once before Tailwind, `@nebula-clock/ui/styles.css` once
 * after the app stylesheet, and extend `@nebula-clock/ui/tailwind-preset` in the Tailwind config.
 */
export { cn } from './lib/cn.js';
export { nebulaPreset } from './tokens/tailwind-preset.js';
export { nebulaTokens, themeColors, THEME_CHROME, type ThemeName } from './tokens/tokens.js';

// Ported from Nebula Hub (`@nebula/design`).
export { Icon, ICON_NAMES, type IconName } from './nebula/Icon.js';
export { BackgroundFx, backgroundFrameCount } from './nebula/BackgroundFx.js';
export { useInterfaceEffects, spawnRipple } from './nebula/effects.js';
export {
  configureSounds,
  playSound,
  setSoundsSuppressed,
  SOUND_NAMES,
  type SoundName,
} from './nebula/sound.js';
export {
  Splash,
  SPLASH_DURATION_MS,
  SPLASH_DURATION_REDUCED_MS,
  SPLASH_FADE_MS,
} from './nebula/Splash.js';

export {
  Button,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './components/Button.js';
export { IconButton, type IconButtonProps } from './components/IconButton.js';
export { Card, type CardProps } from './components/Card.js';
export { Chip, type ChipProps } from './components/Chip.js';
export { EmptyState, type EmptyStateProps } from './components/EmptyState.js';
export { Logo, type LogoProps } from './components/Logo.js';
export { Modal, type ModalProps } from './components/Modal.js';
export { PageHeader, type PageHeaderProps } from './components/PageHeader.js';
export { ProgressBar, type ProgressBarProps } from './components/ProgressBar.js';
export { ProgressRing, type ProgressRingProps } from './components/ProgressRing.js';
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
} from './components/SegmentedControl.js';
export { Slider, type SliderProps } from './components/Slider.js';
export { Stat, type StatProps } from './components/Stat.js';
export { Toggle, type ToggleProps } from './components/Toggle.js';
export { LiveRegion, VisuallyHidden, type LiveRegionProps } from './components/VisuallyHidden.js';
export {
  NumberField,
  SelectField,
  TextArea,
  TextField,
  type NumberFieldProps,
  type SelectFieldProps,
  type TextAreaProps,
  type TextFieldProps,
} from './components/Field.js';
