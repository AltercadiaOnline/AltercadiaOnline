import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayMount } from '../components/OverlayMount.js';
import { CLIENT_ROOT_IDS } from '../shell/uiLayers.js';

let overlayRoot: Root | null = null;

export function mountOverlayRuntime(host: HTMLElement): void {
  if (!overlayRoot) {
    overlayRoot = createRoot(host);
  }

  overlayRoot.render(
    <StrictMode>
      <OverlayMount />
    </StrictMode>,
  );
}

export function unmountOverlayRuntime(): void {
  overlayRoot?.unmount();
  overlayRoot = null;
}

export function resolveOverlayRuntimeHost(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(`#${CLIENT_ROOT_IDS.overlayRoot}`);
}
