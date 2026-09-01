import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon-only control has no visible text to name it. */
  label: string;
  icon: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'solid' | 'accent';
  /** Renders the pressed state of a toggle button. */
  active?: boolean;
}

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

const variants = {
  ghost: 'bg-transparent text-text-secondary hover:text-text hover:bg-card-alt',
  solid: 'bg-card-alt text-text border border-border hover:border-accent',
  accent: 'bg-nebula-gradient text-white shadow-glow hover:bg-nebula-gradient-hover',
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, size = 'md', variant = 'ghost', active, className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'inline-grid place-items-center rounded transition-colors duration-fast ease-nebula',
        'disabled:opacity-50 disabled:cursor-default',
        sizes[size],
        variants[variant],
        active && variant !== 'accent' && 'text-accent shadow-ring-soft',
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="grid place-items-center">
        {icon}
      </span>
    </button>
  );
});
