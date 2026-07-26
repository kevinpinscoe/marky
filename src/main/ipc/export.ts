import { BrowserWindow, dialog, ipcMain } from 'electron';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ipcChannels } from '@shared/contracts';
import { defaultAppSettings } from '@shared/settings';
import type { ExportPayload } from '@shared/types';

const MM_PER_INCH = 25.4;

async function createPdfWindow(htmlDocument: string): Promise<{
  window: BrowserWindow;
  tempPath: string;
}> {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
    },
  });

  const tempPath = join(tmpdir(), `marky-pdf-${Date.now()}.html`);
  await writeFile(tempPath, htmlDocument, 'utf-8');

  await new Promise<void>((resolve, reject) => {
    window.webContents.once('did-finish-load', resolve);
    window.webContents.once('did-fail-load', (_, code, desc) =>
      reject(new Error(`Failed to load export page: ${desc} (${code})`)),
    );
    void window.loadFile(tempPath);
  });

  return { window, tempPath };
}

export function registerExportIpc() {
  ipcMain.handle(ipcChannels.exportHtml, async (_, payload: ExportPayload) => {
    const result = await dialog.showSaveDialog({
      defaultPath: payload.suggestedName.replace(/\.md$/i, '.html'),
      filters: [{ name: 'HTML', extensions: ['html'] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true, path: null };
    }

    await writeFile(result.filePath, payload.htmlDocument, 'utf8');

    return { canceled: false, path: result.filePath };
  });

  ipcMain.handle(ipcChannels.exportPdf, async (_, payload: ExportPayload) => {
    const result = await dialog.showSaveDialog({
      defaultPath: payload.suggestedName.replace(/\.md$/i, '.pdf'),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true, path: null };
    }

    const { window: exportWindow, tempPath } = await createPdfWindow(
      payload.htmlDocument,
    );

    try {
      const m = payload.pdfOptions?.margins ?? defaultAppSettings.pdfMargins;
      const pageSize =
        payload.pdfOptions?.pageSize ?? defaultAppSettings.pdfPageSize;

      const pdfBuffer = await exportWindow.webContents.printToPDF({
        printBackground: true,
        pageSize,
        margins: {
          marginType: 'custom',
          // Electron expects inches; settings are stored in mm
          top: m.top / MM_PER_INCH,
          right: m.right / MM_PER_INCH,
          bottom: m.bottom / MM_PER_INCH,
          left: m.left / MM_PER_INCH,
        },
      });

      await writeFile(result.filePath, pdfBuffer);
    } finally {
      exportWindow.destroy();
      void unlink(tempPath).catch(() => undefined);
    }

    return { canceled: false, path: result.filePath };
  });
}
