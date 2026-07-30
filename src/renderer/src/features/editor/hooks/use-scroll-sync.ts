import { useEffect, type RefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import type { ViewMode } from '@shared/types';

/**
 * Keep the preview showing the same text as the editor.
 *
 * Matching scroll ratios is not enough: the two panes disagree about height, so
 * the same percentage points at different content. A twenty line mermaid block
 * is tall in the editor and a short diagram once rendered, and every such block
 * pushes the panes further apart.
 *
 * Instead the preview marks each top-level block with the source line it came
 * from (see rehypeSourceLines). Those shared lines are anchors: for each one we
 * know its offset in the editor and its offset in the preview, which gives a
 * piecewise-linear map between the two. Between anchors the mapping interpolates,
 * so scrolling stays smooth rather than jumping block to block.
 */
type Anchor = { editorTop: number; previewTop: number };

function buildAnchors(
  editorView: EditorView,
  previewElement: HTMLElement,
): Anchor[] {
  const doc = editorView.state.doc;
  const previewTop = previewElement.getBoundingClientRect().top;
  const scrollTop = previewElement.scrollTop;

  // Both panes start together, so the document head is always an anchor.
  const anchors: Anchor[] = [{ editorTop: 0, previewTop: 0 }];

  for (const element of previewElement.querySelectorAll<HTMLElement>(
    '[data-source-line]',
  )) {
    const line = Number(element.dataset.sourceLine);
    if (!Number.isFinite(line) || line < 1 || line > doc.lines) continue;

    anchors.push({
      editorTop: editorView.lineBlockAt(doc.line(line).from).top,
      previewTop: element.getBoundingClientRect().top - previewTop + scrollTop,
    });
  }

  // And they end together, which keeps the last block reachable.
  anchors.push({
    editorTop: editorView.contentHeight,
    previewTop: previewElement.scrollHeight,
  });

  return anchors.sort((a, b) => a.editorTop - b.editorTop);
}

function mapOffset(anchors: Anchor[], editorOffset: number): number {
  let index = 0;
  while (
    index < anchors.length - 2 &&
    anchors[index + 1].editorTop <= editorOffset
  ) {
    index++;
  }

  const from = anchors[index];
  const to = anchors[index + 1] ?? from;
  const span = to.editorTop - from.editorTop;
  if (span <= 0) return from.previewTop;

  const progress = (editorOffset - from.editorTop) / span;
  return from.previewTop + progress * (to.previewTop - from.previewTop);
}

export function useScrollSync(
  /**
   * Passed by value rather than as a ref. A ref's current value cannot be an
   * effect dependency, and CodeMirror reports its view after the first commit,
   * so reading one here would attach the listener only on a later run — which
   * meant sync stayed dead until the view mode was toggled.
   */
  editorView: EditorView | null,
  previewRef: RefObject<HTMLElement | null>,
  viewMode: ViewMode,
) {
  useEffect(() => {
    if (viewMode !== 'split') return;

    const previewElement = previewRef.current;
    if (!editorView || !previewElement) return;

    const scroller = editorView.scrollDOM;
    let anchors: Anchor[] | null = null;
    let isSyncing = false;

    /**
     * Anchor offsets come from layout, so they are cached and dropped whenever
     * the preview changes shape — re-rendered markdown, a mermaid diagram
     * finishing, an image loading, or the pane being resized.
     */
    function invalidate() {
      anchors = null;
    }

    function handleEditorScroll() {
      if (isSyncing) return;

      anchors ??= buildAnchors(editorView!, previewElement!);

      const previewMax =
        previewElement!.scrollHeight - previewElement!.clientHeight;
      if (previewMax <= 0) return;

      /**
       * Document coordinates, not `scrollTop`. `lineBlockAt().top` measures from
       * the first line, while `scrollTop` also counts the content's padding, so
       * mixing the two puts every anchor out by that padding. `documentTop` is
       * the document's current screen position, so this subtraction lands in the
       * same space the anchors use.
       */
      const editorOffset =
        scroller.getBoundingClientRect().top - editorView!.documentTop;

      const target = mapOffset(anchors, editorOffset);

      isSyncing = true;
      previewElement!.scrollTop = Math.max(0, Math.min(previewMax, target));
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    }

    const mutations = new MutationObserver(invalidate);
    mutations.observe(previewElement, { childList: true, subtree: true });

    const resizes = new ResizeObserver(invalidate);
    resizes.observe(previewElement);
    resizes.observe(scroller);

    scroller.addEventListener('scroll', handleEditorScroll, { passive: true });

    return () => {
      scroller.removeEventListener('scroll', handleEditorScroll);
      mutations.disconnect();
      resizes.disconnect();
    };
  }, [editorView, previewRef, viewMode]);
}
