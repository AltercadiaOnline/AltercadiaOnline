import { openWorldWindow } from '../../app/panels/worldWindowController.js';

/** Diário de Memórias vive na Ficha do Personagem (conquistas) — não é painel/item separado. */
export function openDiaryPanel(): void {
  openWorldWindow('characters');
}
