import { Modal } from '@renderer/components/ui/modal';
import { useSettingsStore } from '@renderer/features/settings/store';
import { useTranslation } from '@renderer/i18n';
import { isMac, modKey as mod } from '@renderer/lib/platform';
import type { TranslationKeys } from '@renderer/i18n';

type ShortcutEntry = {
  keys: string;
  labelKey: keyof TranslationKeys;
};

const formattingShortcuts: ShortcutEntry[] = [
  { keys: `${mod}+B`, labelKey: 'help.bold' },
  { keys: `${mod}+I`, labelKey: 'help.italic' },
  { keys: `${mod}+Shift+X`, labelKey: 'help.strikethrough' },
  { keys: `${mod}+1`, labelKey: 'help.heading1' },
  { keys: `${mod}+2`, labelKey: 'help.heading2' },
  { keys: `${mod}+Shift+7`, labelKey: 'help.orderedList' },
  { keys: `${mod}+Shift+8`, labelKey: 'help.bulletList' },
  { keys: `${mod}+Shift+9`, labelKey: 'help.taskList' },
  { keys: `${mod}+Shift+.`, labelKey: 'help.blockquote' },
  { keys: `${mod}+E`, labelKey: 'help.codeBlock' },
  { keys: `${mod}+K`, labelKey: 'help.link' },
];

const tableShortcuts: ShortcutEntry[] = [
  { keys: 'Tab', labelKey: 'help.nextCell' },
  { keys: 'Shift+Tab', labelKey: 'help.prevCell' },
];

const editorShortcuts: ShortcutEntry[] = [
  { keys: `${mod}+A`, labelKey: 'help.selectAll' },
  { keys: `${mod}+D`, labelKey: 'help.selectNextOccurrence' },
  { keys: `${mod}+F`, labelKey: 'help.find' },
  { keys: `${mod}+H`, labelKey: 'help.findReplace' },
  { keys: `${mod}+Z`, labelKey: 'help.undo' },
  { keys: `${mod}+${isMac ? 'Shift+Z' : 'Y'}`, labelKey: 'help.redo' },
  { keys: `Alt+↑ / ↓`, labelKey: 'help.moveLine' },
  { keys: `${mod}+Shift+K`, labelKey: 'help.deleteLine' },
  { keys: `${mod}+/`, labelKey: 'help.toggleComment' },
];

const fileShortcuts: ShortcutEntry[] = [
  { keys: `${mod}+N`, labelKey: 'help.newDocument' },
  { keys: `${mod}+O`, labelKey: 'help.openFile' },
  { keys: `${mod}+S`, labelKey: 'help.save' },
  { keys: `${mod}+Shift+S`, labelKey: 'help.saveCopy' },
  { keys: `${mod}+Alt+H`, labelKey: 'help.exportHtml' },
  { keys: `${mod}+Alt+P`, labelKey: 'help.exportPdf' },
];

const viewShortcuts: ShortcutEntry[] = [
  { keys: 'Alt+1', labelKey: 'help.editorOnly' },
  { keys: 'Alt+2', labelKey: 'help.splitView' },
  { keys: 'Alt+3', labelKey: 'help.previewOnly' },
  { keys: 'F1', labelKey: 'help.keyboardShortcuts' },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center rounded-md border border-border/80 bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] font-medium leading-none text-foreground/80 shadow-sm">
      {children}
    </kbd>
  );
}

function ShortcutRow({ entry }: { entry: ShortcutEntry }) {
  const { t } = useTranslation();
  const parts = entry.keys.split('+').map((k) => k.trim());
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-sm text-foreground/80">{t(entry.labelKey)}</span>
      <span className="flex shrink-0 items-center gap-1">
        {parts.map((part, i) => (
          <Kbd key={i}>{part}</Kbd>
        ))}
      </span>
    </div>
  );
}

function ShortcutSection({
  title,
  entries,
}: {
  title: string;
  entries: ShortcutEntry[];
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="divide-y divide-border/50">
        {entries.map((entry) => (
          <ShortcutRow key={entry.labelKey} entry={entry} />
        ))}
      </div>
    </div>
  );
}

export function HelpDialog() {
  const { t } = useTranslation();
  const isHelpOpen = useSettingsStore((s) => s.isHelpOpen);
  const closeHelp = useSettingsStore((s) => s.closeHelp);

  if (!isHelpOpen) return null;

  return (
    <Modal
      title={t('help.title')}
      subtitle={t('help.subtitle')}
      className="w-[460px]"
      scrollableBody
      bodyClassName="space-y-5"
      onClose={closeHelp}
    >
      <ShortcutSection
        title={t('help.formatting')}
        entries={formattingShortcuts}
      />
      <div className="border-t border-border" />
      <ShortcutSection
        title={t('help.tableNavigation')}
        entries={tableShortcuts}
      />
      <div className="border-t border-border" />
      <ShortcutSection title={t('help.editor')} entries={editorShortcuts} />
      <div className="border-t border-border" />
      <ShortcutSection title={t('help.file')} entries={fileShortcuts} />
      <div className="border-t border-border" />
      <ShortcutSection title={t('help.view')} entries={viewShortcuts} />
    </Modal>
  );
}
