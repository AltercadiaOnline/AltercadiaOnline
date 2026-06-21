import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App } from '../components/App.js';
import { CLIENT_ROOT_IDS } from '../shell/uiLayers.js';

let hudRoot: Root | null = null;

export function mountHudRuntime(host: HTMLElement): void {
  if (!hudRoot) {
    hudRoot = createRoot(host);
  }

  hudRoot.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

export function unmountHudRuntime(): void {
  hudRoot?.unmount();
  hudRoot = null;
}

export function resolveHudRuntimeHost(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(`#${CLIENT_ROOT_IDS.hudRoot}`);
}
