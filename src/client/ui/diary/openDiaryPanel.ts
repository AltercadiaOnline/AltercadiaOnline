import { windowManager } from '../WindowManager.js';

/** Abre o Diário de Memórias (item soulbound) via painel React. */
export function openDiaryPanel(): void {
  windowManager.open('diary');
}
