import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

/** First ancestor of `node` — itself included — whose type name is in `names`. */
export function findAncestor(node: SyntaxNode | null, names: string[]) {
  let current = node;

  while (current) {
    if (names.includes(current.type.name)) {
      return current;
    }
    current = current.parent;
  }

  return null;
}

/** Same, resolving from a document position. */
export function resolveAncestor(
  state: EditorState,
  position: number,
  names: string[],
) {
  return findAncestor(syntaxTree(state).resolveInner(position, -1), names);
}

/**
 * Same, but also probing one character either side.
 *
 * A cursor sitting exactly on a node boundary — just after a closing `|`, say
 * — resolves outside the node the user means, so a strict lookup misses it.
 */
export function resolveAncestorNearby(
  state: EditorState,
  position: number,
  names: string[],
) {
  const probes = new Set(
    [position, position - 1, position + 1].filter(
      (probe) => probe >= 0 && probe <= state.doc.length,
    ),
  );

  for (const probe of probes) {
    const found = resolveAncestor(state, probe, names);
    if (found) return found;
  }

  return null;
}
