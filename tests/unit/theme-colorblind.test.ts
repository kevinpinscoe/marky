import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Syntax highlighting has to stay legible for readers with colour vision
 * deficiency, which contrast alone does not guarantee: two tokens can both
 * clear 4.5:1 against the background and still be the same colour as each
 * other once simulated.
 *
 * Every palette is simulated across the protan, deutan and tritan families,
 * and every token pair that is clearly distinct in normal vision is checked
 * for collapsing under simulation.
 *
 * KNOWN is the debt that already exists, grouped by conflict so the shape of
 * it is visible: a conflict listing all twelve palettes is one shared colour
 * pair to fix, a conflict listing one palette is local to that palette. The
 * suite fails both on a new collapse and on a stale entry, so the list has to
 * shrink deliberately rather than drift.
 */
const css = readFileSync(
  resolve('src/renderer/src/index.css'),
  'utf-8',
).replace(/\r\n/g, '\n');

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

/**
 * CIEDE2000 distance below which two colours read as the same colour.
 *
 * Anchored by rendering rather than assumed: token pairs were drawn as
 * interleaved code in their simulated colours and inspected. Below about 9.7
 * the two tokens in a line were not tellable apart; separation becomes
 * reliable around 10 to 11. Side-by-side text in a single line is the easiest
 * case there is — real code scatters these tokens — so the threshold sits at
 * the optimistic end of what was legible, not beyond it.
 *
 * This replaced dE76 at the same numeric value, which is a coincidence and not
 * a translation: the two metrics disagree sharply on saturated colours, and
 * the swap roughly doubled the recorded debt because dE76 was calling pairs
 * distinct that are not.
 */
const DISTINCT = 10;

/**
 * Machado, Oliveira & Fernandes (2009), applied in linear RGB, as published in
 * the colour-science dataset. Rows are the flattened 3x3 matrix.
 *
 * Severity 1.0 is dichromacy; lower severities are anomalous trichromacy,
 * which is both milder and far more common. Severity 1.0 is not a worst case
 * that subsumes the rest — `heading/comment` in dark amethyst collapses from
 * 0.5 to 0.8 and separates again by 1.0 — so the whole range is swept.
 */
// prettier-ignore
const CVD_MATRICES = {
  protanomaly: {
    0.5: [0.458064, 0.679578, -0.137642, 0.092785, 0.846313, 0.060902, -0.007494, -0.016807, 1.024301],
    0.6: [0.385450, 0.769005, -0.154455, 0.100526, 0.829802, 0.069673, -0.007442, -0.022190, 1.029632],
    0.7: [0.319627, 0.849633, -0.169261, 0.106241, 0.815969, 0.077790, -0.007025, -0.028051, 1.035076],
    0.8: [0.259411, 0.923008, -0.182420, 0.110296, 0.804340, 0.085364, -0.006276, -0.034346, 1.040622],
    0.9: [0.203876, 0.990338, -0.194214, 0.112975, 0.794542, 0.092483, -0.005222, -0.041043, 1.046265],
    1.0: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  },
  deuteranomaly: {
    0.5: [0.547494, 0.607765, -0.155259, 0.181692, 0.781742, 0.036566, -0.010410, 0.027275, 0.983136],
    0.6: [0.498864, 0.674741, -0.173604, 0.205199, 0.754872, 0.039929, -0.011131, 0.030969, 0.980162],
    0.7: [0.457771, 0.731899, -0.189670, 0.226409, 0.731012, 0.042579, -0.011595, 0.034333, 0.977261],
    0.8: [0.422823, 0.781057, -0.203881, 0.245752, 0.709602, 0.044646, -0.011843, 0.037423, 0.974421],
    0.9: [0.392952, 0.823610, -0.216562, 0.263559, 0.690210, 0.046232, -0.011910, 0.040281, 0.971630],
    1.0: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.011820, 0.042940, 0.968881],
  },
  tritanomaly: {
    0.5: [1.017277, 0.027029, -0.044306, -0.006113, 0.958479, 0.047634, 0.006379, 0.248708, 0.744913],
    0.6: [1.104996, -0.046633, -0.058363, -0.032137, 0.971635, 0.060503, 0.001336, 0.317922, 0.680742],
    0.7: [1.193214, -0.109812, -0.083402, -0.058496, 0.979410, 0.079086, -0.002346, 0.403492, 0.598854],
    0.8: [1.257728, -0.139648, -0.118081, -0.078003, 0.975409, 0.102594, -0.003316, 0.501214, 0.502102],
    0.9: [1.278864, -0.125333, -0.153531, -0.084748, 0.957674, 0.127074, -0.000989, 0.601151, 0.399838],
    1.0: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.303900],
  },
} as const;

