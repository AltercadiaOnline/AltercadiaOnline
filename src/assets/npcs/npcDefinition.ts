/**
 * Manifesto SSOT — definições visuais e físicas de NPCs (sprites PNG).
 * Gameplay (posição, ações, diálogo) permanece em npcRegistry.ts.
 */
export const NPC_ASSET_PUBLIC_BASE = '/assets/npcs';

export type NpcDefinition = {
  readonly sprite: string;
  readonly width: number;
  readonly height: number;
  readonly isCollidable: boolean;
  readonly animationSpeed: number;
};

export const NPC_DEFINITION_REGISTRY: Readonly<Record<string, NpcDefinition>> = {
  anciao_cael: {
    sprite: 'npc_anciao.png',
    width: 40,
    height: 40,
    isCollidable: true,
    animationSpeed: 0.1,
  },
  treinador_zeno: {
    sprite: 'npc_treinador.png',
    width: 40,
    height: 40,
    isCollidable: true,
    animationSpeed: 0.15,
  },
} as const;

export type NpcDefinitionId = keyof typeof NPC_DEFINITION_REGISTRY;

const registry = NPC_DEFINITION_REGISTRY as Record<string, NpcDefinition>;

/** URLs públicas — chave = id do NPC no npcRegistry. */
export const NPC_SPRITE_IMAGE_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(NPC_DEFINITION_REGISTRY).map(([id, def]) => [
    id,
    `${NPC_ASSET_PUBLIC_BASE}/${def.sprite}`,
  ]),
);

export function getNpcDefinition(npcId: string): NpcDefinition | null {
  return registry[npcId] ?? null;
}

export function resolveNpcSpriteImageUrl(npcId: string): string | null {
  return NPC_SPRITE_IMAGE_URLS[npcId] ?? null;
}

export function listNpcDefinitionIds(): readonly string[] {
  return Object.keys(NPC_DEFINITION_REGISTRY);
}

/** Colisão de tile — padrão true para NPCs legados sem definição. */
export function isNpcDefinitionCollidable(npcId: string): boolean {
  const def = getNpcDefinition(npcId);
  return def?.isCollidable ?? true;
}

export function resolveNpcAnimationSpeed(npcId: string): number {
  return getNpcDefinition(npcId)?.animationSpeed ?? 0;
}
