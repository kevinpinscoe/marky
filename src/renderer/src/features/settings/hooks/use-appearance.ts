import { useLayoutEffect } from 'react';
import {
  toEditorFontFamilyCss,
  toPreviewFontFamilyCss,
} from '../lib/font-options';
import { useSettingsStore } from '../store';

/**
 * Reflects the appearance settings onto the document element.
 *
 * Uses layout effects so the theme class and CSS variables land on `<html>`
 * before any component's passive effect reads computed styles. Passive effects
 * run child-before-parent, so a plain effect here (this hook lives at the app
 * root) would apply the theme *after* the preview re-renders — leaving Mermaid
 * diagrams drawn with the previous palette's variables.
 */
export function useAppearance() {
  const theme = useSettingsStore((state) => state.settings.theme);
  const colorTheme = useSettingsStore((state) => state.settings.colorTheme);
  const editorFontFamily = useSettingsStore(
    (state) => state.settings.editorFontFamily,
  );
  const editorFontSize = useSettingsStore(
    (state) => state.settings.editorFontSize,
  );
  const previewFontFamily = useSettingsStore(
    (state) => state.settings.previewFontFamily,
  );
  const previewFontSize = useSettingsStore(
    (state) => state.settings.previewFontSize,
  );

  useLayoutEffect(() => {
    const root = globalThis.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useLayoutEffect(() => {
    const root = globalThis.document.documentElement;
    root.setAttribute('data-color-theme', colorTheme);
  }, [colorTheme]);

  useLayoutEffect(() => {
    const root = globalThis.document.documentElement;
    root.style.setProperty(
      '--editor-font-family',
      toEditorFontFamilyCss(editorFontFamily),
    );
    root.style.setProperty('--editor-font-size', `${editorFontSize}px`);
    root.style.setProperty(
      '--preview-font-family',
      toPreviewFontFamilyCss(previewFontFamily),
    );
    root.style.setProperty('--preview-font-size', `${previewFontSize}px`);
  }, [editorFontFamily, editorFontSize, previewFontFamily, previewFontSize]);
}
