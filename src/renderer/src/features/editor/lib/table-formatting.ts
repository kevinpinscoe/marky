import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { findAncestor, resolveAncestorNearby } from './syntax-tree';
import { splitTableCells } from './table-syntax';

type TableAlignment = 'none' | 'left' | 'center' | 'right';

type ParsedTableRow = {
  from: number;
  to: number;
  cells: string[];
};

type ParsedTable = {
  from: number;
  to: number;
  header: ParsedTableRow;
  divider: ParsedTableRow;
  body: ParsedTableRow[];
};

export type HoveredTableHeader = {
  tableFrom: number;
  tableTo: number;
  top: number;
  bottom: number;
};

function findTableContext(state: EditorState, position: number) {
  const tableNode = resolveAncestorNearby(state, position, ['Table']);
  return tableNode ? { tableNode } : null;
}

function findTableHeaderContext(state: EditorState, position: number) {
  const headerNode = resolveAncestorNearby(state, position, ['TableHeader']);
  if (!headerNode) {
    return null;
  }

  const tableNode = findAncestor(headerNode, ['Table']);
  return tableNode ? { tableNode } : null;
}

function splitTableLine(lineText: string) {
  return splitTableCells(lineText).map(({ start, end }) =>
    lineText.slice(start, end),
  );
}

function parseTableRow(state: EditorState, node: SyntaxNode) {
  const cells = splitTableLine(state.doc.sliceString(node.from, node.to));
  if (cells.length === 0) {
    return null;
  }

  return {
    from: node.from,
    to: node.to,
    cells,
  };
}

function collectParsedTable(state: EditorState, tableNode: SyntaxNode) {
  let header: ParsedTableRow | null = null;
  let divider: ParsedTableRow | null = null;
  const body: ParsedTableRow[] = [];

  for (let child = tableNode.firstChild; child; child = child.nextSibling) {
    if (child.type.name === 'TableHeader') {
      header = parseTableRow(state, child);
      continue;
    }

    if (child.type.name === 'TableDelimiter') {
      divider = parseTableRow(state, child);
      continue;
    }

    if (child.type.name === 'TableRow') {
      const row = parseTableRow(state, child);
      if (row) {
        body.push(row);
      }
    }
  }

  if (!header || !divider) {
    return null;
  }

  const lastRow = body.at(-1) ?? divider;

  return {
    from: header.from,
    to: lastRow.to,
    header,
    divider,
    body,
  } satisfies ParsedTable;
}

function normalizeCellCount(cells: string[], count: number) {
  return Array.from({ length: count }, (_, index) =>
    (cells[index] ?? '').trim(),
  );
}

function getTableAlignment(cellText: string): TableAlignment {
  const trimmed = cellText.trim();

  if (trimmed.startsWith(':') && trimmed.endsWith(':')) {
    return 'center';
  }
  if (trimmed.startsWith(':')) {
    return 'left';
  }
  if (trimmed.endsWith(':')) {
    return 'right';
  }

  return 'none';
}

function getMinimumColumnWidth(alignment: TableAlignment) {
  switch (alignment) {
    case 'left':
    case 'right':
      return 4;
    case 'center':
      return 5;
    default:
      return 3;
  }
}

function buildDividerSegment(width: number, alignment: TableAlignment) {
  switch (alignment) {
    case 'left':
      return `:${'-'.repeat(width - 1)}`;
    case 'right':
      return `${'-'.repeat(width - 1)}:`;
    case 'center':
      return `:${'-'.repeat(width - 2)}:`;
    default:
      return '-'.repeat(width);
  }
}

function buildTableRow(cells: string[], widths: number[]) {
  return `| ${cells.map((cell, index) => cell.padEnd(widths[index])).join(' | ')} |`;
}

