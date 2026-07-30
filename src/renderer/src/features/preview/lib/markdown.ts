import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import type { Root } from 'hast';
import { visit } from 'unist-util-visit';
import { dirname } from '@renderer/lib/paths';

function isRelativePath(src: string): boolean {
  try {
    new URL(src);
    return false;
  } catch {
    return !src.startsWith('data:');
  }
}

function toLocalAssetUrl(baseDir: string, relativePath: string): string {
  return `local-asset://asset?base=${encodeURIComponent(baseDir)}&path=${encodeURIComponent(relativePath)}`;
}

const safeLinkSchemes = new Set(['http', 'https', 'mailto']);

function isSafeHref(href: string): boolean {
  if (href.startsWith('#')) return true;

  // No scheme means a relative link. Those resolve against the app document and
  // are handled by the main process navigation policy.
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1];
  if (!scheme) return true;

  return safeLinkSchemes.has(scheme.toLowerCase());
}

/**
 * Markdown is untrusted input, and the renderer holds the preload bridge.
 * `[x](javascript:...)` would otherwise be a live script href.
 */
function rehypeDropUnsafeLinks() {
  return () => (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;

      const href = node.properties.href;
      if (typeof href === 'string' && !isSafeHref(href)) {
        delete node.properties.href;
      }
    });
  };
}

function rehypeResolveLocalImages(baseDir: string) {
  return () => (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img' && typeof node.properties.src === 'string') {
        const src = node.properties.src;
        if (isRelativePath(src)) {
          node.properties.src = toLocalAssetUrl(baseDir, src);
        }
      }
    });
  };
}

/**
 * Records which source line each top-level block came from.
 *
 * Scroll sync uses these to line the preview up with the text the editor is
 * actually showing. Without them it can only match scrollbar percentages, which
 * drifts as soon as the two panes disagree about height — a tall mermaid block
 * in the editor is a short diagram once rendered.
 *
 * Only top-level blocks are marked: enough to anchor the mapping, and it keeps
 * the markup free of attributes on every inline element.
 */
function rehypeSourceLines() {
  return () => (tree: Root) => {
    for (const node of tree.children) {
      if (node.type !== 'element') continue;

      const line = node.position?.start.line;
      if (typeof line === 'number') {
        node.properties = {
          ...node.properties,
          'data-source-line': String(line),
        };
      }
    }
  };
}

function createProcessor(baseDir?: string, sourceLines = false) {
  const pipeline = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkRehype);

  // Before rehypeHighlight, which rewrites the inside of code blocks.
  if (sourceLines) {
    pipeline.use(rehypeSourceLines());
  }

  pipeline
    .use(rehypeDropUnsafeLinks())
    // Mermaid blocks are rendered by the preview/export, so leave them as plain
    // text; unknown languages are ignored rather than throwing.
    .use(rehypeHighlight, { plainText: ['mermaid'], ignoreMissing: true });

  if (baseDir) {
    pipeline.use(rehypeResolveLocalImages(baseDir));
  }

  return pipeline.use(rehypeStringify);
}

const defaultProcessor = createProcessor();
const sourceLineProcessor = createProcessor(undefined, true);

/**
 * `sourceLines` adds a `data-source-line` attribute to each top-level block.
 * The preview asks for them so scroll sync can map text to rendered output;
 * export leaves them off so the written HTML stays clean.
 */
export function renderMarkdown(
  markdown: string,
  documentPath?: string | null,
  options?: { sourceLines?: boolean },
) {
  const sourceLines = options?.sourceLines ?? false;
  const baseDir = documentPath ? dirname(documentPath) : '';

  if (baseDir) {
    return createProcessor(baseDir, sourceLines)
      .processSync(markdown)
      .toString();
  }

  return (sourceLines ? sourceLineProcessor : defaultProcessor)
    .processSync(markdown)
    .toString();
}
