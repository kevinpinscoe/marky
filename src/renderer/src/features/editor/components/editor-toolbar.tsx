import { useRef, useState, type RefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import {
  FileCode2,
  FileText,
  Heading1,
  Heading2,
  Image,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  SquarePen,
  Strikethrough,
  Type,
} from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import {
  applyToolbarAction,
  getSelectedText,
  insertTable,
  isSelectionInsideLink,
  type ToolbarActionId,
} from '../lib/toolbar-actions';
import { useEditorStore, type FormattingState } from '../store';
import { shortcutDisplay } from '../lib/formatting-shortcuts';
import { useTranslation } from '@renderer/i18n';
import { useDismissOnOutside } from '@renderer/lib/use-dismiss-on-outside';
import type { TranslationKeys } from '@renderer/i18n';


const toolbarActions: Array<{
  id: ToolbarActionId;
  labelKey: keyof TranslationKeys;
  icon: typeof Type;
  formattingKey?: keyof FormattingState;
}> = [
  { id: 'bold', labelKey: 'toolbar.bold', icon: Type, formattingKey: 'bold' },
  { id: 'italic', labelKey: 'toolbar.italic', icon: SquarePen, formattingKey: 'italic' },
  {
    id: 'strike',
    labelKey: 'toolbar.strikethrough',
    icon: Strikethrough,
    formattingKey: 'strikethrough',
  },
  { id: 'h1', labelKey: 'toolbar.heading1', icon: Heading1, formattingKey: 'heading1' },
  { id: 'h2', labelKey: 'toolbar.heading2', icon: Heading2, formattingKey: 'heading2' },
  { id: 'bullet', labelKey: 'toolbar.bullets', icon: List, formattingKey: 'bulletList' },
  {
    id: 'ordered',
    labelKey: 'toolbar.ordered',
    icon: ListOrdered,
    formattingKey: 'orderedList',
  },
  { id: 'task', labelKey: 'toolbar.tasks', icon: ListChecks },
  { id: 'quote', labelKey: 'toolbar.quote', icon: Quote, formattingKey: 'blockquote' },
  { id: 'code', labelKey: 'toolbar.codeBlock', icon: FileCode2, formattingKey: 'code' },
  { id: 'link', labelKey: 'toolbar.link', icon: Link2, formattingKey: 'link' },
  { id: 'image', labelKey: 'toolbar.image', icon: Image },
  { id: 'table', labelKey: 'toolbar.table', icon: FileText },
];

const tablePickerColumns = 6;
const tablePickerRows = 4;

export type EditorInsertRequest = {
  type: 'link' | 'image';
  initialText: string;
};

type EditorToolbarProps = {
  editorViewRef: RefObject<EditorView | null>;
  onRequestInsert: (request: EditorInsertRequest) => void;
};

type TableSize = {
  columns: number;
  rows: number;
};

function TablePickerButton({
  editorViewRef,
}: {
  editorViewRef: RefObject<EditorView | null>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [hoveredSize, setHoveredSize] = useState<TableSize | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useDismissOnOutside(ref, open, () => {
    setOpen(false);
    setHoveredSize(null);
  });

  function handleToggle() {
    setOpen((current) => !current);
    setHoveredSize(null);
  }

  function handleInsert(size: TableSize) {
    const view = editorViewRef.current;
    if (!view) return;

    insertTable(view, size);
    setOpen(false);
    setHoveredSize(null);
  }

  const tableLabel = t('toolbar.table');

  return (
    <div ref={ref} className="relative">
      <Button
        variant={open ? 'subtle' : 'ghost'}
        size="icon"
        className="rounded-full text-foreground/75"
        aria-label={tableLabel}
        aria-expanded={open}
        title={tableLabel}
        onClick={handleToggle}
      >
        <FileText className="size-4" />
      </Button>

      {open && (
        <div className="absolute bottom-full left-1/2 z-50 mb-3 w-max -translate-x-1/2">
          <div className="relative overflow-visible rounded-[1.35rem] border border-border/80 bg-card/95 px-3 pb-3 pt-2 shadow-2xl backdrop-blur">
            <div className="relative overflow-hidden rounded-xl bg-muted/40 p-1">
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${tablePickerColumns}, minmax(0, 1fr))`,
                }}
                onMouseLeave={() => setHoveredSize(null)}
              >
                {Array.from({ length: tablePickerRows }).map((_, rowIndex) =>
                  Array.from({ length: tablePickerColumns }).map(
                    (__, columnIndex) => {
                      const size = {
                        columns: columnIndex + 1,
                        rows: rowIndex + 1,
                      };
                      const isSelected =
                        hoveredSize !== null &&
                        columnIndex < hoveredSize.columns &&
                        rowIndex < hoveredSize.rows;

                      return (
                        <button
                          key={`${rowIndex}-${columnIndex}`}
                          type="button"
                          className={cn(
                            'h-8 w-8 rounded-[0.35rem] border transition-colors',
                            isSelected
                              ? 'border-primary/45 bg-primary/20'
                              : 'border-border/60 bg-card/55 hover:bg-secondary/70',
                          )}
                          aria-label={`Insert ${size.columns} columns and ${size.rows} rows`}
                          onMouseEnter={() => setHoveredSize(size)}
                          onFocus={() => setHoveredSize(size)}
                          onClick={() => handleInsert(size)}
                        />
                      );
                    },
                  ),
                )}
              </div>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl font-semibold tracking-tight text-foreground/35">
                {hoveredSize
                  ? `${hoveredSize.columns} x ${hoveredSize.rows}`
                  : tableLabel}
              </div>
            </div>

            <div className="pt-2 text-center text-xs font-medium text-muted-foreground">
              {hoveredSize
                ? t('toolbar.columnsRows', {
                    columns: hoveredSize.columns,
                    rows: hoveredSize.rows,
                  })
                : t('toolbar.chooseTableSize')}
            </div>

            <div className="absolute bottom-[-7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b border-r border-border/80 bg-card/95" />
          </div>
        </div>
      )}
    </div>
  );
}

export function EditorToolbar({
  editorViewRef,
  onRequestInsert,
}: EditorToolbarProps) {
  const { t } = useTranslation();
  const formatting = useEditorStore((state) => state.formatting);

  function handleActionClick(action: ToolbarActionId) {
    const view = editorViewRef.current;
    if (!view) return;

    if (action === 'link') {
      if (isSelectionInsideLink(view)) {
        applyToolbarAction(view, action);
        return;
      }

      onRequestInsert({
        type: 'link',
        initialText: getSelectedText(view) || 'Link text',
      });
      return;
    }

    if (action === 'image') {
      onRequestInsert({
        type: 'image',
        initialText: getSelectedText(view) || 'Alt text',
      });
      return;
    }

    applyToolbarAction(view, action);
  }

  return (
    <div className="flex flex-1 flex-wrap items-center gap-1">
      {toolbarActions.map(({ id, labelKey, icon: Icon, formattingKey }) => {
        if (id === 'table') {
          return <TablePickerButton key={id} editorViewRef={editorViewRef} />;
        }

        const label = t(labelKey);
        const isActive = formattingKey ? formatting[formattingKey] : false;
        const shortcut = shortcutDisplay[id];
        const tooltip = shortcut ? `${label} (${shortcut})` : label;
        return (
          <Button
            key={id}
            variant={isActive ? 'subtle' : 'ghost'}
            size="icon"
            className="rounded-full text-foreground/75"
            aria-label={label}
            aria-pressed={formattingKey ? isActive : undefined}
            title={tooltip}
            onClick={() => handleActionClick(id)}
          >
            <Icon className="size-4" />
          </Button>
        );
      })}
    </div>
  );
}
