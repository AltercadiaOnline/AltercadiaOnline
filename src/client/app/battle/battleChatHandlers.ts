import { getBattleChatPanel } from '../../ui/battle/BattleScreen.js';
import { getBattleHudController, isReactBattleHudEnabled } from '../battle/BattleHudController.js';

/** Envio de mensagem local — reutiliza `BattleChat` (bridge + callback legado). */
export function sendBattleChatMessage(message: string): void {
  const trimmed = message.trim();
  if (!trimmed) return;

  const panel = getBattleChatPanel();
  if (panel) {
    panel.sendLocalMessage(trimmed);
    return;
  }

  if (isReactBattleHudEnabled()) {
    getBattleHudController().appendChatLine('YOU', trimmed);
  }
}
