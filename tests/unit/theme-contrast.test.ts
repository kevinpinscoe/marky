import { describe, it, expect } from 'vitest';
import {
  THEMES,
  contrast,
  deltaE2000,
  editorBackgrounds,
  hslTripletToRgb,
  paletteVars,
} from '../helpers/theme-colors';

/**
 * Guards issue #3's readability requirement: every palette (light and dark)
 * must keep body text and syntax tokens legible against its own surfaces,
 * with the very dark Sapphire background explicitly covered.
 */
const SYNTAX_KEYS = [
  'syntax-heading',
  'syntax-foreground',
  'syntax-comment',
  'syntax-string',
  'syntax-keyword',
  'syntax-function',
  'syntax-class',
  'syntax-constant',
  'syntax-parameter',
  'syntax-error',
  'syntax-tag',
];

describe('theme contrast (WCAG)', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const name of THEMES) {
      const vars = paletteVars(mode, name);

      it(`${mode}/${name}: body text is legible on the app background`, () => {
        const fg = hslTripletToRgb(vars.foreground);
        const bg = hslTripletToRgb(vars.background);
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
      });

      /**
       * Muted text carries real content — section headings, hints, sub-labels,
       * the unselected theme names — so AA applies to it as much as to body
       * text. It was 3.10:1 against card in every dark palette until axe found
       * it, which nothing here was checking.
       *
       * Only the surfaces it actually renders on. Any translucent panel is a
       * blend of background and card, and clearing both brackets the blend.
       */
      it(`${mode}/${name}: muted text is legible on every surface it sits on`, () => {
        const muted = hslTripletToRgb(vars['muted-foreground']);
        for (const surface of ['background', 'card', 'editor-surface']) {
          expect(
            contrast(muted, hslTripletToRgb(vars[surface])),
            `muted-foreground on ${surface} in ${mode}/${name}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      });

      /**
       * Three backgrounds, not one. Text sits on the plain surface most of the
       * time, on the active line whenever the caret is on that line, and on the
       * selection whenever it is selected. Only the first was ever measured, so
       * tokens tuned against it dropped below AA the moment the caret arrived:
       * 34 token/background pairs on the active line and 77 on the selection.
       *
       * 4.5:1 is WCAG AA for normal-size text, which is what code is.
       */
      it(`${mode}/${name}: syntax tokens are legible on every editor background`, () => {
        const backgrounds = editorBackgrounds(vars);
        for (const key of SYNTAX_KEYS) {
          const token = hslTripletToRgb(vars[key]);
          for (const [label, background] of Object.entries(backgrounds)) {
            expect(
              contrast(token, background),
              `${key} on the ${label} in ${mode}/${name}`,
            ).toBeGreaterThanOrEqual(4.5);
          }
        }
      });

      /**
       * The other half of that trade, and the reason it needs pinning down.
       *
       * Contrast against the active line and the selection can always be
       * satisfied by making them fade into the surface, which is not a fix —
       * it deletes the feature to pass the test. Selection was softened to buy
       * the contrast above, so the floor it was softened to is now recorded.
       *
       * CIEDE2000 rather than a contrast ratio: these are large blocks of
       * colour where hue and chroma carry the signal, not thin glyphs where
       * luminance does. 3 is around where a filled region stops reading as a
       * distinct band.
       */
      it(`${mode}/${name}: editor highlights stay visible against the surface`, () => {
        const { 'editor surface': surface, ...highlights } =
          editorBackgrounds(vars);
        for (const [label, highlight] of Object.entries(highlights)) {
          expect(
            deltaE2000(highlight, surface),
            `the ${label} against the editor surface in ${mode}/${name}`,
          ).toBeGreaterThanOrEqual(3);
        }
      });
    }
  }
});
