import { Prec, type EditorState } from '@codemirror/state';
import { keymap, type EditorView, type KeyBinding } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { findAncestor, resolveAncestorNearby } from './syntax-tree';
import { splitTableCells } from './table-syntax';

type TableCellRange = {
  from: number;
  to: number;
};

type TableRowInfo = {
  from: number;
  to: number;
  cells: TableCellRange[];
};

type FlatTableCell = {
  cell: TableCellRange;
  rowIndex: number;
  cellIndex: number;
};

function parseTableCells(lineFrom: number, lineText: string): TableCellRange[] {
  return splitTableCells(lineText).map(({ start, end }) => ({
    from: lineFrom + start,
    to: lineFrom + end,
  }));
}

function collectTableRows(state: EditorState, tableNode: SyntaxNode) {
  const rows: TableRowInfo[] = [];

  for (let child = tableNode.firstChild; child; child = child.nextSibling) {
    if (child.type.name !== 'TableHeader' && child.type.name !== 'TableRow') {
      continue;
    }

    const cells = parseTableCells(
      child.from,
      state.doc.sliceString(child.from, child.to),
    );

    if (cells.length > 0) {
      rows.push({ from: child.from, to: child.to, cells });
    }
  }

  return rows;
}

function findCellIndex(cells: TableCellRange[], position: number) {
  if (cells.length === 0) {
    return -1;
  }

  if (position <= cells[0].from) {
    return 0;
  }

  for (let index = 0; index < cells.length; index += 1) {
    if (position <= cells[index].to) {
      return index;
    }
  }

  return cells.length - 1;
}

function getCellSelection(
  state: EditorState,
  cell: TableCellRange,
  direction: -1 | 1,
) {
  let contentFrom = cell.from;
  let contentTo = cell.to;

  while (
    contentFrom < contentTo &&
    /\s/.test(state.doc.sliceString(contentFrom, contentFrom + 1))
  ) {
    contentFrom += 1;
  }

  while (
    contentTo > contentFrom &&
    /\s/.test(state.doc.sliceString(contentTo - 1, contentTo))
  ) {
    contentTo -= 1;
  }

  if (contentFrom < contentTo) {
    const position = direction === 1 ? contentFrom : contentTo;
    return { anchor: position, head: position };
  }

  if (cell.to > cell.from) {
    const midpoint = cell.from + Math.floor((cell.to - cell.from) / 2);
    return { anchor: midpoint, head: midpoint };
  }

  return { anchor: cell.from, head: cell.from };
}

function getTableNavigationContext(state: EditorState) {
  const position = state.selection.main.head;
  const rowNode = resolveAncestorNearby(state, position, [
    'TableHeader',
    'TableRow',
  ]);
  if (!rowNode) {
    return null;
  }

  const tableNode = findAncestor(rowNode, ['Table']);
  if (!tableNode) {
    return null;
  }

  const rows = collectTableRows(state, tableNode);
  const rowIndex = rows.findIndex(
    (row) => row.from === rowNode.from && row.to === rowNode.to,
  );
  if (rowIndex < 0) {
    return null;
  }

  const cellIndex = findCellIndex(rows[rowIndex].cells, position);
  if (cellIndex < 0) {
    return null;
  }

  const flatCells: FlatTableCell[] = rows.flatMap((row, currentRowIndex) =>
    row.cells.map((cell, currentCellIndex) => ({
      cell,
      rowIndex: currentRowIndex,
      cellIndex: currentCellIndex,
    })),
  );

  const flatIndex = flatCells.findIndex(
    (entry) => entry.rowIndex === rowIndex && entry.cellIndex === cellIndex,
  );
  if (flatIndex < 0) {
    return null;
  }

  return { flatCells, flatIndex };
}

function moveBetweenTableCells(view: EditorView, direction: -1 | 1) {
  const context = getTableNavigationContext(view.state);
  if (!context) {
    return false;
  }

  const targetIndex = context.flatIndex + direction;
  if (targetIndex < 0 || targetIndex >= context.flatCells.length) {
    return true;
  }

  view.dispatch({
    selection: getCellSelection(
      view.state,
      context.flatCells[targetIndex].cell,
      direction,
    ),
    scrollIntoView: true,
  });
  view.focus();
  return true;
}

const tableNavigationKeymap: readonly KeyBinding[] = [
  {
    key: 'Tab',
    preventDefault: true,
    run: (view) => moveBetweenTableCells(view, 1),
  },
  {
    key: 'Shift-Tab',
    preventDefault: true,
    run: (view) => moveBetweenTableCells(view, -1),
  },
];

export const tableNavigationExtension = Prec.highest(
  keymap.of(tableNavigationKeymap),
);
