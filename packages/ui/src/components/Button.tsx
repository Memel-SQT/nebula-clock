import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders before the label; purely decorative, so it is aria-hidden. */
  icon?: ReactNode;
  fullWidth?: boolean;
}

/** Geometry and motion copied from the Nebula desktop app's `.btn` rules. */
const base =
  'inline-flex items-center justify-center gap-2 rounded font-semibold ' +
  'transition-[background,transform,box-shadow,border-color] duration-fast ease-nebula ' +
  'disabled:opacity-60 disabled:cursor-default disabled:transform-none ' +
  'focus-visible:outline-none';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-nebula-gradient text-white shadow-glow ' +
    'hover:bg-nebula-gradient-hover hover:-translate-y-px active:translate-y-0 active:scale-[0.98]',
  secondary: 'bg-card-alt text-text border border-border hover:border-accent active:scale-[0.98]',
  ghost: 'bg-transparent text-text-secondary hover:text-text hover:bg-card-alt',
  danger:
    'bg-transparent text-danger border border-danger/40 hover:bg-danger/10 hover:border-danger',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-[22px] text-sm',
  lg: 'h-12 px-7 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, fullWidth, className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      // Buttons inside forms default to submit, which is rarely what we want.
      type={type ?? 'button'}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="grid shrink-0 place-items-center">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
});
