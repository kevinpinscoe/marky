import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '@renderer/i18n';
import { inputClass } from '@renderer/components/ui/field';
import { cn } from '@renderer/lib/utils';

export type ComboboxOption = { value: string; label: string };

type ComboboxProps = {
  id?: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  className?: string;
  'aria-label'?: string;
};

/** Where the popup goes, in viewport coordinates. */
type Placement = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

const GAP = 4;
const MIN_SPACE = 120;

/**
 * A select with a filter box, following the ARIA combobox pattern.
 *
 * The native <select> kept its own dropdown, drawn by the operating system and
 * unstyleable, which on Windows looks nothing like the rest of the app (#17).
 * It is also a poor fit for the font pickers, where one list runs to nearly
 * two hundred entries and there is no way to narrow it.
 *
 * The trigger is a real <input>, not a div, so `<label for>` still associates
 * and typing is what a reader expects from something that filters.
 */
export function Combobox({
  id,
  value,
  options,
  onChange,
  className,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const { t } = useTranslation();
  const listId = useId();
  const optionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  /**
   * null means "showing the current selection", not "empty". Filtering only
   * starts once something is typed, so opening the list does not narrow it to
   * the one option already chosen.
   */
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = options.find((option) => option.value === value);
  const filtered =
    query === null || query === ''
      ? options
      : options.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase()),
        );

  const reposition = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP;
    const above = rect.top - GAP;
    // Flip up only when below is genuinely too cramped to be usable.
    const flip = below < MIN_SPACE && above > below;
    const maxHeight = Math.min(288, flip ? above : below);
    setPlacement({
      left: rect.left,
      top: flip ? rect.top - GAP - maxHeight : rect.bottom + GAP,
      width: rect.width,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    // Fixed positioning does not follow the dialog's own scrolling, so it is
    // recomputed while the list is open. Capture phase catches scrolls on any
    // ancestor, not just the window.
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  // Keep the active option on screen while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, filtered.length]);

  function openList() {
    if (open) return;
    const index = options.findIndex((option) => option.value === value);
    setActiveIndex(index === -1 ? 0 : index);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery(null);
  }

  function commit(option: ComboboxOption | undefined) {
    if (option) onChange(option.value);
    close();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) return openList();
        setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) return openList();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      case 'Home':
        if (!open) return;
        event.preventDefault();
        setActiveIndex(0);
        return;
      case 'End':
        if (!open) return;
        event.preventDefault();
        setActiveIndex(filtered.length - 1);
        return;
      case 'Enter':
        if (!open) return;
        event.preventDefault();
        commit(filtered[activeIndex]);
        return;
      case 'Escape':
        if (!open) return;
        // Only the list closes. Left to bubble it would also close the dialog,
        // which is not what the first Escape should do.
        event.stopPropagation();
        close();
        return;
      case 'Tab':
        close();
        return;
      default:
    }
  }

  const activeId =
    open && filtered[activeIndex] ? `${optionId}-${activeIndex}` : undefined;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        type="text"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        className={cn(inputClass, 'pr-9', className)}
        value={query ?? selected?.label ?? ''}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          openList();
        }}
        onKeyDown={handleKeyDown}
        onMouseDown={() => (open ? close() : openList())}
        onFocus={(event) => event.target.select()}
        onBlur={close}
      />
      {/* Decorative: the input already announces itself as a combobox, and the
          click has to reach the input rather than stopping here. */}
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />

      {createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          hidden={!open}
          className={cn(
            'fixed z-[60] overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg',
            !open && 'hidden',
          )}
          style={
            placement
              ? {
                  left: placement.left,
                  top: placement.top,
                  width: placement.width,
                  maxHeight: placement.maxHeight,
                }
              : undefined
          }
        >
          {/* Options exist only while the list is open. The element itself
              stays mounted so aria-controls always resolves to something real,
              but the font list runs to nearly two hundred entries and six of
              these are on the page at once. */}
          {open &&
            filtered.map((option, index) => (
              <li
                key={option.value}
                id={`${optionId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                data-active={index === activeIndex}
                className={cn(
                  'cursor-pointer px-3 py-1.5 text-sm text-foreground',
                  index === activeIndex && 'bg-primary/15',
                  option.value === value && 'font-semibold',
                )}
                // mousedown, not click: blur would close the list first and the
                // click would land on nothing.
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(option);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {option.label}
              </li>
            ))}
          {open && filtered.length === 0 && (
            <li
              role="presentation"
              className="px-3 py-1.5 text-sm text-muted-foreground"
            >
              {t('combobox.noMatches')}
            </li>
          )}
        </ul>,
        document.body,
      )}
    </div>
  );
}
