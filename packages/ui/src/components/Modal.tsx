import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Icon, type IconName } from '../nebula/Icon.js';
import { IconButton } from './IconButton.js';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  tone?: 'accent' | 'warning' | 'danger';
  children?: ReactNode;
  footer?: ReactNode;
  closeLabel: string;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Nebula dialog (Nebula Hub `operations.css`): dimmed backdrop, `dialog-in` entrance, labelled
 * by its title. Closes on Escape or a backdrop click, traps Tab inside itself, and restores
 * focus to whatever opened it. The in-app shortcuts stay off while it is open (aria-modal).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  tone = 'accent',
  children,
  footer,
  closeLabel,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const restoreFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Focus the first control after the close button, or the panel itself.
    const controls = panel ? [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
    (controls[1] ?? controls[0] ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    // Stop the page behind the dialog from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn('dialog', `tone-${tone}`, className)}
      >
        <div className="dialog-head">
          {icon ? (
            <span className="dialog-icon" aria-hidden="true">
              <Icon name={icon} size={18} />
            </span>
          ) : null}
          <h2 id={titleId}>{title}</h2>
          <IconButton label={closeLabel} icon="close" size="sm" onClick={onClose} />
        </div>
        <div className="dialog-body">
          {description ? <p id={descriptionId}>{description}</p> : null}
          {children}
        </div>
        {footer ? <div className="dialog-actions">{footer}</div> : null}
      </div>
    </div>
  );
}
