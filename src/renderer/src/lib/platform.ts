import type { Platform } from '@shared/types';

/**
 * `navigator.platform` is deprecated but still the most reliable signal inside
 * Electron's renderer, so we check the user agent as well.
 */
function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'windows';

  const platform = navigator.platform.toLowerCase();

  if (platform.includes('mac') || navigator.userAgent.includes('Mac')) {
    return 'macos';
  }
  if (platform.includes('linux')) {
    return 'linux';
  }
  return 'windows';
}

export const platform = detectPlatform();

export const isMac = platform === 'macos';

/** The label users expect for the primary shortcut modifier. */
export const modKey = isMac ? '⌘' : 'Ctrl';
