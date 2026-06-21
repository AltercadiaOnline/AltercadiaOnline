import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ScreenApp } from '../components/screen/ScreenApp.js';
import { CLIENT_ROOT_IDS } from '../shell/uiLayers.js';

let screenRoot: Root | null = null;

export function mountScreenRuntime(host: HTMLElement): void {
  if (!screenRoot) {
    screenRoot = createRoot(host);
  }

  screenRoot.render(
    <StrictMode>
      <ScreenApp />
    </StrictMode>,
  );
}

export function unmountScreenRuntime(): void {
  screenRoot?.unmount();
  screenRoot = null;
}

export function resolveScreenRuntimeHost(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(`#${CLIENT_ROOT_IDS.screenRoot}`);
}
