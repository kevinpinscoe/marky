import { test, expect } from './fixture';

/**
 * Scroll sync used to attach its listener only if the effect happened to run
 * after CodeMirror reported its view. On a fresh window it ran first, so the
 * preview never followed until the view mode was toggled and the effect re-ran.
 *
 * These scroll on load, without touching the view switcher, which is the case
 * that was broken.
 */
test.describe('scroll sync', () => {
  async function scrollEditorToBottom(window: import('@playwright/test').Page) {
    const box = await window.locator('.cm-scroller').boundingBox();
    await window.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    for (let i = 0; i < 8; i++) {
      await window.mouse.wheel(0, 120);
      await window.waitForTimeout(80);
    }
    await window.waitForTimeout(300);
  }

  const positions = (window: import('@playwright/test').Page) =>
    window.evaluate(() => {
      const scroller = document.querySelector('.cm-scroller') as HTMLElement;
      const preview = document.querySelector('.app-preview-pane') as HTMLElement;
      return {
        editor: scroller.scrollTop,
        preview: preview.scrollTop,
        previewMax: preview.scrollHeight - preview.clientHeight,
      };
    });

  test('preview follows the editor without toggling the view mode', async ({
    window,
  }) => {
    await window.locator('button[aria-label="Split"]').click();
    await window.waitForTimeout(400);

    const before = await positions(window);
    expect(before.previewMax, 'preview must be scrollable to test this').toBeGreaterThan(0);

    await scrollEditorToBottom(window);

    const after = await positions(window);
    expect(after.editor, 'editor should have scrolled').toBeGreaterThan(0);
    expect(after.preview, 'preview should have followed').toBeGreaterThan(0);
  });

  test('preview still follows after switching modes', async ({ window }) => {
    await window.locator('button[aria-label="Editor"]').click();
    await window.waitForTimeout(200);
    await window.locator('button[aria-label="Split"]').click();
    await window.waitForTimeout(400);

    await scrollEditorToBottom(window);

    const after = await positions(window);
    expect(after.preview).toBeGreaterThan(0);
  });
});
