import { HighlightStyle } from '@codemirror/language';
import type { Tag } from '@lezer/highlight';
import {
  flowchartTags,
  ganttTags,
  journeyTags,
  mermaidTags,
  mindmapTags,
  pieTags,
  requirementTags,
  sequenceTags,
} from 'codemirror-lang-mermaid';

const color = {
  foreground: 'hsl(var(--syntax-foreground))',
  comment: 'hsl(var(--syntax-comment))',
  string: 'hsl(var(--syntax-string))',
  keyword: 'hsl(var(--syntax-keyword))',
  function: 'hsl(var(--syntax-function))',
  constant: 'hsl(var(--syntax-constant))',
  parameter: 'hsl(var(--syntax-parameter))',
} as const;

/**
 * `codemirror-lang-mermaid` styles its grammar with its own `Tag` objects
 * rather than the standard `@lezer/highlight` tags, so the shared editor
 * highlight style cannot colour them. Map each tag to the theme palette by the
 * role its name implies.
 */
function colorFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('comment')) return color.comment;
  if (n.includes('text') || n.includes('string') || n.includes('title'))
    return color.string;
  if (n.includes('number') || n.includes('score')) return color.constant;
  if (n.includes('arrow') || n.includes('link') || n.includes('edge'))
    return color.function;
  if (
    n.includes('keyword') ||
    n === 'diagramname' ||
    n === 'orientation' ||
    n === 'showdata'
  )
    return color.keyword;
  if (n === 'nodeid' || n === 'actor' || n === 'position')
    return color.parameter;
  return color.foreground;
}

const tagGroups: Array<Record<string, Tag>> = [
  mermaidTags,
  mindmapTags,
  pieTags,
  flowchartTags,
  sequenceTags,
  journeyTags,
  requirementTags,
  ganttTags,
];

const specs = tagGroups.flatMap((group) =>
  Object.entries(group).map(([name, tag]) => ({ tag, color: colorFor(name) })),
);

export const mermaidHighlightStyle = HighlightStyle.define(specs);
