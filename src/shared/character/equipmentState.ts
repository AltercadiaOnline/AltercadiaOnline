import type { CombatClassId } from '../types.js';
import type { MarcosNodeProgressionData } from '../progression/marcoProgression.js';
import type { PetSnapshot } from '../pet/petModel.js';

export type EquippedSlots = {
  head?: string | null;
  top?: string | null;
  bottom?: string | null;
  ring?: string | null;
  amulet?: string | null;
  book?: string | null;
  rune?: string | null;
};

export type InventoryStack = {
  itemId: string;
  quantity: number;
  /** Runas/livros — cargas de durabilidade (máx. 10); poções usam quantity. */
  charges?: number;
  /** Quantidade reservada por transação bancária pendente (não gastável). */
  lockedQuantity?: number;
};

export type ActiveBookBuff = {
  bookId: string;
  expiresAt: number;
} | null;

export type PlayerWorldVitals = {
  readonly hpCurrent: number;
  readonly hpMax: number;
  readonly mpCurrent: number;
  readonly mpMax: number;
};

export type PlayerCombatLoadout = {
  playerId: string;
  characterId: number;
  classId: CombatClassId;
  level: number;
  flowSpeedBase: number;
  activeMarcos: string[];
  /** Níveis por nó — mesma fonte que a Ficha (MarcosStateSnapshot.nodeProgression). */
  nodeProgression: MarcosNodeProgressionData;
  equipped: EquippedSlots;
  inventory: InventoryStack[];
  activeBookBuff: ActiveBookBuff;
  equippedSkillIds: string[];
  displayName?: string;
  /** Pet tático — unidade de combate independente na fila de turnos. */
  pet?: PetSnapshot | null;
  /** HP/MP persistidos do mundo — sem auto-heal ao entrar em combate. */
  worldVitals?: PlayerWorldVitals;
  /** Domínio acumulado por move — escala power/PP no combate. */
  movesetMastery?: Readonly<Record<string, number>>;
};
