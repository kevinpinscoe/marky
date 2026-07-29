import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Guards issue #3's readability requirement: every palette (light and dark)
 * must keep body text and syntax tokens legible against its own surfaces,
 * with the very dark Sapphire background explicitly covered.
 */
const css = readFileSync(
  resolve('src/renderer/src/index.css'),
  'utf-8',
);

const THEMES = ['amethyst', 'rose', 'jade', 'amber', 'coral', 'sapphire'];
const SYNTAX_KEYS = [
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

function blockVars(selector: string): Record<string, string> {
  const idx = css.indexOf(selector);
  if (idx === -1) throw new Error(`missing CSS block for ${selector}`);
  const open = css.indexOf('{', idx);
  const close = css.indexOf('}', open);
  const vars: Record<string, string> = {};
  for (const line of css.slice(open + 1, close).split('\n')) {
    const m = line.match(/--([\w-]+):\s*([^;]+);/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

function selectorFor(mode: 'light' | 'dark', name: string): string {
  if (mode === 'dark') {
    return name === 'amethyst'
      ? `.dark,\n  .dark[data-color-theme='amethyst']`
      : `.dark[data-color-theme='${name}']`;
  }
  return name === 'amethyst'
    ? `:root,\n  :root[data-color-theme='amethyst']`
    : `:root[data-color-theme='${name}']`;
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

      it(`${mode}/${name}: syntax tokens are legible on the editor surface`, () => {
        const surface = hslTripletToRgb(vars['editor-surface']);
        for (const key of SYNTAX_KEYS) {
          const token = hslTripletToRgb(vars[key]);
          expect(
            contrast(token, surface),
            `${key} in ${mode}/${name}`,
          ).toBeGreaterThanOrEqual(3);
        }
      });
    }
  }
});
