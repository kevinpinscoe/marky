import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Guards issue #3's readability requirement: every palette (light and dark)
 * must keep body text and syntax tokens legible against its own surfaces,
 * with the very dark Sapphire background explicitly covered.
 */
/**
 * Newlines are normalised before matching. The repository has no .gitattributes,
 * so this file arrives CRLF on a Windows checkout and every selector lookup
 * below would miss, failing the whole suite with "missing CSS block".
 */
const css = readFileSync(resolve('src/renderer/src/index.css'), 'utf-8').replace(
  /\r\n/g,
  '\n',
);

const THEMES = ['amethyst', 'rose', 'jade', 'amber', 'coral', 'sapphire'];
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

type Rgb = [number, number, number];

function hslTripletToRgb(triplet: string): Rgb {
  const m = triplet
    .trim()
    .match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) throw new Error(`not an HSL triplet: "${triplet}"`);
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let rgb: Rgb = [0, 0, 0];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((v) => (v + mm) * 255) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function blockVars(selector: RegExp): Record<string, string> {
  const match = selector.exec(css);
  if (!match) throw new Error(`missing CSS block for ${selector}`);
  const open = css.indexOf('{', match.index);
  const close = css.indexOf('}', open);
  const vars: Record<string, string> = {};
  for (const line of css.slice(open + 1, close).split('\n')) {
    const m = line.match(/--([\w-]+):\s*([^;]+);/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

/**
 * Matched as a pattern rather than a literal so reindenting index.css cannot
 * quietly break the lookup.
 */
function selectorFor(mode: 'light' | 'dark', name: string): RegExp {
  const base = mode === 'dark' ? '\\.dark' : ':root';
  const attribute = `\\[data-color-theme='${name}'\\]`;

  // Amethyst is also the default, so it heads a two-selector rule.
  return name === 'amethyst'
    ? new RegExp(`${base},\\s*${base}${attribute}`)
    : new RegExp(`${base}${attribute}`);
}

describe('theme contrast (WCAG)', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const name of THEMES) {
      const vars = blockVars(selectorFor(mode, name));

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

      // 4.5:1 is WCAG AA for normal-size text, which is what code is. The
      // threshold used to be 3:1, under which every token passed while 18 sat
      // below the bar issue #4 actually asks for.
      it(`${mode}/${name}: syntax tokens are legible on the editor surface`, () => {
        const surface = hslTripletToRgb(vars['editor-surface']);
        for (const key of SYNTAX_KEYS) {
          const token = hslTripletToRgb(vars[key]);
          expect(
            contrast(token, surface),
            `${key} in ${mode}/${name}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }
});
