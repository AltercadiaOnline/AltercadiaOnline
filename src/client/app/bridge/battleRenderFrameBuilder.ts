import type { CombatUiHints } from '../../../shared/combatWire.js';
import { resolveBattleOpponentActorId } from '../../../shared/combat/resolveBattleOpponent.js';
import type { PetColorId } from '../../../shared/pet/petColorPalette.js';
import type { PetKindId } from '../../../shared/pet/petCatalog.js';
import type { CombatState } from '../../../shared/types.js';
import { readCombatantVital } from '../../combat/combatVitalsDisplay.js';
import { readActiveStatusesFromCombatant } from '../../hud/activeStatusAdapter.js';
import {
  battleSpriteSrcCandidates,
  resolveBattleSpriteFromMonsterId,
} from '../../ui/battle/battleSpriteCatalog.js';
import {
  DEFAULT_PLAYER_SOUTH_ROTATION_URL,
  PLAYER_ASSET_BUNDLE_ROOT,
} from '../../entities/player/playerConstants.js';
import type {
  BattleCombatCue,
  BattleFighterRenderSlot,
  BattleFighterStance,
  BattleFighterVitalsSnapshot,
  BattlePetRenderSnapshot,
  BattleRenderFrame,
  BattleRenderVisualState,
} from './battleRenderBridge.js';

function buildAllySlot(stance: BattleFighterStance): BattleFighterRenderSlot {
  return {
    side: 'ally',
    spriteSrc: DEFAULT_PLAYER_SOUTH_ROTATION_URL,
    spriteSrcFallbacks: [
      `${PLAYER_ASSET_BUNDLE_ROOT}/Pixel_art_character_sprite_front/rotations/south.png`,
    ],
    stance,
    creatureId: null,
    monsterId: null,
    label: 'Jogador',
  };
}

function buildFoeSlot(
  monsterId: string | null,
  stance: BattleFighterStance,
  label = '—',
): BattleFighterRenderSlot {
  if (!monsterId) {
    return {
      side: 'foe',
      spriteSrc: '',
      spriteSrcFallbacks: [],
      stance,
      creatureId: null,
      monsterId: null,
      label,
    };
  }

  const catalog = resolveBattleSpriteFromMonsterId(monsterId);
  if (!catalog) {
    return {
      side: 'foe',
      spriteSrc: '',
      spriteSrcFallbacks: [],
      stance,
      creatureId: null,
      monsterId,
      label,
    };
  }

  const candidates = battleSpriteSrcCandidates(catalog.creatureId);
  const spriteSrc =
    stance === 'attack'
      ? catalog.attackSpriteSrc || candidates[1] || candidates[0] || ''
      : catalog.spriteSrc || candidates[0] || '';

  return {
    side: 'foe',
    spriteSrc,
    spriteSrcFallbacks:
      stance === 'attack'
        ? [catalog.spriteSrc, ...candidates]
        : [catalog.attackSpriteSrc, ...candidates.slice(1)],
    stance,
    creatureId: catalog.creatureId,
    monsterId: catalog.monsterId,
    label: catalog.name,
  };
}

function buildFighterVitals(
  actorId: string,
  combatant: CombatState['combatants'][string],
  turn: number,
): BattleFighterVitalsSnapshot {
  const { hp, maxHp } = readCombatantVital(combatant);
  const max = Math.max(1, maxHp);
  const statuses = readActiveStatusesFromCombatant(combatant, turn);
  return {
    actorId,
    name: combatant.name,
    classId: combatant.classId ?? null,
    hp,
    maxHp: max,
    hpRatio: Math.min(1, Math.max(0, hp / max)),
    statusCount: statuses.length,
  };
}

function resolvePetAlly(
  state: CombatState,
  playerActorId: string,
): CombatState['combatants'][string] | null {
  const petId = `pet_${playerActorId}`;
  const pet = state.combatants[petId];
  if (!pet || pet.combatRole !== 'PET') return null;
  if (pet.petStatus === 'INACTIVE') return null;
  const hp = pet.hpCurrent ?? pet.hp;
  if (hp <= 0) return null;
  return pet;
}

function buildPetSnapshot(pet: CombatState['combatants'][string] | null): BattlePetRenderSnapshot {
  if (!pet) {
    return {
      visible: false,
      name: '—',
      kindId: null,
      colorId: null,
      hp: 0,
      maxHp: 1,
      hpRatio: 0,
    };
  }

  const { hp, maxHp } = readCombatantVital(pet);
  const max = Math.max(1, maxHp);
  return {
    visible: true,
    name: pet.name,
    kindId: (pet.petKindId ?? null) as PetKindId | null,
    colorId: (pet.petColorId ?? null) as PetColorId | null,
    hp,
    maxHp: max,
    hpRatio: Math.min(1, Math.max(0, hp / max)),
  };
}

export function assembleBattleRenderFrame(
  visual: BattleRenderVisualState,
  combat?: { readonly state: CombatState; readonly ui: CombatUiHints } | null,
): BattleRenderFrame {
  const monsterId = visual.monsterId;
  const allyBase = buildAllySlot(visual.allyStance);
  let foeLabel = '—';
  let allyVitals: BattleFighterVitalsSnapshot | null = null;
  let foeVitals: BattleFighterVitalsSnapshot | null = null;
  let pet: BattlePetRenderSnapshot = buildPetSnapshot(null);
  let battleId: string | null = null;
  let phase: string | null = null;

  if (combat) {
    const { state, ui } = combat;
    battleId = state.battleId;
    phase = state.phase;
    const player = state.combatants[ui.playerActorId];
    const opponentId = resolveBattleOpponentActorId(
      state.combatants,
      ui.playerActorId,
      state.battleType,
    );
    const opponent = opponentId ? state.combatants[opponentId] : null;

    if (player) {
      allyVitals = buildFighterVitals(ui.playerActorId, player, state.turn);
    }
    if (opponent) {
      foeVitals = buildFighterVitals(opponentId!, opponent, state.turn);
      foeLabel = opponent.name;
    }
    pet = buildPetSnapshot(resolvePetAlly(state, ui.playerActorId));
  }

  const foe = buildFoeSlot(monsterId, visual.foeStance, foeLabel);
  const ally: BattleFighterRenderSlot = {
    ...allyBase,
    label: allyVitals?.name ?? allyBase.label,
  };

  return {
    battleId,
    phase,
    monsterId,
    ally,
    foe,
    allyVitals,
    foeVitals,
    pet,
    allyCue: visual.allyCue,
    foeCue: visual.foeCue,
    timestampMs: performance.now(),
  };
}

/** Frame mínimo (mount / stance) sem snapshot de combate ainda disponível. */
export function assembleBattleRenderFrameVisualOnly(
  visual: BattleRenderVisualState,
): BattleRenderFrame {
  return assembleBattleRenderFrame(visual, null);
}
