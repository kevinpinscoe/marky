import { renderMarkdown } from '@renderer/features/preview/lib/markdown';
import type { DocumentHandle, ExportFont } from '@shared/types';
import { createExportDocument } from './export-document';
import { renderMermaidInHtml, substituteMermaidSvgs } from './render-mermaid';

/**
 * Turns a document into the standalone HTML both exports write.
 *
 * Diagrams are rendered here rather than in the main process, which keeps
 * exports offline and free of external tooling. `previewEl` is an
 * optimisation: any diagram the preview already drew is reused as-is, and
 * only the rest go through mermaid again.
 */
export async function buildExportHtml(
  activeDocument: DocumentHandle,
  exportFont: ExportFont,
  previewEl: HTMLElement | null,
): Promise<string> {
  const baseHtml = renderMarkdown(activeDocument.content);
  const withPreviewDiagrams = substituteMermaidSvgs(baseHtml, previewEl);
  const bodyHtml = await renderMermaidInHtml(withPreviewDiagrams);

  return createExportDocument(activeDocument.name, bodyHtml, exportFont);
}
