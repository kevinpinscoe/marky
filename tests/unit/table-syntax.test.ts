import { describe, it, expect } from 'vitest';
import { splitTableCells } from '@renderer/features/editor/lib/table-syntax';

function cellTexts(line: string) {
  return splitTableCells(line).map(({ start, end }) => line.slice(start, end));
}

describe('splitTableCells', () => {
  it('splits a fully delimited row', () => {
    expect(cellTexts('| a | b |')).toEqual([' a ', ' b ']);
  });

  it('splits a row without outer pipes', () => {
    expect(cellTexts('a | b | c')).toEqual(['a ', ' b ', ' c']);
  });

  it('splits a row with only a leading pipe', () => {
    expect(cellTexts('| a | b')).toEqual([' a ', ' b']);
  });

  it('treats an escaped pipe as content', () => {
    expect(cellTexts('| a \\| b | c |')).toEqual([' a \\| b ', ' c ']);
  });

  it('does not treat an escaped backslash as escaping the next pipe', () => {
    expect(cellTexts('| a \\\\ | b |')).toEqual([' a \\\\ ', ' b ']);
  });

  it('returns no cells when there are fewer than two pipes', () => {
    expect(splitTableCells('not a table')).toEqual([]);
    expect(splitTableCells('| still not')).toEqual([]);
  });

  it('keeps empty cells', () => {
    expect(cellTexts('|  |  |')).toEqual(['  ', '  ']);
  });

  it('reports offsets within the line', () => {
    expect(splitTableCells('| a | b |')).toEqual([
      { start: 1, end: 4 },
      { start: 5, end: 8 },
    ]);
  });

  it('handles a divider row', () => {
    expect(cellTexts('| --- | :--: |')).toEqual([' --- ', ' :--: ']);
  });
});
