import { test, expect } from './fixture';
import type { Page } from '@playwright/test';

/**
 * The font family picker is the reason #17 wanted this: it is the longest list
 * in the app, so it is the one worth driving in tests.
 */
async function openSettings(window: Page) {
  await window.locator('button[aria-label="Settings"]').click();
  await expect(window.locator('h2:has-text("Settings")')).toBeVisible();
}

const family = (window: Page) =>
  window.getByRole('combobox', { name: 'Family' }).first();

test.describe('combobox', () => {
  test.afterEach(async ({ window }) => {
    await window.keyboard.press('Escape');
    await window.keyboard.press('Escape');
  });

  test('is labelled by its own field label', async ({ window }) => {
    await openSettings(window);
    // Association through <label for>, which is why the trigger is an input
    // rather than a div with role=combobox.
    await expect(family(window)).toBeVisible();
  });

  test('reports its expanded state', async ({ window }) => {
    await openSettings(window);
    const input = family(window);

    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await input.click();
    await expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  test('opens with the keyboard alone', async ({ window }) => {
    await openSettings(window);
    const input = family(window);

    await input.focus();
    await window.keyboard.press('ArrowDown');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(window.getByRole('listbox').first()).toBeVisible();
  });

  test('points aria-activedescendant at the active option', async ({
    window,
  }) => {
    await openSettings(window);
    const input = family(window);

    await input.focus();
    await window.keyboard.press('ArrowDown');
    const first = await input.getAttribute('aria-activedescendant');
    expect(first).toBeTruthy();

    await window.keyboard.press('ArrowDown');
    const second = await input.getAttribute('aria-activedescendant');
    expect(second).not.toBe(first);

    // The id has to resolve to a real option, or a screen reader announces
    // nothing at all while the caret appears to move.
    await expect(window.locator(`#${second}`)).toHaveAttribute(
      'role',
      'option',
    );
  });

  test('filters the list as you type', async ({ window }) => {
    await openSettings(window);
    const input = family(window);

    await input.click();
    const all = await window.getByRole('option').count();

    await input.fill('mono');
    const filtered = await window.getByRole('option').count();

    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThan(all);

    for (const label of await window.getByRole('option').allInnerTexts()) {
      expect(label.toLowerCase()).toContain('mono');
    }
  });

  test('says so when nothing matches', async ({ window }) => {
    await openSettings(window);
    const input = family(window);

    await input.click();
    await input.fill('zzzznotafont');
    await expect(window.getByRole('option')).toHaveCount(0);
    await expect(window.getByText('No matches')).toBeVisible();
  });

  test('selects the active option with Enter', async ({ window }) => {
    await openSettings(window);
    const input = family(window);

    const before = await input.inputValue();
    await input.click();
    await window.keyboard.press('ArrowDown');
    const chosen = await window
      .locator('[role="option"][data-active="true"]')
      .innerText();
    await window.keyboard.press('Enter');

    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(input).toHaveValue(chosen);
    expect(chosen).not.toBe(before);
  });

  test('selects on click', async ({ window }) => {
    await openSettings(window);
    const input = family(window);

    await input.click();
    const option = window.getByRole('option').nth(2);
    const label = await option.innerText();
    await option.click();

    await expect(input).toHaveValue(label);
    await expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape closes the list and keeps the dialog open', async ({
    window,
  }) => {
    await openSettings(window);
    const input = family(window);

    await input.click();
    await expect(input).toHaveAttribute('aria-expanded', 'true');

    await window.keyboard.press('Escape');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    // The first Escape belongs to the list. Losing the whole dialog to it
    // would be the wrong thing.
    await expect(window.locator('h2:has-text("Settings")')).toBeVisible();

    await window.keyboard.press('Escape');
    await expect(window.locator('h2:has-text("Settings")')).toBeHidden();
  });

  test('abandoning a filter leaves the value alone', async ({ window }) => {
    await openSettings(window);
    const input = family(window);

    const before = await input.inputValue();
    await input.click();
    await input.fill('mono');
    await window.keyboard.press('Escape');

    await expect(input).toHaveValue(before);
  });

  test('the popup escapes the dialog scroll container', async ({ window }) => {
    await openSettings(window);

    // The export font picker sits near the bottom of a scrollable panel, which
    // is where an absolutely positioned popup would get clipped.
    const panel = window.locator('.themed-scrollbar');
    await panel.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    const input = window.locator('#settings-export-font');
    await input.click();

    const list = window.getByRole('listbox').first();
    await expect(list).toBeVisible();

    const clipped = await list.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return (
        rect.height === 0 ||
        rect.bottom > window.innerHeight ||
        rect.top < 0 ||
        rect.right > window.innerWidth
      );
    });
    expect(clipped).toBe(false);
  });
});
