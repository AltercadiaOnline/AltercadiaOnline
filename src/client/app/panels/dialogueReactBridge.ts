import type { NpcDialoguePanelHandle } from '../../ui/npcModalController.js';

let reactDialogueHandle: NpcDialoguePanelHandle | null = null;

export function registerReactDialogueHandle(
  handle: NpcDialoguePanelHandle | null,
): void {
  reactDialogueHandle = handle;
}

export function getReactDialogueHandle(): NpcDialoguePanelHandle | null {
  return reactDialogueHandle;
}
