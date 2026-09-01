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
 * Uses `role="radiogroup"` so arrow keys and the selected state are announced.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
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
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            // Only the active option stays in the tab order; arrow keys move
            // within the group, which is the expected radio behaviour.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
              event.preventDefault();
              const index = options.findIndex((o) => o.value === value);
              const delta = event.key === 'ArrowRight' ? 1 : -1;
              const next = options[(index + delta + options.length) % options.length];
              if (next) onChange(next.value);
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
