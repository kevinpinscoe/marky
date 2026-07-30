import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@renderer/features/preview/lib/markdown';

describe('renderMarkdown', () => {
  it('renders a paragraph', () => {
    expect(renderMarkdown('Hello world')).toBe('<p>Hello world</p>');
  });

  it('renders headings', () => {
    expect(renderMarkdown('# Title')).toBe('<h1>Title</h1>');
    expect(renderMarkdown('## Subtitle')).toBe('<h2>Subtitle</h2>');
  });

  it('renders inline formatting', () => {
    expect(renderMarkdown('**bold**')).toBe('<p><strong>bold</strong></p>');
    expect(renderMarkdown('*italic*')).toBe('<p><em>italic</em></p>');
    expect(renderMarkdown('~~struck~~')).toBe('<p><del>struck</del></p>');
  });

  it('renders links', () => {
    expect(renderMarkdown('[text](https://example.com)')).toBe(
      '<p><a href="https://example.com">text</a></p>',
    );
  });

  it('keeps mailto and anchor links', () => {
    expect(renderMarkdown('[mail](mailto:a@b.com)')).toContain(
      'href="mailto:a@b.com"',
    );
    expect(renderMarkdown('[jump](#section)')).toContain('href="#section"');
  });

  it('drops javascript: hrefs', () => {
    const html = renderMarkdown('[x](javascript:alert&#40;1&#41;)');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<a>x</a>');
  });

  it('drops javascript: hrefs regardless of case', () => {
    expect(renderMarkdown('[x](JavaScript:alert&#40;1&#41;)')).toContain(
      '<a>x</a>',
    );
  });

  it('drops other executable schemes', () => {
    expect(renderMarkdown('[x](vbscript:msgbox)')).not.toContain('vbscript:');
    expect(renderMarkdown('[x](data:text/html,<b>hi</b>)')).not.toContain(
      'href="data:',
    );
  });

  it('keeps relative links', () => {
    expect(renderMarkdown('[other](./notes.md)')).toContain(
      'href="./notes.md"',
    );
  });

  it('renders unordered lists', () => {
    const md = '- one\n- two\n- three';
    const html = renderMarkdown(md);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
    expect(html).toContain('<li>three</li>');
  });

  it('renders ordered lists', () => {
    const md = '1. first\n2. second';
    const html = renderMarkdown(md);
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>first</li>');
    expect(html).toContain('<li>second</li>');
  });

  it('renders code blocks', () => {
    const md = '```\nconsole.log("hi")\n```';
    const html = renderMarkdown(md);
    expect(html).toContain('<pre>');
    expect(html).toContain('<code>');
  });

  it('renders inline code', () => {
    expect(renderMarkdown('use `npm install`')).toContain(
      '<code>npm install</code>',
    );
  });

  it('renders blockquotes', () => {
    expect(renderMarkdown('> a quote')).toContain('<blockquote>');
  });

  it('renders GFM tables', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const html = renderMarkdown(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('renders GFM task lists', () => {
    const md = '- [ ] todo\n- [x] done';
    const html = renderMarkdown(md);
    expect(html).toContain('type="checkbox"');
  });

  it('preserves mermaid code blocks for downstream processing', () => {
    const md = '```mermaid\nflowchart LR\n  A --> B\n```';
    const html = renderMarkdown(md);
    expect(html).toContain('language-mermaid');
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('renders line breaks (remark-breaks)', () => {
    const md = 'line one\nline two';
    const html = renderMarkdown(md);
    expect(html).toContain('<br>');
  });

  describe('source lines', () => {
    const md = '# One\n\nsecond\n\n## Third\n';

    it('are absent by default, so exported HTML stays clean', () => {
      expect(renderMarkdown(md)).not.toContain('data-source-line');
    });

    it('mark each top-level block with the line it came from', () => {
      const html = renderMarkdown(md, null, { sourceLines: true });
      expect(html).toContain('<h1 data-source-line="1">');
      expect(html).toContain('<p data-source-line="3">');
      expect(html).toContain('<h2 data-source-line="5">');
    });

    it('does not annotate inline elements', () => {
      const html = renderMarkdown('a **bold** word', null, {
        sourceLines: true,
      });
      expect(html).toBe(
        '<p data-source-line="1">a <strong>bold</strong> word</p>',
      );
    });
  });
});
