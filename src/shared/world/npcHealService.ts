/** NPC autorizado a restaurar HP/MP na cidade. */
export const NPC_HEAL_PROVIDER_ANCIAO_CAEL = 'anciao_cael';

/** Novatos (nível ≤ 5) curam gratuitamente. */
export const HEAL_FREE_MAX_LEVEL = 5;

/** Custo em VOLTS para jogadores acima do limite gratuito. */
export const HEAL_VOLT_COST = 40;

export type HealVitalsSnapshot = {
  readonly hpCurrent: number;
  readonly hpMax: number;
  readonly mpCurrent: number;
  readonly mpMax: number;
};

export type HealPlayerInput = {
  readonly npcId: string;
  readonly playerLevel: number;
  readonly walletVolts: number;
  readonly vitals: HealVitalsSnapshot;
};

export type HealPlayerSuccess = {
  readonly ok: true;
  readonly voltsCost: number;
  readonly walletVolts: number;
  readonly vitals: HealVitalsSnapshot;
  readonly message: string;
};

export type HealPlayerFailure = {
  readonly ok: false;
  readonly reason: string;
};

export type HealPlayerResult = HealPlayerSuccess | HealPlayerFailure;

function isFullyRecovered(vitals: HealVitalsSnapshot): boolean {
  return vitals.hpCurrent >= vitals.hpMax && vitals.mpCurrent >= vitals.mpMax;
}

export function resolveHealVoltsCost(playerLevel: number): number {
  return playerLevel <= HEAL_FREE_MAX_LEVEL ? 0 : HEAL_VOLT_COST;
}

/** Restaura HP/MP — regras de nível e carteira (autoritativo). */
export function healPlayer(input: HealPlayerInput): HealPlayerResult {
  if (input.npcId !== NPC_HEAL_PROVIDER_ANCIAO_CAEL) {
    return { ok: false, reason: 'Este NPC não oferece cura.' };
  }

  if (isFullyRecovered(input.vitals)) {
    return { ok: false, reason: 'Você já está com vida e MP completos.' };
  }

  const voltsCost = resolveHealVoltsCost(input.playerLevel);
  if (voltsCost > input.walletVolts) {
    return { ok: false, reason: 'VOLTS insuficientes para a cura.' };
  }

  const walletVolts = input.walletVolts - voltsCost;
  const vitals: HealVitalsSnapshot = {
    ...input.vitals,
    hpCurrent: input.vitals.hpMax,
    mpCurrent: input.vitals.mpMax,
  };

  const message =
    voltsCost > 0
      ? `Vida e MP restaurados (−${voltsCost} VOLTS).`
      : 'Vida e MP restaurados gratuitamente.';

  return { ok: true, voltsCost, walletVolts, vitals, message };
}
