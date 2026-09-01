import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * A labelled switch built on a real checkbox input, so it is reachable and
 * operable by keyboard and announced with its state for free.
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: ToggleProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className={cn('flex items-start justify-between gap-4 py-1', className)}>
      <div className="min-w-0">
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium',
            disabled ? 'text-text-secondary' : 'cursor-pointer text-text',
          )}
        >
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="mt-0.5 text-xs text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>

      <span className="relative inline-flex shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={descriptionId}
          onChange={(event) => onChange(event.target.checked)}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
        />
        <span
          aria-hidden="true"
          className={cn(
            'block h-6 w-11 rounded-pill border transition-colors duration-fast ease-nebula',
            'peer-focus-visible:shadow-focus',
            checked ? 'border-transparent bg-nebula-gradient' : 'border-border bg-card-alt',
            disabled && 'opacity-50',
          )}
        >
          <span
            className={cn(
              'mt-[3px] block h-[18px] w-[18px] rounded-pill bg-white shadow-sm',
              'transition-transform duration-fast ease-nebula',
              checked ? 'translate-x-[23px]' : 'translate-x-[3px]',
            )}
          />
        </span>
      </span>
    </div>
  );
}
