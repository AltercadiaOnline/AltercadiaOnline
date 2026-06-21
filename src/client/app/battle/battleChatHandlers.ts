import { getBattleChatPanel } from '../../ui/battle/BattleScreen.js';
import { getBattleHudController } from '../battle/BattleHudController.js';

/** Envio de mensagem local — store + callback legado. */
export function sendBattleChatMessage(message: string): void {
  const trimmed = message.trim();
  if (!trimmed) return;

  const panel = getBattleChatPanel();
  if (panel) {
    panel.sendLocalMessage(trimmed);
    return;
  }

  getBattleHudController().appendChatLine('YOU', trimmed);
}
