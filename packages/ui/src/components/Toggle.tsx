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
 * The Nebula switch (`controls.css` `.switch`, as in Nebula Hub's settings): a real
 * `role="switch"` button, so it is reachable and operable by keyboard and announced with its
 * state. The description sits under it and is linked by `aria-describedby`.
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
    <div className={cn('toggle-row', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        data-sound="toggle"
        className={cn('btn switch', checked && 'on')}
        onClick={() => onChange(!checked)}
      >
        <i aria-hidden="true" />
        <span>{label}</span>
      </button>
      {description ? (
        <small id={descriptionId} className="switch-hint">
          {description}
        </small>
      ) : null}
    </div>
  );
}
