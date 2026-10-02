import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';
import { Icon, type IconName } from '../nebula/Icon.js';

/**
 * `primary` is the gradient button: one per screen, or it means nothing. `secondary` and
 * `ghost` are the quieter Nebula Hub buttons (border turning to the accent on hover), `quiet`
 * has no border at all, `danger` is a ghost in the danger colour.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** A Nebula icon before the label (decorative: the label names the button). */
  icon?: IconName;
  fullWidth?: boolean;
  /** Interface sound on click (`effects.ts`); `none` when the action plays its own. */
  sound?: 'tap' | 'nav' | 'toggle' | 'none';
}

const VARIANTS: Record<ButtonVariant, string | undefined> = {
  primary: undefined,
  secondary: 'secondary',
  ghost: 'ghost',
  quiet: 'ghost quiet',
  danger: 'ghost danger',
};

const SIZES: Record<ButtonSize, string | undefined> = { sm: 'small', md: undefined, lg: 'large' };
const ICON_SIZES: Record<ButtonSize, number> = { sm: 15, md: 16, lg: 18 };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    fullWidth,
    sound,
    className,
    children,
    type,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      // Buttons inside forms default to submit, which is rarely what we want.
      type={type ?? 'button'}
      data-sound={sound}
      className={cn('btn', VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {icon ? <Icon name={icon} size={ICON_SIZES[size]} /> : null}
      {children}
    </button>
  );
});
