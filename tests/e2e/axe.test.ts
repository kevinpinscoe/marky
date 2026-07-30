import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Page } from '@playwright/test';
import { test, expect } from './fixture';

/**
 * Rule-based accessibility scanning.
 *
 * The hand-written checks in accessibility.test.ts and aria-snapshot.test.ts
 * only cover what someone thought to assert. This sweeps every surface with
 * axe-core instead, which is how the unnamed New document button and the
 * unnamed editor surface were found — both sat in files those tests already
 * touched.
 *
 * axe-core is driven directly rather than through @axe-core/playwright: that
 * wrapper opens a second page via Target.createTarget, which Electron does not
 * support.
 *
 * Automated rules catch somewhere between a third and half of WCAG issues, so
 * this complements the other two files rather than replacing them.
 */
const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf-8');

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Rules accepted for now, with the reason. Anything serious or critical outside
 * this set fails the run.
 */
const ACCEPTED: Record<string, string> = {
  // What remains is one token on the active line background: the heading colour
  // is 4.06:1 against it in dark amethyst. The active line is a different root
  // cause from the muted-foreground fix, and every token sits on it when the
  // caret is there, so it needs the palette solved against that surface too.
  // Measured and tracked separately.
  'color-contrast': 'syntax tokens on the active line, tracked separately',
  // CodeMirror's scroller is not focusable itself, but the contenteditable it
  // wraps is, and moving the caret scrolls it. Keyboard users are not stranded.
  'scrollable-region-focusable': 'cm-scroller scrolls via the caret',
};

/**
 * Total accepted nodes across every surface and theme. A cap rather than an
 * exact figure because it varies with how much text each surface renders, but
 * low enough that a new batch of violations cannot hide inside it.
 *
 * Was 40 while dark sat at 33. Fixing muted-foreground dropped dark to 12 and
 * light to 6, so the ceiling comes down with it.
 */
const ACCEPTED_NODE_CAP = 15;

type Violation = {
  id: string;
  impact: string | null;
  help: string;
  nodes: Array<{ target: string[]; failureSummary?: string }>;
};

async function scan(window: Page, label: string) {
  await window.evaluate(AXE_SOURCE);
  const result = (await window.evaluate(
    (tags) =>
      (window as unknown as { axe: { run: (c: unknown, o: unknown) => unknown } }).axe.run(
        document,
        { runOnly: { type: 'tag', values: tags } },
      ),
    TAGS,
  )) as { violations: Violation[] };

  const blocking = result.violations.filter(
    (v) =>
      (v.impact === 'critical' || v.impact === 'serious') && !ACCEPTED[v.id],
  );

  const accepted = result.violations
    .filter((v) => ACCEPTED[v.id])
    .reduce((total, v) => total + v.nodes.length, 0);

  return {
    label,
    accepted,
    blocking: blocking.map(
      (v) =>
        `${label}: ${v.impact} ${v.id} on ${v.nodes
          .map((n) => n.target.join(' '))
          .join(', ')} — ${v.help}`,
    ),
    // Not failed on, but surfaced so they do not go unnoticed.
    advisory: result.violations
      .filter((v) => v.impact !== 'critical' && v.impact !== 'serious')
      .map((v) => `${label}: ${v.impact} ${v.id} (${v.nodes.length})`),
  };
}

async function setTheme(window: Page, theme: string) {
  await window.evaluate(async (value) => {
    const settings = await window.marky.getSettings();
    await window.marky.setSettings({ ...settings, theme: value });
  }, theme);
  await window.reload();
  await window.waitForLoadState('domcontentloaded');
  await window.locator('header').waitFor({ state: 'visible', timeout: 10_000 });
}

test.describe('axe accessibility scan', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`${theme} theme has no unaccepted violations`, async ({ window }) => {
      test.setTimeout(180_000);
      await setTheme(window, theme);

      const results = [];

      // Main window, one scan per view mode: each hides a different pane.
      for (const [mode, label] of [
        ['Split', 'split'],
        ['Editor', 'editor'],
        ['Preview', 'preview'],
      ] as const) {
        await window.locator(`button[aria-label="${mode}"]`).click();
        await window.waitForTimeout(250);
        results.push(await scan(window, `${theme}/${label}`));
      }

      await window.locator('button[aria-label="Split"]').click();

      await window.locator('button[aria-label="Settings"]').click();
      results.push(await scan(window, `${theme}/settings`));
      await window.keyboard.press('Escape');

      await window.locator('button[aria-label="Keyboard shortcuts"]').click();
      results.push(await scan(window, `${theme}/help`));
      await window.keyboard.press('Escape');

      await window.locator('button[aria-label="Link"]').click();
      results.push(await scan(window, `${theme}/insert-link`));
      await window.keyboard.press('Escape');

      await window.locator('button[aria-label="Image"]').click();
      results.push(await scan(window, `${theme}/insert-image`));
      await window.keyboard.press('Escape');

      const advisory = results.flatMap((r) => r.advisory);
      if (advisory.length) console.log('advisory:', advisory.join(' | '));

      const acceptedTotal = results.reduce((sum, r) => sum + r.accepted, 0);
      console.log(`${theme}: accepted nodes ${acceptedTotal}`);

      expect(results.flatMap((r) => r.blocking)).toEqual([]);
      expect(acceptedTotal).toBeLessThanOrEqual(ACCEPTED_NODE_CAP);
    });
  }
});
