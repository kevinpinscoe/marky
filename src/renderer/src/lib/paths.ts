/**
 * Path helpers for the renderer, which has no access to node's `path`.
 *
 * Paths reach the renderer from the main process, so they use whichever
 * separator the host platform produced. Every helper here accepts both.
 */

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/** The final segment of a path, or the path itself if it has no separator. */
export function basename(filePath: string): string {
  return toPosix(filePath).split('/').at(-1) ?? filePath;
}

/** Everything before the final separator, or `''` if there is none. */
export function dirname(filePath: string): string {
  const normalized = toPosix(filePath);
  const lastSeparator = normalized.lastIndexOf('/');
  return lastSeparator > 0 ? normalized.slice(0, lastSeparator) : '';
}

/**
 * `filePath` expressed relative to the directory holding `fromFile`, or
 * `filePath` unchanged when it sits outside that directory.
 */
export function relativeToFile(filePath: string, fromFile: string): string {
  const directory = dirname(fromFile);
  if (!directory) return filePath;

  const prefix = `${directory}/`;
  const normalized = toPosix(filePath);

  return normalized.startsWith(prefix)
    ? normalized.slice(prefix.length)
    : filePath;
}
