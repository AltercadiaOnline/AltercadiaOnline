import { getSurrenderConfirmBridge, type BattleSurrenderKind } from '../../app/bridge/surrenderConfirmBridge.js';

/** Confirmação de fuga/rendição — overlay React via surrenderConfirmBridge. */
export function showBattleSurrenderConfirm(
  onConfirm: () => void,
  kind: BattleSurrenderKind = 'pve',
): void {
  getSurrenderConfirmBridge().show(onConfirm, kind);
}

export function dismissBattleSurrenderConfirm(): void {
  getSurrenderConfirmBridge().dismiss();
}
