import { create } from 'zustand';
import { defaultAppSettings } from '@shared/settings';
import type { AppSettings } from '@shared/types';

const RECENT_FILES_LIMIT = 10;

type SettingsStoreState = {
  settings: AppSettings;
  isOpen: boolean;
  isHelpOpen: boolean;
  /** Replaces settings without writing them back — for the initial load. */
  setSettings: (settings: AppSettings) => void;
  /** Applies a change and persists the result. */
  updateSettings: (patch: Partial<AppSettings>) => void;
  addRecentFile: (path: string) => void;
  removeRecentFile: (path: string) => void;
  clearRecentFiles: () => void;
  openDialog: () => void;
  closeDialog: () => void;
  openHelp: () => void;
  closeHelp: () => void;
};

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  settings: defaultAppSettings,
  isOpen: false,
  isHelpOpen: false,
  setSettings: (settings) => set({ settings }),
  updateSettings: (patch) => {
    const next: AppSettings = { ...get().settings, ...patch };
    set({ settings: next });
    void window.marky.setSettings(next);
  },
  addRecentFile: (path) => {
    const previous = get().settings.recentFiles;
    get().updateSettings({
      recentFiles: [path, ...previous.filter((p) => p !== path)].slice(
        0,
        RECENT_FILES_LIMIT,
      ),
    });
  },
  removeRecentFile: (path) => {
    get().updateSettings({
      recentFiles: get().settings.recentFiles.filter((p) => p !== path),
    });
  },
  clearRecentFiles: () => {
    get().updateSettings({ recentFiles: [] });
  },
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  openHelp: () => set({ isHelpOpen: true }),
  closeHelp: () => set({ isHelpOpen: false }),
}));
