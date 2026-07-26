import { describe, it, expect } from 'vitest';
import {
  formattingShortcuts,
  shortcutDisplay,
  toDisplayKeys,
} from '@renderer/features/editor/lib/formatting-shortcuts';

describe('toDisplayKeys', () => {
  it('uppercases a single letter', () => {
    expect(toDisplayKeys('Mod-b')).toBe('Ctrl+B');
  });

  it('keeps modifier names as written', () => {
    expect(toDisplayKeys('Mod-Shift-x')).toBe('Ctrl+Shift+X');
  });

  it('leaves digits and punctuation alone', () => {
    expect(toDisplayKeys('Mod-1')).toBe('Ctrl+1');
    expect(toDisplayKeys('Mod-Shift-.')).toBe('Ctrl+Shift+.');
  });
});

describe('formattingShortcuts', () => {
  it('gives every entry a display form', () => {
    for (const { id } of formattingShortcuts) {
      expect(shortcutDisplay[id]).toBeTruthy();
    }
  });

  it('binds each action only once', () => {
    const ids = formattingShortcuts.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses each key combination only once', () => {
    const keys = formattingShortcuts.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
