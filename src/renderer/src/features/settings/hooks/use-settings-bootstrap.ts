import { useEffect, useRef } from 'react';
import { detectClosestLocale } from '@renderer/i18n';
import { useSettingsStore } from '../store';

/**
 * Loads settings from disk and keeps the native menu in the chosen language.
 *
 * On first launch the language is still at its default, which is the only
 * point where guessing from the OS locale is safe — after that the stored
 * value is the user's choice, even when it happens to be English.
 */
export function useSettingsBootstrap() {
  const language = useSettingsStore((state) => state.settings.language);
  const setSettings = useSettingsStore((state) => state.setSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const languageDetected = useRef(false);

  useEffect(() => {
    void window.marky.getSettings().then((loaded) => {
      setSettings(loaded);

      if (languageDetected.current || loaded.language !== 'en') return;
      languageDetected.current = true;

      void window.marky.getLocale().then((osLocale) => {
        const detected = detectClosestLocale(osLocale);
        if (detected !== 'en') {
          updateSettings({ language: detected });
        }
      });
    });
  }, [setSettings, updateSettings]);

  useEffect(() => {
    void window.marky.updateMenuLanguage(language);
  }, [language]);
}