const SEVERITIES = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const;

const KNOWN: Record<string, string[]> = {
  'deuteranomaly comment/class': [
    'light/amethyst',
    'light/rose',
    'light/sapphire',
  ],
  'deuteranomaly comment/constant': ['dark/amethyst'],
  'deuteranomaly comment/error': ['dark/amber'],
  'deuteranomaly comment/function': ['light/amber', 'light/coral'],
  'deuteranomaly comment/keyword': [
    'dark/jade',
    'light/amber',
    'light/coral',
    'light/jade',
    'light/rose',
  ],
  'deuteranomaly comment/tag': [
    'dark/jade',
    'light/amber',
    'light/coral',
    'light/jade',
    'light/rose',
  ],
  'deuteranomaly foreground/class': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
  ],
  'deuteranomaly function/parameter': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
  ],
  'deuteranomaly heading/comment': ['dark/amethyst'],
  'deuteranomaly heading/constant': ['light/sapphire'],
  'deuteranomaly heading/error': ['light/amber', 'light/coral'],
  'deuteranomaly heading/foreground': ['dark/jade'],
  'deuteranomaly heading/function': [
    'dark/amber',
    'light/amber',
    'light/coral',
    'light/rose',
  ],
  'deuteranomaly heading/parameter': [
    'dark/amber',
    'dark/coral',
    'light/amber',
  ],
  'deuteranomaly heading/string': ['light/amber', 'light/coral'],
  'deuteranomaly parameter/error': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
    'light/amber',
    'light/amethyst',
    'light/coral',
    'light/jade',
    'light/rose',
    'light/sapphire',
  ],
  'deuteranomaly string/error': [
    'light/amber',
    'light/amethyst',
    'light/coral',
    'light/jade',
    'light/rose',
    'light/sapphire',
  ],
  'deuteranomaly string/function': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
  ],
  'deuteranomaly string/parameter': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
    'light/amber',
    'light/amethyst',
    'light/coral',
    'light/jade',
    'light/rose',
    'light/sapphire',
  ],
  'protanomaly comment/class': ['light/rose', 'light/sapphire'],
  'protanomaly comment/constant': ['dark/amethyst'],
  'protanomaly comment/error': ['dark/amber', 'light/amber'],
  'protanomaly comment/keyword': [
    'dark/amethyst',
    'dark/rose',
    'dark/sapphire',
    'light/amethyst',
  ],
  'protanomaly comment/tag': [
    'dark/amethyst',
    'dark/rose',
    'dark/sapphire',
    'light/amethyst',
  ],
  'protanomaly foreground/class': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
  ],
  'protanomaly function/parameter': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
    'light/amber',
    'light/amethyst',
    'light/coral',
    'light/jade',
    'light/rose',
    'light/sapphire',
  ],
  'protanomaly heading/comment': ['dark/amethyst', 'dark/rose'],
  'protanomaly heading/constant': ['light/sapphire'],
  'protanomaly heading/error': ['light/coral'],
  'protanomaly heading/foreground': ['dark/jade'],
  'protanomaly heading/function': ['dark/amber', 'light/amber', 'light/coral'],
  'protanomaly heading/parameter': ['light/amber'],
  'protanomaly heading/string': ['light/amber', 'light/coral'],
  'protanomaly string/function': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
    'light/amber',
    'light/amethyst',
    'light/coral',
    'light/jade',
    'light/rose',
    'light/sapphire',
  ],
  'protanomaly string/parameter': [
    'light/amber',
    'light/amethyst',
    'light/coral',
    'light/jade',
    'light/rose',
    'light/sapphire',
  ],
  'tritanomaly comment/class': ['light/sapphire'],
  'tritanomaly comment/constant': ['dark/amethyst'],
  'tritanomaly comment/function': ['light/jade'],
  'tritanomaly comment/string': ['light/coral', 'light/rose'],
  'tritanomaly error/tag': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
  ],
  'tritanomaly foreground/string': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
  ],
  'tritanomaly function/class': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
    'light/amber',
    'light/amethyst',
    'light/coral',
    'light/jade',
    'light/rose',
    'light/sapphire',
  ],
  'tritanomaly heading/comment': [
    'dark/amethyst',
    'light/coral',
    'light/jade',
    'light/sapphire',
  ],
  'tritanomaly heading/error': ['dark/rose', 'light/rose'],
  'tritanomaly heading/foreground': ['dark/amber'],
  'tritanomaly heading/function': ['dark/jade', 'light/jade'],
  'tritanomaly heading/keyword': ['dark/coral', 'light/rose'],
  'tritanomaly heading/parameter': ['light/rose'],
  'tritanomaly heading/string': ['light/coral'],
  'tritanomaly heading/tag': ['dark/coral', 'light/rose'],
  'tritanomaly keyword/error': [
    'dark/amber',
    'dark/amethyst',
    'dark/coral',
    'dark/jade',
    'dark/rose',
    'dark/sapphire',
  ],
  'tritanomaly keyword/parameter': [
    'light/amber',
    'light/amethyst',
    'light/coral',
    'light/jade',
    'light/rose',
    'light/sapphire',
  ],
  'tritanomaly parameter/error': [
    'light/amber',
    'light/amethyst',
    'light/coral',
    'light/jade',
    'light/rose',
    'light/sapphire',
  ],
  'tritanomaly parameter/tag': [
    'light/amber',
    'light/amethyst',
    'light/coral',
    'light/jade',
    'light/rose',
    'light/sapphire',
  ],
};

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

