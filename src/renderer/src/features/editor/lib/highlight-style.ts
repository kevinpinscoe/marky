import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const color = {
  foreground: 'hsl(var(--syntax-foreground))',
  comment: 'hsl(var(--syntax-comment))',
  string: 'hsl(var(--syntax-string))',
  keyword: 'hsl(var(--syntax-keyword))',
  function: 'hsl(var(--syntax-function))',
  class: 'hsl(var(--syntax-class))',
  constant: 'hsl(var(--syntax-constant))',
  parameter: 'hsl(var(--syntax-parameter))',
  error: 'hsl(var(--syntax-error))',
  tag: 'hsl(var(--syntax-tag))',
  accent: 'hsl(var(--primary))',
} as const;

/**
 * One highlight style shared by every theme. Colours resolve through the
 * `--syntax-*` CSS variables, so switching palette re-tints the editor with no
 * extension reconfiguration. Covers Markdown tokens and the languages CodeMirror
 * lazily loads for fenced code blocks.
 */
export const markyHighlightStyle = HighlightStyle.define([
  // --- Markdown structural tokens ---
  { tag: t.heading, color: color.accent, fontWeight: '700' },
  { tag: t.strong, color: color.foreground, fontWeight: '700' },
  { tag: t.emphasis, color: color.foreground, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: [t.link, t.url], color: color.accent, textDecoration: 'underline' },
  { tag: t.quote, color: color.comment, fontStyle: 'italic' },
  { tag: t.monospace, color: color.string },
  { tag: t.list, color: color.keyword },
  { tag: [t.processingInstruction, t.meta], color: color.comment },

  // --- Programming-language tokens (embedded fenced code) ---
  { tag: t.comment, color: color.comment, fontStyle: 'italic' },
  { tag: [t.keyword, t.modifier, t.operatorKeyword], color: color.keyword },
  { tag: [t.string, t.special(t.string), t.regexp], color: color.string },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName)],
    color: color.function,
  },
  { tag: [t.typeName, t.className, t.namespace], color: color.class },
  {
    tag: [t.number, t.bool, t.null, t.atom, t.constant(t.variableName)],
    color: color.constant,
  },
  {
    tag: [t.propertyName, t.attributeName, t.variableName],
    color: color.parameter,
  },
  { tag: [t.tagName, t.angleBracket], color: color.tag },
  { tag: [t.operator, t.punctuation, t.separator], color: color.foreground },
  // Wavy underline rather than colour alone: error collapses into keyword, tag,
  // string and parameter once simulated for colour vision deficiency, and it is
  // the token that can least afford to be missed.
  { tag: t.invalid, color: color.error, textDecoration: 'underline wavy' },
]);
