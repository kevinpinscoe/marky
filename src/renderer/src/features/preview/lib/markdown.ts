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

function createProcessor(baseDir?: string) {
  const pipeline = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkRehype)
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

export function renderMarkdown(markdown: string, documentPath?: string | null) {
  const baseDir = documentPath ? dirname(documentPath) : '';
  if (baseDir) {
    return createProcessor(baseDir).processSync(markdown).toString();
  }
  return defaultProcessor.processSync(markdown).toString();
}
