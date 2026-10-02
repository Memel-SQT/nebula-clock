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
import { Icon } from '../nebula/Icon.js';

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
    <div className={cn('min-w-0', className)}>
      {label ? (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      ) : null}
      {children}
      {hint && !error ? (
        <small id={`${id}-hint`} className="field-hint">
          {hint}
        </small>
      ) : null}
      {error ? (
        <small id={`${id}-error`} role="alert" className="field-error">
          {error}
        </small>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, hint: ReactNode, error: ReactNode) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

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
        aria-describedby={describedBy(id, hint, error)}
        className={cn('field', className)}
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
  { label, hint, error, wrapperClassName, className, value, onChange, onBlur, suffix, ...rest },
  ref,
) {
  const id = useId();

  /**
   * The field keeps its own text while it is being edited.
   *
   * A fully controlled numeric input cannot be cleared: an empty string parses to 0, the
   * caller clamps that to its minimum, and the value snaps back before the user can type the
   * number they wanted. Holding the raw text lets the field be emptied, and only real numbers
   * are committed.
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
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn('field tabular', suffix && 'pr-12', className)}
          {...rest}
          value={draft ?? String(value)}
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            if (text.trim() === '') return;
            const next = Number(text);
            if (Number.isFinite(next)) onChange(next);
          }}
          onBlur={(event) => {
            // Whatever the field is left holding, fall back to the committed value so it never
            // sits empty, half-typed or outside the bounds the caller clamped to.
            setDraft(null);
            onBlur?.(event);
          }}
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

export interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'value' | 'onChange'
> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
  /** One entry per line. */
  lines: readonly string[];
  /** Called on blur with the non-empty, trimmed lines. */
  onCommit: (lines: string[]) => void;
}

/**
 * A list edited as text, one entry per line. It keeps its own text while focused and commits
 * on blur: filtering empty lines on every keystroke made it impossible to start a new line.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, wrapperClassName, className, lines, onCommit, onBlur, ...rest },
  ref,
) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={id}
        aria-describedby={describedBy(id, hint, error)}
        className={cn('field', className)}
        {...rest}
        value={draft ?? lines.join('\n')}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          if (draft !== null) {
            onCommit(
              draft
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            );
          }
          setDraft(null);
          onBlur?.(event);
        }}
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
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={cn('field', className)}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevronDown"
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
      </div>
    </FieldShell>
  );
});
