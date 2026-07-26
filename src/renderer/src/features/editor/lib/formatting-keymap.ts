import { keymap, type KeyBinding } from '@codemirror/view';
import { formattingShortcuts } from './formatting-shortcuts';
import { applyToolbarAction } from './toolbar-actions';

const formattingBindings: readonly KeyBinding[] = formattingShortcuts.map(
  ({ id, key }) => ({
    key,
    preventDefault: true,
    run: (view) => {
      applyToolbarAction(view, id);
      return true;
    },
  }),
);

export const formattingKeymap = keymap.of(formattingBindings);
