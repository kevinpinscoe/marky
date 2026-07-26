import { shell, type BrowserWindow } from 'electron';

const externalSchemes = new Set(['http:', 'https:', 'mailto:']);

function openExternal(url: string) {
  let protocol: string;

  try {
    protocol = new URL(url).protocol;
  } catch {
    return;
  }

  if (!externalSchemes.has(protocol)) return;

  void shell.openExternal(url);
}

function isInternalNavigation(target: string, current: string): boolean {
  try {
    const to = new URL(target);
    const from = new URL(current);

    if (to.protocol !== from.protocol) return false;
    // The packaged app is served from file://, where every URL shares the same
    // null origin, so compare the document itself instead.
    if (to.protocol === 'file:') return to.pathname === from.pathname;

    return to.origin === from.origin;
  } catch {
    return false;
  }
}

/**
 * The renderer holds the preload bridge, so any navigation away from the app
 * document would hand `window.marky` to a foreign page. Links in preview
 * content are opened in the user's browser instead.
 */
export function applyNavigationPolicy(window: BrowserWindow) {
  const { webContents } = window;

  webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });

  webContents.on('will-navigate', (event, url) => {
    if (isInternalNavigation(url, webContents.getURL())) return;

    event.preventDefault();
    openExternal(url);
  });
}
