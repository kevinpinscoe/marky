import { useEffect } from 'react';
import {
  toEditorFontFamilyCss,
  toPreviewFontFamilyCss,
} from '../lib/font-options';
import { useSettingsStore } from '../store';

/** Reflects the appearance settings onto the document element. */
export function useAppearance() {
  const theme = useSettingsStore((state) => state.settings.theme);
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

  useEffect(() => {
    const root = globalThis.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
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
