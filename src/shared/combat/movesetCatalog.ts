// @ts-nocheck
/**
 * @deprecated Catálogo legado de moves do jogador — use `classMovesetCatalog.ts`.
 * Este módulo mantém reexports de tipos e IDs antigos até remoção total.
 */
export { MoveCategory, MOVE_CATEGORY_LABELS, MoveScalingStat, MOVE_SCALING_STAT_LABELS, ACTIVE_MOVESET_SLOT_COUNT, PLAYER_MOVE_POOL_SIZE, } from './moveTypes.js';
import { MoveCategory, MoveScalingStat } from './moveTypes.js';
/** @deprecated Use `MOVESET_CATALOG`. */
export const MOVE_CATALOG = [
    {
        id: 'strike',
        name: 'Golpe Puro',
        category: MoveCategory.Attack,
        scalingStat: MoveScalingStat.STR,
        damage: 22,
        cooldown: 1,
        priority: 1,
        ppMax: 15,
        description: 'Golpe direto sem efeitos colaterais.',
    },
    {
        id: 'advance',
        name: 'Avanço Forçado',
        category: MoveCategory.Attack,
        scalingStat: MoveScalingStat.STR,
        damage: 18,
        cooldown: 2,
        priority: 1,
        ppMax: 10,
        description: 'Investida ofensiva — dispara runas de impacto.',
    },
    {
        id: 'barrier',
        name: 'Barreira',
        category: MoveCategory.Defense,
        scalingStat: MoveScalingStat.DEF,
        damage: 0,
        cooldown: 3,
        priority: 2,
        ppMax: 8,
        description: 'Postura defensiva — dispara runas de bloqueio.',
    },
    {
        id: 'focus',
        name: 'Foco de Combate',
        category: MoveCategory.Support,
        scalingStat: MoveScalingStat.AGI,
        damage: 0,
        cooldown: 2,
        priority: 2,
        ppMax: 6,
        description: 'Concentração tática para o próximo turno.',
    },
    {
        id: 'critical_edge',
        name: 'Fio Crítico',
        category: MoveCategory.Attack,
        scalingStat: MoveScalingStat.CRIT,
        damage: 26,
        cooldown: 2,
        priority: 1,
        ppMax: 8,
        description: 'Golpe calculado — foco em dano crítico.',
    },
    {
        id: 'evasive_step',
        name: 'Passo Evazivo',
        category: MoveCategory.Utility,
        scalingStat: MoveScalingStat.AGI,
        damage: 0,
        cooldown: 2,
        priority: 2,
        ppMax: 10,
        description: 'Reposicionamento rápido — favorece esquiva no turno.',
    },
];
/** @deprecated Skills de monstro — use `monsterSkillCatalog.ts`. */
export const MOVESET_CATALOG = MOVE_CATALOG;
export function getMoveById(id) {
    return MOVE_CATALOG.find((move) => move.id === id);
}
/** @deprecated Use `getClassMovePool(classId)`. */
export const DEFAULT_PLAYER_MOVE_POOL = [
    'strike',
    'advance',
    'barrier',
    'focus',
    'critical_edge',
    'evasive_step',
];
/** @deprecated Use `getDefaultClassActiveLoadout(classId)`. */
export const DEFAULT_ACTIVE_MOVESET_IDS = [
    'strike',
    'advance',
    'barrier',
    'focus',
];
/** @deprecated Use `DEFAULT_ACTIVE_MOVESET_IDS`. */
export const DEFAULT_MOVESET_IDS = DEFAULT_ACTIVE_MOVESET_IDS;
