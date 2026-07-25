// @ts-nocheck
/**
 * Feature flags de combate (runtime).
 * Desligue com COMBAT_V12_ENABLED=0 ou COMBAT_V12_ENABLED=false
 */
export function isCombatV12Enabled() {
    const raw = process.env.COMBAT_V12_ENABLED;
    if (raw === undefined || raw === '')
        return true;
    const normalized = raw.trim().toLowerCase();
    return normalized !== '0' && normalized !== 'false' && normalized !== 'off';
}
