import { WorldCommsStack } from './hud/WorldCommsStack.js';
import { WorldHubSocialCluster } from './hud/WorldHubSocialCluster.js';

/**
 * Widgets sobre o mapa (frame alinhado ao Construct, sem scale de câmera):
 * - Hub + hora — canto superior direito
 * - Chat/log — canto inferior esquerdo
 */
export function WorldHUD() {
  return (
    <>
      <WorldHubSocialCluster />
      <WorldCommsStack />
    </>
  );
}
