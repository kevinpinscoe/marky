import { useEffect, useRef } from 'react';
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

/**
 * Dialog shell: backdrop, Escape and close button. Callers render only when
 * their dialog is open, so this mounts and unmounts with it.
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

  useEffect(() => {
    scrollAreaRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
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
        className={cn(
          'relative flex max-h-[calc(100vh-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl',
          className,
        )}
        onClick={(event) => event.stopPropagation()}
        style={noDrag}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
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
