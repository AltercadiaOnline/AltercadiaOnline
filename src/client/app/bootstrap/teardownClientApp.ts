import { teardownWorldRenderLayer } from '../../worldRender/initWorldRenderLayer.js';
import { teardownWorldPanelsBridge } from '../panels/initWorldPanelsBridge.js';
import { teardownGameStoreBridge } from '../store/gameStoreBridge.js';
import { resetClientAppInitializedFlag } from './initClientApp.js';

/** Desmonta bridges — uso em testes ou hot-reload; produção raramente chama. */
export function teardownClientApp(): void {
  teardownGameStoreBridge();
  teardownWorldPanelsBridge();
  teardownWorldRenderLayer();
  resetClientAppInitializedFlag();
}
