import type { PetSnapshot } from '../../../shared/pet/petModel.js';
import { isPetOperational } from '../../../shared/pet/petModel.js';
import { getPetDefinition, type PetKindId } from '../../../shared/pet/petCatalog.js';
import type { PetColorId } from '../../../shared/pet/petColorPalette.js';
import type { PetGenderId } from '../../../shared/pet/petGender.js';
import type { PlayerFacing } from '../../../shared/world/playerFacing.js';
import {
  resolvePetFollowAnchor,
  tickPetFollow,
  type PetFollowState,
} from '../../../shared/world/petFollowMovement.js';
import type { WorldPosition } from '../../../shared/world/movement.js';

export type PetRenderSnapshot = PetFollowState & {
  readonly visible: boolean;
  readonly name: string;
  readonly kindId: PetKindId;
  readonly colorId: PetColorId;
  readonly gender: PetGenderId;
  readonly animPhase: number;
};

/**
 * Entidade de exploração — segue o operativo com colisão própria (sem ECS).
 * Independente do motor de combate; apenas espelha posição/facing no mapa.
 */
export class PetFollowEntity {
  private state: PetFollowState = { x: 0, y: 0, facing: 'south' };
  private petSnapshot: PetSnapshot | null = null;
  private initialized = false;
  private animPhase = 0;

  setPetSnapshot(pet: PetSnapshot | null): void {
    this.petSnapshot = pet ? { ...pet } : null;
  }

  isVisible(): boolean {
    return this.petSnapshot !== null && isPetOperational(this.petSnapshot);
  }

  snapBehindPlayer(playerPosition: WorldPosition, playerFacing: PlayerFacing): void {
    const offsetMult = this.petSnapshot
      ? getPetDefinition(this.petSnapshot.kindId).followOffsetMult
      : 1;
    const anchor = resolvePetFollowAnchor(playerPosition, playerFacing, offsetMult);
    this.state = {
      x: anchor.x,
      y: anchor.y,
      facing: playerFacing,
    };
    this.initialized = true;
  }

  update(
    playerPosition: WorldPosition,
    playerFacing: PlayerFacing,
    mapData: number[][],
    pixelWidth: number,
    pixelHeight: number,
    deltaMs: number,
  ): void {
    if (!this.isVisible() || !this.petSnapshot) return;

    if (!this.initialized) {
      this.snapBehindPlayer(playerPosition, playerFacing);
      return;
    }

    const def = getPetDefinition(this.petSnapshot.kindId);
    const prev = this.state;
    this.state = tickPetFollow({
      pet: this.state,
      playerPosition,
      playerFacing,
      mapData,
      pixelWidth,
      pixelHeight,
      deltaMs,
      followSpeedMult: def.followSpeedMult,
      followOffsetMult: def.followOffsetMult,
    });

    const moved = Math.hypot(this.state.x - prev.x, this.state.y - prev.y);
    if (moved > 0.05) {
      this.animPhase += deltaMs * 0.012 * def.followSpeedMult;
    }
  }

  toRenderSnapshot(): PetRenderSnapshot | null {
    if (!this.isVisible() || !this.petSnapshot) return null;
    return {
      ...this.state,
      visible: true,
      name: this.petSnapshot.name,
      kindId: this.petSnapshot.kindId,
      colorId: this.petSnapshot.colorId,
      gender: this.petSnapshot.gender,
      animPhase: this.animPhase,
    };
  }
}
