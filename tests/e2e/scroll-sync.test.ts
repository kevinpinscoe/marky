import type { Page } from '@playwright/test';
import { test, expect } from './fixture';
import { LONG_DOCUMENT, MARKERS } from '../fixtures/long-document';

/**
 * Two separate promises are covered here.
 *
 * The listener has to attach on a fresh window. It used to be read out of a ref
 * inside the effect, so on first run the editor view was still null and sync
 * stayed dead until the view mode was toggled.
 *
 * And the panes have to show the same text, not the same scroll percentage. The
 * fixture mixes blocks whose editor and rendered heights disagree — a mermaid
 * fence, a table, wrapping prose — so matching ratios visibly drifts.
 */

async function loadFixture(window: Page) {
  await window.locator('button[aria-label="Split"]').click();
  await window.waitForTimeout(300);
  await window.locator('.cm-content').fill(LONG_DOCUMENT);
  // Mermaid renders asynchronously and changes the preview's height.
  await window.waitForTimeout(1800);
}

async function wheel(window: Page, times: number, delta = 120) {
  const box = await window.locator('.cm-scroller').boundingBox();
  await window.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  for (let i = 0; i < times; i++) {
    await window.mouse.wheel(0, delta);
    await window.waitForTimeout(60);
  }
  await window.waitForTimeout(350);
}

/** Heading text at the top of each pane, as a reader would see it. */
function visibleHeadings(window: Page) {
  return window.evaluate(() => {
    function topmost(root: Element, container: Element) {
      const top = container.getBoundingClientRect().top;
      let best: { text: string; delta: number } | null = null;
      for (const node of Array.from(root.querySelectorAll('h1, h2'))) {
        const delta = node.getBoundingClientRect().top - top;
        const text = (node.textContent ?? '').trim();
        if (!text) continue;
        if (delta <= 40 && (!best || delta > best.delta))
          best = { text, delta };
      }
      return best?.text ?? null;
    }

    const pane = document.querySelector('.app-preview-pane') as HTMLElement;
    const scroller = document.querySelector('.cm-scroller') as HTMLElement;

    /**
     * The editor renders markdown source, so there are no heading elements to
     * find. Read the topmost visible `.cm-line` instead — by geometry rather
     * than elementFromPoint, which lands on the top fade overlay.
     */
    const rect = scroller.getBoundingClientRect();
    let lineEl: Element | null = null;
    let bestDelta = -Infinity;
    for (const line of Array.from(scroller.querySelectorAll('.cm-line'))) {
      const delta = line.getBoundingClientRect().top - rect.top;
      if (delta <= 6 && delta > bestDelta) {
        bestDelta = delta;
        lineEl = line;
      }
    }

    return {
      editorLine: (lineEl?.textContent ?? '').trim(),
      previewHeading: topmost(pane, pane),
      previewScrollTop: pane.scrollTop,
      previewMax: pane.scrollHeight - pane.clientHeight,
    };
  });
}

test.describe('scroll sync', () => {
  test('preview follows the editor without toggling the view mode', async ({
    window,
  }) => {
    await window.locator('button[aria-label="Split"]').click();
    await window.waitForTimeout(400);

    const before = await visibleHeadings(window);
    expect(
      before.previewMax,
      'preview must be scrollable for this to mean anything',
    ).toBeGreaterThan(0);

    await wheel(window, 8);

    const after = await visibleHeadings(window);
    expect(
      after.previewScrollTop,
      'preview should have followed',
    ).toBeGreaterThan(0);
  });

  test('preview still follows after switching modes', async ({ window }) => {
    await window.locator('button[aria-label="Editor"]').click();
    await window.waitForTimeout(200);
    await window.locator('button[aria-label="Split"]').click();
    await window.waitForTimeout(400);

    await wheel(window, 8);

    expect((await visibleHeadings(window)).previewScrollTop).toBeGreaterThan(0);
  });

  test('preview shows the section the editor is showing', async ({
    window,
  }) => {
    test.setTimeout(120_000);
    await loadFixture(window);

    const anchors = await window.evaluate(
      () => document.querySelectorAll('[data-source-line]').length,
    );
    expect(anchors, 'preview blocks must be line-tagged').toBeGreaterThan(10);

    // Programmatic scrolling here rather than the wheel: assigning scrollTop
    // fires a real scroll event, and stepping this many times with the mouse
    // takes longer than the suite's timeout allows.
    const step = async (top: number) => {
      await window.evaluate((value) => {
        (document.querySelector('.cm-scroller') as HTMLElement).scrollTop =
          value;
      }, top);
      await window.waitForTimeout(40);
    };

    const seen: string[] = [];
    const max = await window.evaluate(() => {
      const s = document.querySelector('.cm-scroller') as HTMLElement;
      return s.scrollHeight - s.clientHeight;
    });

    for (let top = 0; top <= max; top += 30) {
      await step(top);
      const state = await visibleHeadings(window);
      const marker = MARKERS.find(
        (m) => state.editorLine === `## ${m}` || state.editorLine === `# ${m}`,
      );
      if (!marker || !state.previewHeading) continue;

      seen.push(marker);
      expect(
        state.previewHeading,
        `editor showing "${marker}" but preview showing "${state.previewHeading}"`,
      ).toBe(marker);
    }

    expect(
      new Set(seen).size,
      'should have lined up on at least three sections',
    ).toBeGreaterThanOrEqual(3);
  });

  test('reaching the end of the editor reaches the end of the preview', async ({
    window,
  }) => {
    await loadFixture(window);
    await wheel(window, 60, 300);

    const state = await window.evaluate(() => {
      const pane = document.querySelector('.app-preview-pane') as HTMLElement;
      const scroller = document.querySelector('.cm-scroller') as HTMLElement;
      return {
        editorAtEnd:
          scroller.scrollTop >=
          scroller.scrollHeight - scroller.clientHeight - 2,
        previewRemaining:
          pane.scrollHeight - pane.clientHeight - pane.scrollTop,
      };
    });

    expect(state.editorAtEnd).toBe(true);
    // Ratio sync lands here for free; a broken mapping strands the preview.
    expect(state.previewRemaining).toBeLessThan(40);
  });
});
