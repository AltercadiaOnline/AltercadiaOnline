import type { UiWindowId } from './uiEvents.js';

/**
 * Teclas reservadas para locomoção — nunca mapear atalhos HUD aqui.
 * WASD cardinais + Q/E diagonais (NW/NE); futuro: Z/C para SW/SE.
 */
export const MOVEMENT_RESERVED_KEY_CODES = [
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'KeyE',
] as const;

export type MovementReservedKeyCode = (typeof MOVEMENT_RESERVED_KEY_CODES)[number];

export function isMovementReservedKeyCode(code: string): code is MovementReservedKeyCode {
  return (MOVEMENT_RESERVED_KEY_CODES as readonly string[]).includes(code);
}

/** Atalhos de teclado (event.code) → janela HUD. Sem overlap com WASD/Q/E. */
export const HUD_KEYBOARD_SHORTCUTS: Readonly<Record<string, UiWindowId>> = {
  KeyM: 'marketHub',
  KeyF: 'characters',
  KeyI: 'inventory',
  KeyU: 'quest',
  KeyL: 'shop',
  KeyH: 'marcos',
  KeyK: 'moveset',
  KeyP: 'social',
  KeyO: 'petLove',
};

export function resolveHudWindowFromKeyboard(code: string): UiWindowId | null {
  if (isMovementReservedKeyCode(code)) return null;
  return HUD_KEYBOARD_SHORTCUTS[code] ?? null;
}

/** Letra exibida no Hub — derivada do mapa de atalhos (fonte única). */
export const HUD_WINDOW_SHORTCUT_LABEL: Partial<Record<UiWindowId, string>> = Object.fromEntries(
  Object.entries(HUD_KEYBOARD_SHORTCUTS).map(([code, windowId]) => [
    windowId,
    code.replace(/^Key/, ''),
  ]),
);
