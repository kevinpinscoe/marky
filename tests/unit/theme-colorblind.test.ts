import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Syntax highlighting has to stay legible for readers with colour vision
 * deficiency, which contrast alone does not guarantee: two tokens can both
 * clear 4.5:1 against the background and still be the same colour as each
 * other once simulated.
 *
 * Each palette is simulated for protanopia, deuteranopia and tritanopia, and
 * every token pair that is clearly distinct in normal vision is checked for
 * collapsing under simulation.
 *
 * KNOWN is the debt that already exists, recorded so it cannot grow silently.
 * The suite fails both on a new collapse and on a stale entry, so the list has
 * to shrink deliberately rather than drift.
 *
 * Caveats worth remembering before treating this as a verdict: dE76 with a
 * threshold of 10 is a heuristic, CIEDE2000 would be more accurate, and the
 * matrices model full dichromacy while most colour vision deficiency is milder
 * anomalous trichromacy.
 */
const css = readFileSync(
  resolve('src/renderer/src/index.css'),
  'utf-8',
).replace(/\r\n/g, '\n');

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

/** Distinct in normal vision, and still distinct once simulated. */
const DISTINCT = 10;

/** Machado, Oliveira & Fernandes (2009), severity 1.0, applied in linear RGB. */
const DEFICIENCIES = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
} as const;

const KNOWN = new Set([
  'dark/amber deuteranopia function/parameter',
  'dark/amber protanopia comment/error',
  'dark/amber protanopia foreground/class',
  'dark/amber protanopia string/function',
  'dark/amber tritanopia error/tag',
  'dark/amber tritanopia foreground/string',
  'dark/amber tritanopia keyword/error',
  'dark/amethyst deuteranopia function/parameter',
  'dark/amethyst protanopia foreground/class',
  'dark/amethyst protanopia string/function',
  'dark/amethyst tritanopia error/tag',
  'dark/amethyst tritanopia foreground/string',
  'dark/amethyst tritanopia keyword/error',
  'dark/coral deuteranopia function/parameter',
  'dark/coral protanopia foreground/class',
  'dark/coral protanopia string/function',
  'dark/coral tritanopia error/tag',
  'dark/coral tritanopia foreground/string',
  'dark/coral tritanopia keyword/error',
  'dark/jade deuteranopia comment/keyword',
  'dark/jade deuteranopia comment/tag',
  'dark/jade deuteranopia function/parameter',
  'dark/jade protanopia foreground/class',
  'dark/jade protanopia string/function',
  'dark/jade tritanopia error/tag',
  'dark/jade tritanopia foreground/string',
  'dark/jade tritanopia keyword/error',
  'dark/rose deuteranopia function/parameter',
  'dark/rose protanopia foreground/class',
  'dark/rose protanopia string/function',
  'dark/rose tritanopia error/tag',
  'dark/rose tritanopia foreground/string',
  'dark/rose tritanopia keyword/error',
  'dark/sapphire deuteranopia function/parameter',
  'dark/sapphire protanopia comment/keyword',
  'dark/sapphire protanopia comment/tag',
  'dark/sapphire protanopia foreground/class',
  'dark/sapphire protanopia string/function',
  'dark/sapphire tritanopia error/tag',
  'dark/sapphire tritanopia foreground/string',
  'dark/sapphire tritanopia keyword/error',
  'light/amber deuteranopia parameter/error',
  'light/amber deuteranopia string/error',
  'light/amber deuteranopia string/parameter',
  'light/amber protanopia string/parameter',
  'light/amber tritanopia function/class',
  'light/amethyst deuteranopia parameter/error',
  'light/amethyst deuteranopia string/error',
  'light/amethyst deuteranopia string/parameter',
  'light/amethyst protanopia string/parameter',
  'light/amethyst tritanopia function/class',
  'light/coral deuteranopia comment/keyword',
  'light/coral deuteranopia comment/tag',
  'light/coral deuteranopia parameter/error',
  'light/coral deuteranopia string/error',
  'light/coral deuteranopia string/parameter',
  'light/coral protanopia string/parameter',
  'light/coral tritanopia comment/string',
  'light/coral tritanopia function/class',
  'light/jade deuteranopia comment/keyword',
  'light/jade deuteranopia comment/tag',
  'light/jade deuteranopia parameter/error',
  'light/jade deuteranopia string/error',
  'light/jade deuteranopia string/parameter',
  'light/jade protanopia string/parameter',
  'light/jade tritanopia function/class',
  'light/rose deuteranopia comment/keyword',
  'light/rose deuteranopia comment/tag',
  'light/rose deuteranopia parameter/error',
  'light/rose deuteranopia string/error',
  'light/rose deuteranopia string/parameter',
  'light/rose protanopia comment/class',
  'light/rose protanopia string/parameter',
  'light/rose tritanopia function/class',
  'light/sapphire deuteranopia comment/class',
  'light/sapphire deuteranopia parameter/error',
  'light/sapphire deuteranopia string/error',
  'light/sapphire deuteranopia string/parameter',
  'light/sapphire protanopia comment/class',
  'light/sapphire protanopia string/parameter',
  'light/sapphire tritanopia function/class',
]);

