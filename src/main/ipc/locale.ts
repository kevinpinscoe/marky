import { app, ipcMain, type BrowserWindow } from 'electron';
import { ipcChannels } from '@shared/contracts';
import type { Locale } from '@shared/types';
import { createAppMenu } from '../menu';

export function registerLocaleIpc(getWindow: () => BrowserWindow | null) {
  ipcMain.handle(ipcChannels.getLocale, (): string => {
    return process.env.MARKY_FORCE_LOCALE ?? app.getLocale();
  });

  ipcMain.handle(ipcChannels.updateMenuLanguage, (_, locale: Locale): void => {
    const win = getWindow();
    if (win) {
      createAppMenu(win, locale);
    }
  });
}
