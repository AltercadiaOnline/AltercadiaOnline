import { getSurrenderConfirmBridge } from '../../app/bridge/surrenderConfirmBridge.js';

/** Confirmação de fuga/rendição — overlay React via surrenderConfirmBridge. */
export function showBattleSurrenderConfirm(onConfirm: () => void): void {
  getSurrenderConfirmBridge().show(onConfirm);
}

export function dismissBattleSurrenderConfirm(): void {
  getSurrenderConfirmBridge().dismiss();
}
