import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import { noDrag } from '@renderer/lib/window-region';
import { useTranslation } from '@renderer/i18n';

type ModalProps = {
  title: string;
  subtitle?: string;
  /** Panel classes, mainly its width. */
  className?: string;
  /**
   * Wraps children in a focusable scroll area so the keyboard can scroll a
   * long dialog. Leave off when the body is a form that focuses its own field.
   */
  scrollableBody?: boolean;
  bodyClassName?: string;
  onClose: () => void;
  children: React.ReactNode;
};

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Dialog shell: backdrop, Escape and close button. Callers render only when
 * their dialog is open, so this mounts and unmounts with it.
 *
 * Focus is trapped while open and restored to whatever opened the dialog on
 * close, so keyboard users are not dropped back at the top of the document.
 */
export function Modal({
  title,
  subtitle,
  className,
  scrollableBody,
  bodyClassName,
  onClose,
  children,
}: ModalProps) {
  const { t } = useTranslation();
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();
  const subtitleId = useId();

  /**
   * Captured during the first render, deliberately not in an effect: effects
   * run child-before-parent, and this component's own focus effect runs before
   * one declared later, so by the time any effect here fires the opener has
   * already been replaced by something inside the dialog.
   */
  const openerRef = useRef<Element | null>(null);
  openerRef.current ??= document.activeElement;

  useEffect(() => {
    scrollAreaRef.current?.focus();
  }, []);

  // Return focus to whatever opened the dialog once it unmounts.
  useEffect(() => {
    return () => {
      const opener = openerRef.current;
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap at the ends, and pull focus back in if it escaped the panel.
      if (
        event.shiftKey &&
        (active === first || !panelRef.current.contains(active))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm"
      onClick={onClose}
      style={noDrag}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={subtitle ? subtitleId : undefined}
        className={cn(
          'relative flex max-h-[calc(100vh-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl',
          className,
        )}
        onClick={(event) => event.stopPropagation()}
        style={noDrag}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id={headingId} className="text-sm font-semibold tracking-wide">
              {title}
            </h2>
            {subtitle && (
              <p
                id={subtitleId}
                className="mt-1 text-hint text-muted-foreground"
              >
                {subtitle}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            aria-label={t('titlebar.close')}
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div
          className={cn(
            'themed-scrollbar min-h-0 overflow-y-auto',
            scrollableBody && 'px-5 py-5 focus:outline-none',
            bodyClassName,
          )}
          tabIndex={scrollableBody ? 0 : undefined}
          ref={scrollableBody ? scrollAreaRef : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
