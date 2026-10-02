/**
 * Which physical corner hosts a window-style close control.
 *
 * Apple window chrome keeps the close control at the top-left (the traffic
 * lights); Windows and Linux desktops put it at the top-right. The side is
 * physical, not logical: the macOS convention does not mirror with the
 * document direction.
 */
export type CloseSide = 'left' | 'right';

/** Matches Apple platforms in a user-agent string (macOS, iOS, iPadOS, visionOS). */
export function closeButtonSide(userAgent: string): CloseSide {
  return /macintosh|mac os|iphone|ipad|ipod|visionos/i.test(userAgent) ? 'left' : 'right';
}
