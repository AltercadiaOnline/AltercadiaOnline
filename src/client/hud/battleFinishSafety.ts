import { getBattleLogPanel } from '../ui/battle/BattleScreen.js';

const BATTLE_FINISH_SAFETY_MS = 12000;

let safetyTimer: ReturnType<typeof setTimeout> | null = null;

export function armBattleFinishSafety(
  onTimeout: () => void,
  delayMs = BATTLE_FINISH_SAFETY_MS,
): void {
  clearBattleFinishSafety();
  const wait = Math.max(1000, Math.floor(delayMs));
  safetyTimer = setTimeout(() => {
    safetyTimer = null;
    getBattleLogPanel()?.append(
      '[ERRO] Recompensas não recebidas do servidor a tempo. Liberando tela…',
    );
    onTimeout();
  }, wait);
}

export function clearBattleFinishSafety(): void {
  if (safetyTimer !== null) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
}
