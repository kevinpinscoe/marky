import { describe, it, expect } from 'vitest';
import {
  THEMES,
  THEME_NAMES,
  isThemeName,
} from '@renderer/features/settings/lib/themes';

describe('theme registry', () => {
  it('exposes the six issue-defined themes with Amethyst first', () => {
    expect(THEME_NAMES).toEqual([
      'amethyst',
      'rose',
      'jade',
      'amber',
      'coral',
      'sapphire',
    ]);
  });

  it('gives every theme a label and a hex swatch', () => {
    for (const theme of THEMES) {
      expect(theme.label).toMatch(/\w/);
      expect(theme.swatch).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('recognises valid theme names and rejects others', () => {
    expect(isThemeName('jade')).toBe(true);
    expect(isThemeName('turquoise')).toBe(false);
  });
});
