import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../lib/cn.js';

const control =
  'w-full rounded border border-border bg-card-alt px-3 text-sm text-text ' +
  'placeholder:text-text-secondary transition-colors duration-fast ease-nebula ' +
  'hover:border-accent/60 focus:border-accent focus-visible:outline-none ' +
  'disabled:opacity-50 disabled:cursor-default';

interface FieldShellProps {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, className, children }: FieldShellProps) {
  return (
    <div className={cn('py-1', className)}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      ) : null}
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-text-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, wrapperClassName, className, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={wrapperClassName}>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(control, 'h-10', className)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface NumberFieldProps extends Omit<TextFieldProps, 'type' | 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  /** Rendered inside the field, e.g. `min`. */
  suffix?: string;
}

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { label, hint, error, wrapperClassName, className, value, onChange, suffix, ...rest },
  ref,
) {
  const id = useId();

  /**
   * The field keeps its own text while it is being edited.
   *
   * A fully controlled numeric input cannot be cleared: an empty string
   * parses to 0, the caller clamps that to its minimum, and the value snaps
   * back before the user can type the number they wanted. Holding the raw
   * text lets the field be emptied, and only real numbers are committed.
   */
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={wrapperClassName}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type="number"
          inputMode="numeric"
          value={draft ?? String(value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            if (text.trim() === '') return;
            const next = Number(text);
            if (Number.isFinite(next)) onChange(next);
          }}
          onBlur={(event) => {
            // Whatever the field is left holding, fall back to the committed
            // value so it never sits empty or half-typed.
            setDraft(null);
            rest.onBlur?.(event);
          }}
          className={cn(control, 'h-10 tabular-nums', suffix && 'pr-12', className)}
          {...rest}
        />
        {suffix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary"
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
});

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, wrapperClassName, className, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={id}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(control, 'min-h-24 resize-y py-2 leading-relaxed', className)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label?: ReactNode;
  hint?: ReactNode;
  wrapperClassName?: string;
  options: readonly { value: string; label: string }[];
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, wrapperClassName, className, options, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} className={wrapperClassName}>
      <select
        ref={ref}
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(control, 'h-10 cursor-pointer appearance-none pr-8', className)}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});
