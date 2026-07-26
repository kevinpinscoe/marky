import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '@renderer/features/settings/store';
import { defaultAppSettings } from '@shared/settings';
import type { AppSettings } from '@shared/types';

const setSettings = vi.fn();

beforeEach(() => {
  setSettings.mockClear();
  vi.stubGlobal('window', { marky: { setSettings } });
  useSettingsStore.setState({ settings: defaultAppSettings });
});

function persistedSettings(): AppSettings {
  expect(setSettings).toHaveBeenCalledTimes(1);
  return setSettings.mock.calls[0][0] as AppSettings;
}

describe('useSettingsStore', () => {
  it('persists whatever updateSettings changes', () => {
    useSettingsStore.getState().updateSettings({ theme: 'dark' });

    expect(useSettingsStore.getState().settings.theme).toBe('dark');
    expect(persistedSettings().theme).toBe('dark');
  });

  it('does not persist on setSettings, which loads from disk', () => {
    useSettingsStore.getState().setSettings({
      ...defaultAppSettings,
      theme: 'dark',
    });

    expect(setSettings).not.toHaveBeenCalled();
  });

  it('persists an added recent file', () => {
    useSettingsStore.getState().addRecentFile('/a.md');

    expect(persistedSettings().recentFiles).toEqual(['/a.md']);
  });

  it('moves a repeated recent file back to the front without duplicating it', () => {
    const store = useSettingsStore.getState();
    store.addRecentFile('/a.md');
    store.addRecentFile('/b.md');
    store.addRecentFile('/a.md');

    expect(useSettingsStore.getState().settings.recentFiles).toEqual([
      '/a.md',
      '/b.md',
    ]);
  });

  it('keeps at most ten recent files', () => {
    const store = useSettingsStore.getState();
    for (let i = 0; i < 12; i += 1) {
      store.addRecentFile(`/file-${i}.md`);
    }

    const { recentFiles } = useSettingsStore.getState().settings;
    expect(recentFiles).toHaveLength(10);
    expect(recentFiles[0]).toBe('/file-11.md');
  });

  it('persists a removed recent file', () => {
    useSettingsStore.setState({
      settings: { ...defaultAppSettings, recentFiles: ['/a.md', '/b.md'] },
    });

    useSettingsStore.getState().removeRecentFile('/a.md');

    expect(persistedSettings().recentFiles).toEqual(['/b.md']);
  });

  it('persists a cleared recent file list', () => {
    useSettingsStore.setState({
      settings: { ...defaultAppSettings, recentFiles: ['/a.md'] },
    });

    useSettingsStore.getState().clearRecentFiles();

    expect(persistedSettings().recentFiles).toEqual([]);
  });
});
