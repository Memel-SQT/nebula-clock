import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';
import { Icon, type IconName } from '../nebula/Icon.js';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon-only control has no visible text to name it. */
  label: string;
  icon: IconName;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'quiet' | 'secondary' | 'primary';
  /** Renders the pressed state of a toggle button. */
  active?: boolean;
  sound?: 'tap' | 'nav' | 'toggle' | 'none';
}

const SIZES = { sm: 'small', md: undefined, lg: 'large' } as const;
const ICON_SIZES = { sm: 15, md: 18, lg: 20 } as const;
const VARIANTS = {
  ghost: 'ghost',
  quiet: 'ghost quiet',
  secondary: 'secondary',
  primary: undefined,
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, size = 'md', variant = 'quiet', active, sound, className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      aria-pressed={active}
      data-sound={sound}
      className={cn(
        'btn icon-button',
        VARIANTS[variant],
        SIZES[size],
        active && variant !== 'primary' && 'pressed',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZES[size]} />
    </button>
  );
});
