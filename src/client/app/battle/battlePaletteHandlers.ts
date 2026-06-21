type BattlePaletteHandlers = {
  executeMove?: (moveId: string) => void;
  useItem?: (itemId: string) => void;
};

type GlobalWithBattlePalette = typeof globalThis & {
  __ALTERCADIA_BATTLE_PALETTE__?: BattlePaletteHandlers;
};

export function registerBattlePaletteHandlers(handlers: BattlePaletteHandlers): void {
  (globalThis as GlobalWithBattlePalette).__ALTERCADIA_BATTLE_PALETTE__ = handlers;
}

export function clearBattlePaletteHandlers(): void {
  delete (globalThis as GlobalWithBattlePalette).__ALTERCADIA_BATTLE_PALETTE__;
}

export function requestBattleMove(moveId: string): void {
  (globalThis as GlobalWithBattlePalette).__ALTERCADIA_BATTLE_PALETTE__?.executeMove?.(moveId);
}

export function requestBattleItem(itemId: string): void {
  (globalThis as GlobalWithBattlePalette).__ALTERCADIA_BATTLE_PALETTE__?.useItem?.(itemId);
}
