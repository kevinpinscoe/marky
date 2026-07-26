import { useEffect, useRef } from 'react';

/**
 * Dismisses a popover when the user clicks outside `ref` or presses Escape.
 * Does nothing while `isOpen` is false.
 *
 * `onDismiss` is read through a ref so callers can pass an inline arrow
 * without re-subscribing the listeners on every render.
 */
export function useDismissOnOutside(
  ref: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onDismiss: () => void,
) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onDismissRef.current();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onDismissRef.current();
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, isOpen]);
}
