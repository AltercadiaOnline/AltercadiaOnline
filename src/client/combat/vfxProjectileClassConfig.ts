// @ts-nocheck
/** Configuração autoritativa de cor por arquétipo — um único sprite base + filtro dinâmico. */
export const VFX_PROJECTILE_CLASS_TINTS = {
    WARRIOR: {
        cssFilter: 'hue-rotate(0deg) saturate(1.25) brightness(1.08) drop-shadow(0 0 6px rgba(255, 120, 60, 0.65))',
    },
    MAGE: {
        cssFilter: 'hue-rotate(195deg) saturate(1.45) brightness(1.12) drop-shadow(0 0 8px rgba(90, 170, 255, 0.75))',
    },
    ROGUE: {
        cssFilter: 'hue-rotate(95deg) saturate(1.15) brightness(0.98) drop-shadow(0 0 7px rgba(80, 220, 140, 0.6))',
    },
};
/** Motor Altercadia (ClassType) → arquétipo VFX WARRIOR / MAGE / ROGUE. */
export const CLASS_TYPE_TO_VFX_ARCHETYPE = {
    IMPETUS: 'WARRIOR',
    COGITOR: 'MAGE',
    TUTATOR: 'WARRIOR',
    DISSOLUTUS: 'ROGUE',
};
/** Ajuste fino quando duas classes compartilham o mesmo arquétipo base. */
const CLASS_TYPE_TINT_OVERRIDE = {
    TUTATOR: 'hue-rotate(18deg) saturate(1.1)',
};
export function resolveVfxArchetypeForClass(classId) {
    return CLASS_TYPE_TO_VFX_ARCHETYPE[classId] ?? 'WARRIOR';
}
export function resolveVfxTintForPlayerClass(classId) {
    const archetype = resolveVfxArchetypeForClass(classId);
    const base = VFX_PROJECTILE_CLASS_TINTS[archetype];
    const override = CLASS_TYPE_TINT_OVERRIDE[classId];
    if (!override)
        return base;
    return {
        cssFilter: `${base.cssFilter} ${override}`,
    };
}
export function applyProjectileClassTint(element, classId) {
    const archetype = resolveVfxArchetypeForClass(classId);
    const tint = resolveVfxTintForPlayerClass(classId);
    element.style.filter = tint.cssFilter;
    element.dataset.vfxClass = archetype;
    element.dataset.playerClass = classId;
    return archetype;
}
