import { useId, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: ReactNode;
  /** Rendered next to the label, e.g. the current value as a percentage. */
  valueLabel?: ReactNode;
  /** Spoken value, when the raw number would be meaningless. */
  ariaValueText?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A native range input restyled to the Nebula palette. The filled portion is
 * painted with a gradient that follows the accent colour.
 */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  valueLabel,
  ariaValueText,
  disabled,
  className,
}: SliderProps) {
  const id = useId();
  const ratio = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('py-1', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {valueLabel ? (
          <span className="font-mono text-xs tabular-nums text-text-secondary">{valueLabel}</span>
        ) : null}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={ariaValueText}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          'nebula-range h-6 w-full cursor-pointer appearance-none bg-transparent',
          'focus-visible:outline-none disabled:cursor-default disabled:opacity-50',
        )}
        style={{ '--slider-fill': `${ratio}%` } as CSSProperties}
      />
    </div>
  );
}
