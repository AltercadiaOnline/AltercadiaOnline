/** Slots de aparência — independentes do equipamento de batalha (stats). */
export const SkinSlotId = {
  Hair: 'hair',
  Shirt: 'shirt',
  Pants: 'pants',
  Shoes: 'shoes',
} as const;

export type SkinSlotId = (typeof SkinSlotId)[keyof typeof SkinSlotId];

export const SKIN_SLOT_ORDER: readonly SkinSlotId[] = [
  SkinSlotId.Hair,
  SkinSlotId.Shirt,
  SkinSlotId.Pants,
  SkinSlotId.Shoes,
];

export type PlayerSkin = {
  readonly hair: string;
  readonly shirt: string;
  readonly pants: string;
  readonly shoes: string;
};

export type SkinOption = {
  readonly id: string;
  readonly label: string;
  /** Cor de acento na UI do vestiário (terminal). */
  readonly accent: string;
};

export const SKIN_SLOT_LABELS: Record<SkinSlotId, string> = {
  [SkinSlotId.Hair]: 'Cabelo',
  [SkinSlotId.Shirt]: 'Parte de Cima',
  [SkinSlotId.Pants]: 'Parte de Baixo',
  [SkinSlotId.Shoes]: 'Sapatos',
};

export const SKIN_SLOT_CATALOG: Record<SkinSlotId, readonly SkinOption[]> = {
  [SkinSlotId.Hair]: [
    { id: 'slick_black', label: 'Black Slick', accent: '#1a1a2e' },
    { id: 'neon_undercut', label: 'Neon Undercut', accent: '#00ffcc' },
    { id: 'cropped_silver', label: 'Silver Crop', accent: '#b8c5d6' },
    { id: 'hood_down', label: 'Hood Down', accent: '#4a5568' },
  ],
  [SkinSlotId.Shirt]: [
    { id: 'techwear_jacket', label: 'Techwear Jacket', accent: '#2d3748' },
    { id: 'street_hoodie', label: 'Street Hoodie', accent: '#553c9a' },
    { id: 'corp_vest', label: 'Corp Vest', accent: '#2c5282' },
    { id: 'mesh_top', label: 'Mesh Top', accent: '#38b2ac' },
  ],
  [SkinSlotId.Pants]: [
    { id: 'cargo_black', label: 'Cargo Black', accent: '#1a202c' },
    { id: 'jogger_gray', label: 'Jogger Gray', accent: '#718096' },
    { id: 'tactical_strap', label: 'Tactical Strap', accent: '#4a5568' },
    { id: 'wide_urban', label: 'Wide Urban', accent: '#2d3748' },
  ],
  [SkinSlotId.Shoes]: [
    { id: 'runner_white', label: 'Runner White', accent: '#edf2f7' },
    { id: 'boot_combat', label: 'Combat Boot', accent: '#3d2914' },
    { id: 'platform_sneak', label: 'Platform Sneak', accent: '#e53e3e' },
    { id: 'slip_on', label: 'Slip-On', accent: '#2b6cb0' },
  ],
};

export function createDefaultPlayerSkin(): PlayerSkin {
  return {
    hair: SKIN_SLOT_CATALOG.hair[0]!.id,
    shirt: SKIN_SLOT_CATALOG.shirt[0]!.id,
    pants: SKIN_SLOT_CATALOG.pants[0]!.id,
    shoes: SKIN_SLOT_CATALOG.shoes[0]!.id,
  };
}

export function isSkinSlotId(value: string): value is SkinSlotId {
  return (SKIN_SLOT_ORDER as readonly string[]).includes(value);
}

export function getSkinOption(slot: SkinSlotId, optionId: string): SkinOption | undefined {
  return SKIN_SLOT_CATALOG[slot].find((option) => option.id === optionId);
}

export function getSkinOptionLabel(slot: SkinSlotId, optionId: string): string {
  return getSkinOption(slot, optionId)?.label ?? optionId;
}

export function isValidSkinSelection(skin: PlayerSkin): boolean {
  return SKIN_SLOT_ORDER.every((slot) => {
    const optionId = skin[slot];
    return getSkinOption(slot, optionId) !== undefined;
  });
}

export function isPlayerSkinRecord(value: unknown): value is PlayerSkin {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.hair === 'string'
    && typeof record.shirt === 'string'
    && typeof record.pants === 'string'
    && typeof record.shoes === 'string'
  );
}

/** IDs de skins possuídos por padrão — espelha createDefaultPlayerSkin(). */
export function getDefaultOwnedSkinIds(): Record<SkinSlotId, readonly string[]> {
  const defaults = createDefaultPlayerSkin();
  return {
    hair: [defaults.hair],
    shirt: [defaults.shirt],
    pants: [defaults.pants],
    shoes: [defaults.shoes],
  };
}
