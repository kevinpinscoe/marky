export type TableCellBounds = {
  /** Offset of the first character after the opening pipe, within the line. */
  start: number;
  /** Offset of the closing pipe, within the line. */
  end: number;
};

/**
 * Splits a table row into cell bounds, treating `\|` as content rather than a
 * separator. Rows with fewer than two pipes are not tables.
 *
 * Bounds cover the raw span between pipes, padding included — callers decide
 * whether to trim.
 */
export function splitTableCells(lineText: string): TableCellBounds[] {
  const pipePositions: number[] = [];
  let escaped = false;

  for (let index = 0; index < lineText.length; index += 1) {
    const char = lineText[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '|') {
      pipePositions.push(index);
    }
  }

  if (pipePositions.length < 2) {
    return [];
  }

  const boundaries: number[] = [];
  // A row can open or close without a pipe, so the line edges act as bounds.
  if (pipePositions[0] > 0) {
    boundaries.push(-1);
  }
  boundaries.push(...pipePositions);
  if (pipePositions.at(-1)! < lineText.length - 1) {
    boundaries.push(lineText.length);
  }

  const cells: TableCellBounds[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    cells.push({
      start: boundaries[index] + 1,
      end: boundaries[index + 1],
    });
  }

  return cells;
}
