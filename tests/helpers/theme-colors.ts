import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Colour maths shared by the theme test suites. Both of them read index.css
 * directly and reason about the same palettes, and CIEDE2000 in particular is
 * long enough that a second copy would drift from the first.
 */

export type Rgb = [number, number, number];

export const THEMES = [
  'amethyst',
  'rose',
  'jade',
  'amber',
  'coral',
  'sapphire',
];

/**
 * Newlines are normalised before matching. .gitattributes pins this repository
 * to LF, but a checkout configured otherwise would arrive CRLF and every
 * selector lookup would miss, failing the suite with "missing CSS block".
 */
export const themeCss = readFileSync(
  resolve('src/renderer/src/index.css'),
  'utf-8',
).replace(/\r\n/g, '\n');

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

/** Every custom property declared by one palette. */
export function paletteVars(
  mode: 'light' | 'dark',
  name: string,
): Record<string, string> {
  const selector = selectorFor(mode, name);
  const match = selector.exec(themeCss);
  if (!match) throw new Error(`missing CSS block for ${selector}`);
  const open = themeCss.indexOf('{', match.index);
  const close = themeCss.indexOf('}', open);
  const vars: Record<string, string> = {};
  for (const line of themeCss.slice(open + 1, close).split('\n')) {
    const m = line.match(/--([\w-]+):\s*([^;]+);/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

export function hslTripletToRgb(triplet: string): Rgb {
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

export const toLinear = (v: number) => {
  const n = v / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
};

export const toSrgb = (v: number) => {
  const n =
    v <= 0.0031308
      ? v * 12.92
      : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, n * 255));
};

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Source-over composite of a translucent colour on an opaque backdrop. */
export function over(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as Rgb;
}

/**
 * Resolves an editor layer, which is written either as an opaque `hsl()` or as
 * a translucent `hsl(var(--token) / alpha)` that composites over the surface.
 */
export function resolveEditorLayer(
  raw: string,
  vars: Record<string, string>,
  surface: Rgb,
): Rgb {
  const opaque = raw.match(/^hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)$/);
  if (opaque) {
    return hslTripletToRgb(`${opaque[1]} ${opaque[2]}% ${opaque[3]}%`);
  }
  const tinted = raw.match(/^hsl\(var\(--([\w-]+)\)\s*\/\s*([\d.]+)\)$/);
  if (tinted) {
    return over(
      hslTripletToRgb(vars[tinted[1]]),
      surface,
      parseFloat(tinted[2]),
    );
  }
  throw new Error(`unrecognised editor layer: "${raw}"`);
}

/**
 * Every opaque background a syntax token is drawn on. The plain surface most
 * of the time, the active line whenever the caret is on it, the selection
 * whenever it is selected.
 */
export function editorBackgrounds(
  vars: Record<string, string>,
): Record<string, Rgb> {
  const surface = hslTripletToRgb(vars['editor-surface']);
  return {
    'editor surface': surface,
    'active line': resolveEditorLayer(
      vars['editor-active-line'],
      vars,
      surface,
    ),
    selection: resolveEditorLayer(vars['editor-selection'], vars, surface),
  };
}

export function simulate(rgb: Rgb, matrix: readonly number[]): Rgb {
  const l = rgb.map(toLinear);
  return [0, 1, 2].map((i) =>
    toSrgb(
      matrix[i * 3] * l[0] +
        matrix[i * 3 + 1] * l[1] +
        matrix[i * 3 + 2] * l[2],
    ),
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

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/**
 * CIEDE2000, Sharma, Wu & Dalal (2005) formulation, kL = kC = kH = 1.
 * Verified against all of that paper's reference vectors.
 */
export function deltaE2000(rgbA: Rgb, rgbB: Rgb): number {
  const [L1, a1, b1] = toLab(rgbA);
  const [L2, a2, b2] = toLab(rgbB);

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const cBar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));

  const ap1 = (1 + G) * a1;
  const ap2 = (1 + G) * a2;
  const cp1 = Math.hypot(ap1, b1);
  const cp2 = Math.hypot(ap2, b2);

  const hue = (b: number, ap: number) => {
    if (b === 0 && ap === 0) return 0;
    const h = deg(Math.atan2(b, ap));
    return h >= 0 ? h : h + 360;
  };
  const hp1 = hue(b1, ap1);
  const hp2 = hue(b2, ap2);

  const dLp = L2 - L1;
  const dCp = cp2 - cp1;

  let dhp: number;
  if (cp1 * cp2 === 0) dhp = 0;
  else if (Math.abs(hp2 - hp1) <= 180) dhp = hp2 - hp1;
  else if (hp2 - hp1 > 180) dhp = hp2 - hp1 - 360;
  else dhp = hp2 - hp1 + 360;
  const dHp = 2 * Math.sqrt(cp1 * cp2) * Math.sin(rad(dhp) / 2);

  const lBar = (L1 + L2) / 2;
  const cpBar = (cp1 + cp2) / 2;

  let hpBar: number;
  if (cp1 * cp2 === 0) hpBar = hp1 + hp2;
  else if (Math.abs(hp1 - hp2) <= 180) hpBar = (hp1 + hp2) / 2;
  else if (hp1 + hp2 < 360) hpBar = (hp1 + hp2 + 360) / 2;
  else hpBar = (hp1 + hp2 - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos(rad(hpBar - 30)) +
    0.24 * Math.cos(rad(2 * hpBar)) +
    0.32 * Math.cos(rad(3 * hpBar + 6)) -
    0.2 * Math.cos(rad(4 * hpBar - 63));

  const dTheta = 30 * Math.exp(-(((hpBar - 275) / 25) ** 2));
  const rC = 2 * Math.sqrt(cpBar ** 7 / (cpBar ** 7 + 25 ** 7));
  const sL = 1 + (0.015 * (lBar - 50) ** 2) / Math.sqrt(20 + (lBar - 50) ** 2);
  const sC = 1 + 0.045 * cpBar;
  const sH = 1 + 0.015 * cpBar * T;
  const rT = -Math.sin(rad(2 * dTheta)) * rC;

  return Math.sqrt(
    (dLp / sL) ** 2 +
      (dCp / sC) ** 2 +
      (dHp / sH) ** 2 +
      rT * (dCp / sC) * (dHp / sH),
  );
}
