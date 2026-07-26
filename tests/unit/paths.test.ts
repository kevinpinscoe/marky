import { describe, it, expect } from 'vitest';
import { basename, dirname, relativeToFile } from '@renderer/lib/paths';

describe('basename', () => {
  it('returns the final segment of a posix path', () => {
    expect(basename('/home/user/notes.md')).toBe('notes.md');
  });

  it('returns the final segment of a windows path', () => {
    expect(basename('C:\\Users\\user\\notes.md')).toBe('notes.md');
  });

  it('returns the input when there is no separator', () => {
    expect(basename('notes.md')).toBe('notes.md');
  });
});

describe('dirname', () => {
  it('returns the containing directory of a posix path', () => {
    expect(dirname('/home/user/notes.md')).toBe('/home/user');
  });

  it('returns the containing directory of a windows path', () => {
    expect(dirname('C:\\Users\\user\\notes.md')).toBe('C:/Users/user');
  });

  it('returns an empty string when there is no separator', () => {
    expect(dirname('notes.md')).toBe('');
  });

  it('returns an empty string for a file at the posix root', () => {
    expect(dirname('/notes.md')).toBe('');
  });
});

describe('relativeToFile', () => {
  it('strips the containing directory', () => {
    expect(relativeToFile('/home/user/img/a.png', '/home/user/notes.md')).toBe(
      'img/a.png',
    );
  });

  it('handles mixed separators', () => {
    expect(
      relativeToFile('C:\\Users\\u\\img\\a.png', 'C:\\Users\\u\\notes.md'),
    ).toBe('img/a.png');
  });

  it('returns the path unchanged when it sits outside the directory', () => {
    expect(relativeToFile('/other/a.png', '/home/user/notes.md')).toBe(
      '/other/a.png',
    );
  });

  it('returns the path unchanged when the reference file has no directory', () => {
    expect(relativeToFile('/other/a.png', 'notes.md')).toBe('/other/a.png');
  });
});
