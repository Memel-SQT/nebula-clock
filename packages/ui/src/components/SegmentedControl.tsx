import { useRef } from 'react';
import { cn } from '../lib/cn.js';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Overrides the accessible name when the label is an abbreviation. */
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  /** Names the group for assistive technology. */
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * A radio group styled as a pill switcher (theme, stats range, task filter).
 * Follows the ARIA radiogroup pattern: one tab stop for the whole group, and
 * arrow keys move both the selection and the focus.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const move = (delta: number) => {
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + delta + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    // Focus has to follow the selection, otherwise it is left on a button
    // that just dropped out of the tab order.
    buttons.current.get(next.value)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border border-border bg-card-alt p-1',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              if (element) buttons.current.set(option.value, element);
              else buttons.current.delete(option.value);
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            // Only the active option stays in the tab order; arrow keys move
            // within the group, which is the expected radio behaviour.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              switch (event.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                  event.preventDefault();
                  move(1);
                  break;
                case 'ArrowLeft':
                case 'ArrowUp':
                  event.preventDefault();
                  move(-1);
                  break;
                default:
                  break;
              }
            }}
            className={cn(
              'rounded-pill font-medium transition-colors duration-fast ease-nebula',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
              selected
                ? 'bg-nebula-gradient text-white shadow-glow'
                : 'text-text-secondary hover:text-text',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
