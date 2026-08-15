import { getAppScreenBridge } from '../app/bridge/appScreenBridge.js';
import { getGlobalPlayerStore } from './moveset/globalPlayerStore.js';
import { getGameStateManager } from '../../shared/state/GameStateManager.js';
import { isMovementKey } from '../../shared/world/movementInput.js';
import { isPauseMenuOpen } from '../components/pauseMenu.js';
import { handleExplorationEscapeKey } from './escapeHudNavigation.js';
import { isMovementReservedKeyCode, resolveHudWindowFromKeyboard } from './keyboardShortcuts.js';
import { windowManager } from '../app/panels/worldWindowController.js';

import { tacticalSprayService } from '../../shared/social/tacticalSprayStore.js';
import { postSystemNotification } from './logService.js';
import { getPlayerItemStore } from './items/playerItemStore.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import { getExplorationRenderFrame } from '../app/bridge/explorationRenderBridge.js';
import type { ExplorationSnapshot } from '../../shared/game/gameState.js';
import { worldPixelToTile } from '../../shared/world/portals.js';
import { resolveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { OFFICIAL_SPRAY_STENCILS } from '../../shared/types/tacticalSpray.js';
import { ItemLocationSlot } from '../../shared/character/itemSlotModel.js';
import { isMapId } from '../../shared/world/mapRegistry.js';

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable)
  );
}

function isHudShortcutContextActive(): boolean {
  if (getAppScreenBridge().snapshot().activeScreen !== 'game-container') return false;
  if (isPauseMenuOpen()) return false;
  try {
    return getGameStateManager().isExploration();
  } catch {
    return false;
  }
}

/**
 * Atalhos globais de HUD (toggle). Ignora teclas de movimento (WASD, Q/E diagonais).
 */
export class KeyboardManager {
  private attached = false;

  private resolveSprayPlacementSnapshot(): ExplorationSnapshot | null {
    const renderFrame = getExplorationRenderFrame();
    if (renderFrame && isMapId(renderFrame.mapId)) {
      return {
        mapId: renderFrame.mapId,
        x: renderFrame.playerX,
        y: renderFrame.playerY,
        facing: renderFrame.facing,
      };
    }

    const explorationSnapshot = getGlobalPlayerStore().getExplorationSnapshot();
    if (explorationSnapshot) return explorationSnapshot;

    const worldPosition = getMutableDataStore().getWorldPosition();
    if (!worldPosition) return null;
    if (!isMapId(worldPosition.mapId)) return null;

    return {
      mapId: worldPosition.mapId,
      x: worldPosition.x,
      y: worldPosition.y,
      facing: worldPosition.facing,
    };
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;

    if (event.key === 'Escape' && handleExplorationEscapeKey(event)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    if (!isHudShortcutContextActive()) return;
    if (isTypingTarget(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isMovementKey(event.key, event.code)) return;
    if (isMovementReservedKeyCode(event.code)) return;

    // Atalho da Tecla G -> Usar Spray Tático
    if (event.code === 'KeyG') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const inv = getPlayerItemStore().getInventorySnapshot();
      const spraySlot = inv.slots.find((s) => s.itemId && s.quantity > 0 && OFFICIAL_SPRAY_STENCILS[s.itemId]);
      if (!spraySlot || !spraySlot.itemId) {
        postSystemNotification('Você não possui uma lata de spray tático no inventário.');
        return;
      }

      const desiredSprayId = spraySlot.itemId;
      const explorationSnapshot = this.resolveSprayPlacementSnapshot();
      if (!explorationSnapshot) {
        postSystemNotification('Não foi possível determinar sua posição atual para spray.');
        return;
      }

      const tileSize = resolveMapTileSize(explorationSnapshot.mapId);
      const { tileX, tileY } = worldPixelToTile(explorationSnapshot.x, explorationSnapshot.y, tileSize);
      const sprayResult = tacticalSprayService.placeSpray(
        {
          userId: 'local_player',
          zoneId: explorationSnapshot.mapId,
          posX: tileX,
          posY: tileY,
          sprayAssetId: desiredSprayId,
        },
        'CyberPlayer'
      );

      // Consume one charge / unit locally from the canonical item store.
      try {
        const itemStore = getPlayerItemStore();
        const items: any[] = itemStore.getItems().map((row) => ({ ...row }));
        const slotIndex = items.findIndex(
          (row) => row.slot === ItemLocationSlot.Inventory && row.itemId === desiredSprayId && row.quantity > 0,
        );
        if (slotIndex >= 0) {
          const row = items[slotIndex];
          if (row) {
            if (typeof row.charges === 'number') {
              if (row.charges > 1) {
                items[slotIndex] = { ...row, charges: row.charges - 1 };
              } else {
                items.splice(slotIndex, 1);
              }
            } else if (row.quantity > 1) {
              items[slotIndex] = { ...row, quantity: row.quantity - 1 };
            } else {
              items.splice(slotIndex, 1);
            }
            itemStore.replaceAll(items);
          }
        }
      } catch {
        // Non-fatal if inventory update fails locally
      }

      windowManager.close('inventory');
      postSystemNotification(
        `🎨 SPRAY USADO [Tecla G]! Marca "${sprayResult.sprayAssetId}" pichada sob seus pés [${sprayResult.posX}, ${sprayResult.posY}].`
      );
      return;
    }

    const windowId = resolveHudWindowFromKeyboard(event.code);
    if (!windowId) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    windowManager.toggle(windowId);
  };

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown, true);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.onKeyDown, true);
  }
}

let activeKeyboardManager: KeyboardManager | null = null;

export function initKeyboardManager(): KeyboardManager {
  if (!activeKeyboardManager) {
    activeKeyboardManager = new KeyboardManager();
  }
  activeKeyboardManager.attach();
  return activeKeyboardManager;
}

export function destroyKeyboardManager(): void {
  activeKeyboardManager?.detach();
  activeKeyboardManager = null;
}
