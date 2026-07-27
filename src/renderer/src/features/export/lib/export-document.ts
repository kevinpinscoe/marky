import type { ExportFont } from '@shared/types';

const fontFamilies: Record<ExportFont, string> = {
  system:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
};

function exportStyles(font: ExportFont) {
  const fontFamily = fontFamilies[font];

  return `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${fontFamily};
    font-size: 16px;
    line-height: 1.6;
    color: #24292f;
    background: #fff;
    padding: 40px 24px 80px;
  }
  article {
    max-width: 780px;
    margin: 0 auto;
  }
  h1, h2, h3, h4, h5, h6 {
    margin: 1.5em 0 0.5em;
    line-height: 1.25;
    font-weight: 600;
    color: #1a1a1a;
  }
  h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  p { margin: 0.75em 0; }
  a { color: #0969da; text-decoration: none; }
  a:hover { text-decoration: underline; }
  ul, ol { margin: 0.75em 0; padding-left: 2em; }
  li { margin: 0.25em 0; }
  li > ul, li > ol { margin: 0.25em 0; }
  blockquote {
    margin: 1em 0;
    padding: 0 1em;
    border-left: 4px solid #d0d7de;
    color: #57606a;
  }
  pre {
    margin: 1em 0;
    padding: 16px;
    overflow-x: auto;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 0.875em;
    line-height: 1.5;
  }
  code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875em;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    padding: 0.2em 0.4em;
  }
  pre code { background: transparent; border: none; padding: 0; font-size: inherit; }
  /* Static, theme-independent code highlighting (GitHub-light palette). */
  .hljs-comment, .hljs-quote { color: #6e7781; font-style: italic; }
  .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-doctag { color: #cf222e; }
  .hljs-string, .hljs-meta .hljs-string, .hljs-regexp { color: #0a3069; }
  .hljs-title, .hljs-title.function_, .hljs-section { color: #8250df; }
  .hljs-type, .hljs-title.class_, .hljs-built_in, .hljs-class .hljs-title { color: #953800; }
  .hljs-number, .hljs-symbol, .hljs-bullet { color: #0550ae; }
  .hljs-params, .hljs-attr, .hljs-attribute, .hljs-variable, .hljs-template-variable, .hljs-meta { color: #953800; }
  .hljs-name, .hljs-tag { color: #116329; }
  .hljs-deletion { color: #82071e; background: #ffebe9; }
  .hljs-addition { color: #116329; background: #dafbe1; }
  .hljs-emphasis { font-style: italic; }
  .hljs-strong { font-weight: 700; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 0.9375em;
  }
  th, td { border: 1px solid #d0d7de; padding: 8px 12px; text-align: left; }
  th { background: #f6f8fa; font-weight: 600; }
  tr:nth-child(even) { background: #f6f8fa; }
  img { max-width: 100%; height: auto; }
  hr { border: none; border-top: 1px solid #d0d7de; margin: 1.5em 0; }
  input[type="checkbox"] { margin-right: 0.4em; }
  .mermaid-figure {
    margin: 1.5em 0;
    text-align: center;
  }
  .mermaid-figure svg {
    max-width: 100%;
    height: auto;
  }
`;
}

export function createExportDocument(
  title: string,
  bodyHtml: string,
  font: ExportFont = 'system',
) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>${exportStyles(font)}</style>
  </head>
  <body>
    <article>${bodyHtml}</article>
  </body>
</html>`;
}