function buildFormattedTable(
  headerCells: string[],
  dividerCells: string[],
  bodyRows: string[][],
) {
  const columnCount = Math.max(
    headerCells.length,
    dividerCells.length,
    ...bodyRows.map((row) => row.length),
    1,
  );

  const normalizedRows = [headerCells, ...bodyRows].map((row) =>
    normalizeCellCount(row, columnCount),
  );
  const alignments = normalizeCellCount(dividerCells, columnCount).map(
    getTableAlignment,
  );
  const widths = Array.from({ length: columnCount }, (_, index) =>
    Math.max(
      ...normalizedRows.map((row) => row[index]?.length ?? 0),
      getMinimumColumnWidth(alignments[index] ?? 'none'),
    ),
  );

  const [normalizedHeader, ...normalizedBody] = normalizedRows;

  return [
    buildTableRow(normalizedHeader, widths),
    `| ${alignments.map((alignment, index) => buildDividerSegment(widths[index], alignment)).join(' | ')} |`,
    ...normalizedBody.map((row) => buildTableRow(row, widths)),
  ].join('\n');
}

export function formatTableMarkdown(tableMarkdown: string) {
  const lines = tableMarkdown
    .split('\n')
    .filter(
      (line, index, allLines) => line !== '' || index < allLines.length - 1,
    );

  if (lines.length < 2) {
    return tableMarkdown;
  }

  const [headerLine, dividerLine, ...bodyLines] = lines;
  const headerCells = splitTableLine(headerLine);
  const dividerCells = splitTableLine(dividerLine);
  const bodyRows = bodyLines
    .map(splitTableLine)
    .filter((cells) => cells.length > 0);

  if (headerCells.length === 0 || dividerCells.length === 0) {
    return tableMarkdown;
  }

  return buildFormattedTable(headerCells, dividerCells, bodyRows);
}

export function getHoveredTableHeader(
  view: EditorView,
  clientX: number,
  clientY: number,
): HoveredTableHeader | null {
  const contentRect = view.contentDOM.getBoundingClientRect();
  if (
    clientX < contentRect.left ||
    clientX > contentRect.right ||
    clientY < contentRect.top ||
    clientY > contentRect.bottom
  ) {
    return null;
  }

  const clampedX = Math.min(
    Math.max(clientX, contentRect.left + 1),
    contentRect.right - 1,
  );
  const position = view.posAtCoords({ x: clampedX, y: clientY });
  if (position === null) {
    return null;
  }

  const context = findTableHeaderContext(view.state, position);
  if (!context) {
    return null;
  }

  const parsedTable = collectParsedTable(view.state, context.tableNode);
  if (!parsedTable) {
    return null;
  }

  const headerProbe =
    parsedTable.header.from === parsedTable.header.to
      ? parsedTable.header.from
      : Math.min(parsedTable.header.from + 1, parsedTable.header.to);
  const headerCoords = view.coordsAtPos(headerProbe);
  if (!headerCoords) {
    return null;
  }

  return {
    tableFrom: parsedTable.from,
    tableTo: parsedTable.to,
    top: headerCoords.top,
    bottom: headerCoords.bottom,
  };
}

export function normalizeTableSpacing(view: EditorView, tableFrom: number) {
  const safePosition = Math.min(tableFrom + 1, view.state.doc.length);
  const context = findTableContext(view.state, safePosition);
  if (!context) {
    return false;
  }

  const parsedTable = collectParsedTable(view.state, context.tableNode);
  if (!parsedTable) {
    return false;
  }

  const currentTable = view.state.doc.sliceString(
    parsedTable.from,
    parsedTable.to,
  );
  const formattedTable = buildFormattedTable(
    parsedTable.header.cells,
    parsedTable.divider.cells,
    parsedTable.body.map((row) => row.cells),
  );

  if (formattedTable !== currentTable) {
    view.dispatch({
      changes: {
        from: parsedTable.from,
        to: parsedTable.to,
        insert: formattedTable,
      },
      scrollIntoView: true,
    });
  }

  view.focus();
  return true;
}
