/**
 * A long document for scroll behaviour tests.
 *
 * Deliberately mixes blocks whose editor height and rendered height disagree,
 * because that disagreement is what breaks ratio-based scroll sync:
 *
 *  - a mermaid fence is many lines of text and one short diagram
 *  - a table is compact source and a taller rendered grid
 *  - long paragraphs wrap differently in a monospace editor than in prose
 *  - headings act as checkpoints a test can look for in both panes
 *
 * `MARKERS` lists the heading text in order, so a test can scroll to one and
 * assert the same heading is showing in the preview.
 */
const LOREM = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
];

function paragraphs(count: number, seed: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const text = LOREM[(index + seed) % LOREM.length];
    return `${text}\n`;
  });
}

export const MARKERS = [
  'Alpha',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
] as const;

export const LONG_DOCUMENT = [
  '# Alpha',
  '',
  ...paragraphs(6, 0),
  '## Bravo',
  '',
  ...paragraphs(4, 2),
  // Tall in the editor, short once rendered.
  '```mermaid',
  'flowchart TD',
  ...Array.from({ length: 12 }, (_, i) => `  Node${i} --> Node${i + 1}`),
  '```',
  '',
  '## Charlie',
  '',
  ...paragraphs(8, 1),
  // Compact source, taller rendered grid.
  '| Column A | Column B | Column C |',
  '| --- | --- | --- |',
  ...Array.from(
    { length: 10 },
    (_, i) => `| value ${i}a | value ${i}b | value ${i}c |`,
  ),
  '',
  '## Delta',
  '',
  ...paragraphs(6, 3),
  '```ts',
  'export function example(input: string) {',
  ...Array.from(
    { length: 10 },
    (_, i) => `  const step${i} = input.length + ${i};`,
  ),
  '  return input;',
  '}',
  '```',
  '',
  '## Echo',
  '',
  ...paragraphs(10, 4),
  '- a list item that is long enough to wrap differently in the two panes',
  '- another item',
  '- a third item',
  '',
  '> A blockquote, which renders with padding the editor does not have.',
  '',
  '## Foxtrot',
  '',
  ...paragraphs(6, 2),
].join('\n');
