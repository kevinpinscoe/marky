/**
 * The app uses a frameless window with a custom title bar, so regions have to
 * declare whether they drag the window or stay interactive.
 */
export const drag = {
  WebkitAppRegion: 'drag' as React.CSSProperties['WebkitAppRegion'],
};

export const noDrag = {
  WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'],
};