function simulate(rgb: Rgb, matrix: readonly number[]): Rgb {
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
function deltaE(rgbA: Rgb, rgbB: Rgb): number {
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

/**
 * Conflict -> the palettes it occurs in. A pair counts as collapsed if it is
 * indistinguishable at any severity, recorded once per deficiency rather than
 * once per severity: the reader either loses the distinction or does not.
 */
function collapsedConflicts(): Record<string, string[]> {
  const found: Record<string, string[]> = {};

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
          // Tokens that already share a colour are not a collapse to fix.
          if (deltaE(a, b) < DISTINCT) continue;

          for (const deficiency of Object.keys(CVD_MATRICES) as Array<
            keyof typeof CVD_MATRICES
          >) {
            for (const severity of SEVERITIES) {
              const matrix = CVD_MATRICES[deficiency][severity];
              if (
                deltaE(simulate(a, matrix), simulate(b, matrix)) >= DISTINCT
              ) {
                continue;
              }
              const conflict = `${deficiency} ${nameA}/${nameB}`;
              (found[conflict] ??= []).push(`${mode}/${name}`);
              break;
            }
          }
        }
      }
    }
  }

  for (const palettes of Object.values(found)) palettes.sort();
  return found;
}

/**
 * Non-colour cues from highlight-style.ts. A pair whose two tokens carry
 * different cues stays tellable apart even when the colours collapse, so it is
 * not the same risk as a pair distinguished by hue alone.
 *
 * Keep in step with markyHighlightStyle: a cue removed there without being
 * removed here would overstate how safe the palette is.
 */
const NON_COLOUR_CUES: Record<string, string> = {
  comment: 'italic',
  error: 'wavy underline',
};

function isMitigated(conflict: string): boolean {
  const [a, b] = conflict.split(' ')[1].split('/');
  return (NON_COLOUR_CUES[a] ?? '') !== (NON_COLOUR_CUES[b] ?? '');
}

describe('syntax colours under colour vision deficiency', () => {
  const collapsed = collapsedConflicts();

  it('introduces no collapse that is not already recorded', () => {
    const unrecorded: string[] = [];
    for (const [conflict, palettes] of Object.entries(collapsed)) {
      for (const palette of palettes) {
        if (!KNOWN[conflict]?.includes(palette)) {
          unrecorded.push(`${conflict} in ${palette}`);
        }
      }
    }
    expect(unrecorded).toEqual([]);
  });

  it('has no stale entries, so the known list shrinks deliberately', () => {
    const stale: string[] = [];
    for (const [conflict, palettes] of Object.entries(KNOWN)) {
      for (const palette of palettes) {
        if (!collapsed[conflict]?.includes(palette)) {
          stale.push(`${conflict} in ${palette}`);
        }
      }
    }
    expect(stale).toEqual([]);
  });

  // The count that actually matters. Everything else survives on italics or a
  // wavy underline; these are distinguishable by hue alone, so a reader with
  // colour vision deficiency has nothing else to go on.
  //
  // 124 of 207. The palette did not get worse: this is what switching from
  // dE76 to CIEDE2000 revealed was already there.
  it('adds no colour-only collapse beyond the recorded 124', () => {
    const bare = Object.entries(collapsed)
      .filter(([conflict]) => !isMitigated(conflict))
      .reduce((total, [, palettes]) => total + palettes.length, 0);
    expect(bare).toBeLessThanOrEqual(124);
  });

  it('keeps error distinguishable by something other than hue', () => {
    const bareErrors = Object.keys(collapsed)
      .filter((conflict) => conflict.includes('error'))
      .filter((conflict) => !isMitigated(conflict));
    expect(bareErrors).toEqual([]);
  });
});
