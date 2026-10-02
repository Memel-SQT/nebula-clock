import { useRef } from 'react';
import { cn } from '../lib/cn.js';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Overrides the accessible name when the label is an abbreviation. */
  ariaLabel?: string;
  /** `lang` of the label (a language picker names each language in itself). */
  lang?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  /** Names the group for assistive technology (or use `labelledBy`). */
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * The Nebula segmented control (`controls.css` `.segmented`), as a radio group: one tab stop for
 * the whole group, and the arrow keys move both the selection and the focus.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  labelledBy,
  disabled,
  className,
}: SegmentedControlProps<T>) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  // A value matching no option still leaves one option reachable by Tab.
  const focusable = options.some((option) => option.value === value) ? value : options[0]?.value;

  const move = (delta: number) => {
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + delta + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    // Focus has to follow the selection, otherwise it is left on a button that just dropped
    // out of the tab order.
    buttons.current.get(next.value)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-disabled={disabled || undefined}
      className={cn('segmented', className)}
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
            lang={option.lang}
            disabled={disabled}
            data-sound="toggle"
            tabIndex={option.value === focusable ? 0 : -1}
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
            className={cn('btn', selected && 'active')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
