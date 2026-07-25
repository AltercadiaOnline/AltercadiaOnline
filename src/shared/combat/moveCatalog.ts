// @ts-nocheck
/** Categorias de movimentos de combate exibidas no tooltip. */
export const MoveCategory = {
    Attack: 'ATTACK',
    Defense: 'DEFENSE',
    Support: 'SUPPORT',
    Utility: 'UTILITY',
};
export const MOVE_CATEGORY_LABELS = {
    [MoveCategory.Attack]: 'Ataque',
    [MoveCategory.Defense]: 'Defesa',
    [MoveCategory.Support]: 'Suporte',
    [MoveCategory.Utility]: 'Utilitário',
};
/** Catálogo canônico de movimentos — fonte para tooltip e moveset HUD. */
export const MOVE_CATALOG = [
    {
        id: 'strike',
        name: 'Golpe Puro',
        category: MoveCategory.Attack,
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
        damage: 0,
        cooldown: 2,
        priority: 2,
        ppMax: 6,
        description: 'Concentração tática para o próximo turno.',
    },
    {
        id: 'rat_bite',
        name: 'Mordida',
        category: MoveCategory.Attack,
        damage: 14,
        cooldown: 1,
        priority: 1,
        ppMax: 20,
        description: 'Ataque básico de criatura.',
    },
];
export function getMoveById(id) {
    return MOVE_CATALOG.find((move) => move.id === id);
}
/** IDs padrão do moveset demo do operativo. */
export const DEFAULT_MOVESET_IDS = [
    'strike',
    'advance',
    'barrier',
    'focus',
];
