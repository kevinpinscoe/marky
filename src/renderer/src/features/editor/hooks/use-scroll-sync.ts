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

/**
 * Maps an offset from one pane to the other by interpolating between the two
 * anchors that bracket it. Runs in both directions, so `from` and `to` name
 * which side is being read and which is being produced.
 */
function mapOffset(
  anchors: Anchor[],
  offset: number,
  from: keyof Anchor,
  to: keyof Anchor,
): number {
  let index = 0;
  while (index < anchors.length - 2 && anchors[index + 1][from] <= offset) {
    index++;
  }

  const start = anchors[index];
  const end = anchors[index + 1] ?? start;
  const span = end[from] - start[from];
  if (span <= 0) return start[to];

  const progress = (offset - start[from]) / span;
  return start[to] + progress * (end[to] - start[to]);
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

    /**
     * Whichever pane the user touched owns the sync until they stop.
     *
     * Both directions are live, and writing one pane's scrollTop makes the
     * browser fire the other's scroll event, so without this they would drive
     * each other. A rAF is not long enough — scroll events can land a frame or
     * more after the write — so the claim is held briefly on a timer and
     * refreshed while the same pane keeps scrolling.
     */
    let owner: 'editor' | 'preview' | null = null;
    let release: number | undefined;

    function claim(source: 'editor' | 'preview') {
      if (owner && owner !== source) return false;
      owner = source;
      window.clearTimeout(release);
      release = window.setTimeout(() => {
        owner = null;
      }, 150);
      return true;
    }

    /**
     * Anchor offsets come from layout, so they are cached and dropped whenever
     * the preview changes shape — re-rendered markdown, a mermaid diagram
     * finishing, an image loading, or the pane being resized.
     */
    function invalidate() {
      anchors = null;
    }

    /**
     * The editor's position in document coordinates, not `scrollTop`.
     * `lineBlockAt().top` measures from the first line, while `scrollTop` also
     * counts the content's padding, so mixing the two puts every anchor out by
     * that padding. `documentTop` is the document's current screen position, so
     * this subtraction lands in the same space the anchors use.
     */
    function editorOffset() {
      return scroller.getBoundingClientRect().top - editorView!.documentTop;
    }

    function handleEditorScroll() {
      if (!claim('editor')) return;

      anchors ??= buildAnchors(editorView!, previewElement!);

      const previewMax =
        previewElement!.scrollHeight - previewElement!.clientHeight;
      if (previewMax <= 0) return;

      const target = mapOffset(
        anchors,
        editorOffset(),
        'editorTop',
        'previewTop',
      );
      previewElement!.scrollTop = Math.max(0, Math.min(previewMax, target));
    }

    function handlePreviewScroll() {
      if (!claim('preview')) return;

      anchors ??= buildAnchors(editorView!, previewElement!);

      const target = mapOffset(
        anchors,
        previewElement!.scrollTop,
        'previewTop',
        'editorTop',
      );

      // Applied as a delta: converting a document offset back to a scrollTop
      // would need the content padding this deliberately avoids measuring.
      const delta = target - editorOffset();
      if (Math.abs(delta) < 1) return;

      scroller.scrollTop = Math.max(
        0,
        Math.min(
          scroller.scrollHeight - scroller.clientHeight,
          scroller.scrollTop + delta,
        ),
      );
    }

    const mutations = new MutationObserver(invalidate);
    mutations.observe(previewElement, { childList: true, subtree: true });

    const resizes = new ResizeObserver(invalidate);
    resizes.observe(previewElement);
    resizes.observe(scroller);

    scroller.addEventListener('scroll', handleEditorScroll, { passive: true });
    previewElement.addEventListener('scroll', handlePreviewScroll, {
      passive: true,
    });

    return () => {
      scroller.removeEventListener('scroll', handleEditorScroll);
      previewElement.removeEventListener('scroll', handlePreviewScroll);
      window.clearTimeout(release);
      mutations.disconnect();
      resizes.disconnect();
    };
  }, [editorView, previewRef, viewMode]);
}
