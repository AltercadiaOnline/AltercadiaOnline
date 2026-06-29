import type { AccountCharacter } from '../../shared/types/account.js';
import type { AccountCharacterHub } from '../../shared/characterHub.js';
import {
  resolveCharacterSkin,
  skinAppearanceKey,
} from '../../shared/character/characterAppearance.js';
import { resolvePlayerSkinBundleId } from '../../shared/character/playerSkinBundle.js';
import type { PlayerSkin } from '../../shared/character/playerSkin.js';
import { PlayerSprite } from '../entities/player/PlayerSprite.js';
import { paintCharacterAvatarPreview } from '../ui/character/characterAvatarPreview.js';

type PreviewEntry = {
  readonly player: PlayerSprite;
  readonly canvas: HTMLCanvasElement;
  skinKey: string;
  paintGeneration: number;
};

/**
 * Previews top-down por slot na tela de seleção.
 * Uma instância de PlayerSprite por personagem — suporta skins distintas por slot.
 */
export class CharacterSelectPreviewManager {
  private readonly entries = new Map<number, PreviewEntry>();

  bindFromHub(container: HTMLElement, hub: AccountCharacterHub): void {
    const activeIds = new Set<number>();

    for (const character of hub.slots) {
      if (!character) continue;
      activeIds.add(character.id);

      const slotEl = container.querySelector<HTMLElement>(
        `.char-slot[data-char-id="${character.id}"]`,
      );
      const canvas = slotEl?.querySelector<HTMLCanvasElement>('[data-char-avatar-canvas]');
      if (!canvas) continue;

      this.mountPreview(character.id, canvas, resolveCharacterSkin(character), resolvePlayerSkinBundleId(character));
    }

    for (const characterId of this.entries.keys()) {
      if (!activeIds.has(characterId)) {
        this.entries.delete(characterId);
      }
    }
  }

  refreshCharacterSkin(characterId: number, skin: PlayerSkin): void {
    const entry = this.entries.get(characterId);
    if (!entry) return;

    const nextKey = skinAppearanceKey(skin);
    if (entry.skinKey === nextKey) return;

    entry.skinKey = nextKey;
    void this.paintEntry(entry, skin);
  }

  dispose(): void {
    this.entries.clear();
  }

  private mountPreview(
    characterId: number,
    canvas: HTMLCanvasElement,
    skin: PlayerSkin,
    skinBundleId: ReturnType<typeof resolvePlayerSkinBundleId>,
  ): void {
    const skinKey = `${skinAppearanceKey(skin)}|${skinBundleId}`;
    const existing = this.entries.get(characterId);

    if (existing?.canvas === canvas) {
      if (existing.skinKey === skinKey) return;
      existing.skinKey = skinKey;
      void this.paintEntry(existing, skin);
      return;
    }

    const entry: PreviewEntry = {
      player: new PlayerSprite(skinBundleId),
      canvas,
      skinKey,
      paintGeneration: 0,
    };
    this.entries.set(characterId, entry);
    void this.paintEntry(entry, skin);
  }

  private async paintEntry(entry: PreviewEntry, skin: PlayerSkin): Promise<void> {
    const generation = entry.paintGeneration + 1;
    entry.paintGeneration = generation;

    await paintCharacterAvatarPreview(
      entry.canvas,
      {
        skin,
        facing: 'south',
        backdropAlpha: 0.15,
        visualOccupancy: 0.85,
        showSkinAccentStrip: true,
      },
      entry.player,
    );

    if (entry.paintGeneration !== generation) return;
  }
}

let manager: CharacterSelectPreviewManager | null = null;

export function getCharacterSelectPreviewManager(): CharacterSelectPreviewManager {
  if (!manager) manager = new CharacterSelectPreviewManager();
  return manager;
}

export function resetCharacterSelectPreviewManager(): void {
  manager?.dispose();
  manager = null;
}