type Rgb = [number, number, number];

function hslTripletToRgb(triplet: string): Rgb {
  const m = triplet.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
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

const toLinear = (v: number) => {
  const n = v / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
};

const toSrgb = (v: number) => {
  const n =
    v <= 0.0031308
      ? v * 12.92
      : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, n * 255));
};

function simulate(rgb: Rgb, deficiency: keyof typeof DEFICIENCIES): Rgb {
  const m = DEFICIENCIES[deficiency];
  const l = rgb.map(toLinear);
  return [0, 1, 2].map((i) =>
    toSrgb(m[i][0] * l[0] + m[i][1] * l[1] + m[i][2] * l[2]),
  ) as Rgb;
}

function toLab([r, g, b]: Rgb): Rgb {
  const [R, G, B] = [r, g, b].map(toLinear);
  let X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  let Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  let Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [X, Y, Z] = [f(X), f(Y), f(Z)];
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}

function deltaE(a: Rgb, b: Rgb): number {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
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

function selectorFor(mode: 'light' | 'dark', name: string): RegExp {
  const base = mode === 'dark' ? '\\.dark' : ':root';
  const attribute = `\\[data-color-theme='${name}'\\]`;
  return name === 'amethyst'
    ? new RegExp(`${base},\\s*${base}${attribute}`)
    : new RegExp(`${base}${attribute}`);
}

function collapsedPairs(): string[] {
  const found: string[] = [];
  for (const mode of ['light', 'dark'] as const) {
    for (const name of THEMES) {
      const vars = blockVars(selectorFor(mode, name));
      const colors = SYNTAX_KEYS.filter((k) => vars[k]).map(
        (k) => [k.replace('syntax-', ''), hslTripletToRgb(vars[k])] as const,
      );

      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          const [nameA, a] = colors[i];
          const [nameB, b] = colors[j];
          if (deltaE(a, b) < DISTINCT) continue;

          for (const deficiency of Object.keys(DEFICIENCIES) as Array<
            keyof typeof DEFICIENCIES
          >) {
            if (
              deltaE(simulate(a, deficiency), simulate(b, deficiency)) <
              DISTINCT
            ) {
              found.push(`${mode}/${name} ${deficiency} ${nameA}/${nameB}`);
            }
          }
        }
      }
    }
  }
  return found.sort();
}

describe('syntax colours under colour vision deficiency', () => {
  const collapsed = collapsedPairs();

  it('introduces no token pair that was not already known to collapse', () => {
    expect(collapsed.filter((pair) => !KNOWN.has(pair))).toEqual([]);
  });

  it('has no stale entries, so the known list shrinks deliberately', () => {
    const seen = new Set(collapsed);
    expect([...KNOWN].filter((pair) => !seen.has(pair))).toEqual([]);
  });
});
