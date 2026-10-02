import { useId, type ReactNode } from 'react';
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

/** A native range input in the accent colour (Nebula Hub `.range-field`). */
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
  return (
    <div className={cn('slider', className)}>
      <div className="slider-head">
        <label htmlFor={id}>{label}</label>
        {valueLabel !== undefined ? <b>{valueLabel}</b> : null}
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
        className="nebula-range"
      />
    </div>
  );
}
