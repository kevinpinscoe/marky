import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
import type { Locale } from '../../src/shared/types';
import { en } from '../../src/renderer/src/i18n/en';
import { ptBR } from '../../src/renderer/src/i18n/pt-BR';
import { es } from '../../src/renderer/src/i18n/es';

/**
 * Visual baselines for the dialog surfaces.
 *
 * #19 added typography tokens and a lint rule, which catch drift in the code.
 * Neither catches a spacing or colour regression that lints clean, which is
 * what these are for.
 *
 * Linux only, deliberately. CI runs e2e on ubuntu under xvfb, and font
 * rasterisation and the system-ui fallback differ enough between platforms
 * that a Windows or macOS baseline is a different image rather than a noisy
 * one. One platform is the source of truth; elsewhere these skip rather than
 * fail, so a contributor on another OS is not blocked by images they cannot
 * reproduce.
 *
 * To regenerate after an intentional design change, from a Linux checkout:
 *
 *     npm run build && npx playwright test tests/e2e/screenshots.test.ts \
 *       --update-snapshots
 *
 * Without Linux to hand, run the "Tests" workflow manually against the branch
 * (`gh workflow run test.yml --ref <branch>`). The update-screenshots job
 * captures them under xvfb and uploads them as an artifact to commit.
 */
test.describe('dialog screenshots', () => {
  test.skip(
    process.platform !== 'linux',
    'baselines are captured on Linux, which is what CI runs',
  );

  const DICTIONARIES: Record<Locale, typeof en> = {
    en,
    'pt-BR': ptBR,
    es,
  };

  /**
   * Labels are translated, so the selectors have to be too. Reading them from
   * the same dictionaries the components use means a renamed key fails
   * typecheck rather than producing a mystery timeout.
   */
  const label = (locale: Locale, key: keyof typeof en) =>
    `button[aria-label="${DICTIONARIES[locale][key]}"]`;

  /**
   * Matches whatever locale the app is currently in. Needed to reach Settings
   * before the language is known, and to reset afterwards even if a test
   * failed partway through.
   */
  const labelAnyLocale = (key: keyof typeof en) =>
    (Object.keys(DICTIONARIES) as Locale[])
      .map((locale) => label(locale, key))
      .join(', ');

  /** The dialog panel only. Keeps editor content out of every diff. */
  const panel = (window: Page) => window.locator('[role="dialog"]');

  /**
   * Drives language, theme and colour theme through the settings UI rather
   * than by setting the class on the root element. Toggling `dark` directly
   * leaves the store thinking it is still light, which paints a dark panel
   * with the Light button active — a state the app cannot actually be in, and
   * exactly the sort of thing these baselines exist to catch.
   */
  async function configure(
    window: Page,
    { locale, theme }: { locale: Locale; theme: 'light' | 'dark' },
  ) {
    await window.locator(labelAnyLocale('titlebar.settings')).click();
    const dialog = panel(window);

    // Language is a combobox now, and its option labels are the language's own
    // name, so they do not move with the current locale.
    const LANGUAGE_LABELS: Record<Locale, string> = {
      en: 'English',
      'pt-BR': 'Português (Brasil)',
      es: 'Español',
    };
    await dialog.locator('#settings-language').click();
    await window
      .getByRole('option', { name: LANGUAGE_LABELS[locale], exact: true })
      .click();

    const dict = DICTIONARIES[locale];

    await dialog
      .getByRole('group', { name: dict['settings.theme'] })
      .getByRole('button', {
        name: theme === 'dark' ? dict['settings.dark'] : dict['settings.light'],
      })
      .click();

    // Pinned. theme-contrast.test.ts already covers all twelve palettes, and
    // shooting them here would multiply the baselines by six for no extra
    // layout coverage.
    await dialog
      .getByRole('group', { name: dict['settings.colorTheme'] })
      .getByRole('button', { name: 'Amethyst' })
      .click();

    await window.keyboard.press('Escape');
  }

  // The app is shared across the whole e2e run, so anything left behind here
  // would break every later spec that looks for an English label.
  test.afterEach(async ({ window }) => {
    // Twice: a test that left a combobox open spends the first Escape on the
    // list and would otherwise leave the dialog covering the settings button
    // that configure() needs to click. A spare Escape is harmless.
    await window.keyboard.press('Escape');
    await window.keyboard.press('Escape');
    await configure(window, { locale: 'en', theme: 'light' });
  });

  const DIALOGS = [
    {
      name: 'settings',
      open: async (window: Page, locale: Locale) => {
        await window.locator(label(locale, 'titlebar.settings')).click();
      },
    },
    {
      name: 'settings-scrolled',
      open: async (window: Page, locale: Locale) => {
        await window.locator(label(locale, 'titlebar.settings')).click();
        await panel(window)
          .locator('[class*="overflow-y-auto"]')
          .first()
          .evaluate((node) => {
            node.scrollTop = node.scrollHeight;
          });
      },
    },
    {
      name: 'help',
      open: async (window: Page, locale: Locale) => {
        await window
          .locator(label(locale, 'titlebar.keyboardShortcuts'))
          .click();
      },
    },
    {
      name: 'insert-link',
      open: async (window: Page, locale: Locale) => {
        await window.locator(label(locale, 'titlebar.viewSplit')).click();
        await window.locator(label(locale, 'toolbar.link')).click();
      },
    },
    {
      name: 'insert-image',
      open: async (window: Page, locale: Locale) => {
        await window.locator(label(locale, 'titlebar.viewSplit')).click();
        await window.locator(label(locale, 'toolbar.image')).click();
      },
    },
  ];

  /**
   * The open list, which none of the dialog shots reach: it renders through a
   * portal outside [role="dialog"], and it is closed while those are taken.
   * It is also the surface #17 was actually about, the one the operating
   * system used to draw.
   *
   * The language picker rather than a font picker on purpose. Font options come
   * from whatever is installed on the machine, so a runner image gaining or
   * losing a family would churn the baseline for no reason.
   */
  for (const theme of ['light', 'dark'] as const) {
    test(`combobox-open / ${theme} / en`, async ({ window }) => {
      await configure(window, { locale: 'en', theme });
      await window.locator(label('en', 'titlebar.settings')).click();
      await window.locator('#settings-language').click();

      const list = window.getByRole('listbox').first();
      await expect(list).toBeVisible();

      await expect(list).toHaveScreenshot(`combobox-open-${theme}-en.png`, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.01,
      });
    });
  }

  for (const locale of ['en', 'pt-BR'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      for (const dialog of DIALOGS) {
        test(`${dialog.name} / ${theme} / ${locale}`, async ({ window }) => {
          await configure(window, { locale, theme });
          await dialog.open(window, locale);

          const target = panel(window);
          await expect(target).toBeVisible();

          await expect(target).toHaveScreenshot(
            `${dialog.name}-${theme}-${locale}.png`,
            {
              // The caret in a focused text field blinks, and the font pickers
              // paint their sample text a frame late.
              animations: 'disabled',
              maxDiffPixelRatio: 0.01,
            },
          );
        });
      }
    }
  }
});
