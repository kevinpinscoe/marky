import type { ThemeName } from '@shared/types';

export type ThemeMeta = {
  name: ThemeName;
  /** Proper-noun display name; not translated. */
  label: string;
  /** Accent color used for the picker swatch. */
  swatch: string;
};

/** Colour themes offered by the app, in display order. */
export const THEMES: ThemeMeta[] = [
  { name: 'amethyst', label: 'Amethyst', swatch: '#9580ff' },
  { name: 'rose', label: 'Rose', swatch: '#ff80bf' },
  { name: 'jade', label: 'Jade', swatch: '#80ffea' },
  { name: 'amber', label: 'Amber', swatch: '#ffff80' },
  { name: 'coral', label: 'Coral', swatch: '#ff9580' },
  { name: 'sapphire', label: 'Sapphire', swatch: '#80bfff' },
];

export const THEME_NAMES: ThemeName[] = THEMES.map((theme) => theme.name);

export function isThemeName(value: string): value is ThemeName {
  return THEME_NAMES.includes(value as ThemeName);
}
