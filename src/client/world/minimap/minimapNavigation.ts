import type { MinimapClickTarget } from './minimapClickCoords.js';

export type MinimapNavigateRequest = MinimapClickTarget;

let navigateHandler: ((request: MinimapNavigateRequest) => void) | null = null;

export function registerMinimapNavigateHandler(
  handler: ((request: MinimapNavigateRequest) => void) | null,
): void {
  navigateHandler = handler;
}

export function dispatchMinimapNavigate(request: MinimapNavigateRequest): boolean {
  if (!navigateHandler) return false;
  navigateHandler(request);
  return true;
}
