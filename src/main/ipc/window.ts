import { ipcMain, BrowserWindow } from 'electron';
import { ipcChannels } from '@shared/contracts';

/**
 * The title bar mirrors the maximized state, so push it instead of making the
 * renderer poll for it.
 */
export function forwardMaximizedState(window: BrowserWindow) {
  const send = (isMaximized: boolean) => {
    if (window.isDestroyed()) return;
    window.webContents.send(ipcChannels.windowMaximizedChanged, isMaximized);
  };

  window.on('maximize', () => send(true));
  window.on('unmaximize', () => send(false));
}

export function registerWindowIpc() {
  ipcMain.on(ipcChannels.windowMinimize, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.minimize();
  });

  ipcMain.on(ipcChannels.windowMaximize, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window?.isMaximized()) {
      window.unmaximize();
    } else {
      window?.maximize();
    }
  });

  ipcMain.on(ipcChannels.windowClose, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.close();
  });

  ipcMain.handle(ipcChannels.windowIsMaximized, (event): boolean => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window?.isMaximized() ?? false;
  });
}
