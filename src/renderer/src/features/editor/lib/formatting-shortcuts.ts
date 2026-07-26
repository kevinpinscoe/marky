import { modKey } from '@renderer/lib/platform';
import type { ToolbarActionId } from './toolbar-actions';

/**
 * The formatting shortcuts, in the order the help dialog lists them.
 *
 * `key` is a CodeMirror binding spec. It is the single source for the keymap,
 * the toolbar tooltips and the help dialog, so a rebinding cannot leave any of
 * them lying.
 */
export const formattingShortcuts: ReadonlyArray<{
  id: ToolbarActionId;
  key: string;
}> = [
  { id: 'bold', key: 'Mod-b' },
  { id: 'italic', key: 'Mod-i' },
  { id: 'strike', key: 'Mod-Shift-x' },
  { id: 'h1', key: 'Mod-1' },
  { id: 'h2', key: 'Mod-2' },
  { id: 'ordered', key: 'Mod-Shift-7' },
  { id: 'bullet', key: 'Mod-Shift-8' },
  { id: 'task', key: 'Mod-Shift-9' },
  { id: 'quote', key: 'Mod-Shift-.' },
  { id: 'code', key: 'Mod-e' },
  { id: 'link', key: 'Mod-k' },
];

/** Turns a binding spec into the label users see, e.g. `Mod-b` into `⌘+B`. */
export function toDisplayKeys(key: string): string {
  return key
    .split('-')
    .map((part) => {
      if (part === 'Mod') return modKey;
      return part.length === 1 ? part.toUpperCase() : part;
    })
    .join('+');
}

export const shortcutDisplay: Partial<Record<ToolbarActionId, string>> =
  Object.fromEntries(
    formattingShortcuts.map(({ id, key }) => [id, toDisplayKeys(key)]),
  );
