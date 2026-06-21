import { windowManager } from '../../app/panels/worldWindowController.js';

/** Abre o Diário de Memórias (item soulbound) via painel React. */
export function openDiaryPanel(): void {
  windowManager.open('diary');
}
