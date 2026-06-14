import {

  computeMarcoBranchTotals,

  type MarcoDominanceInput,

} from '../progression/estiloPersonagem.js';



/** Bônus plano de domínio Marcos na Ficha (trilhas) — não usar na fórmula de dano do motor. */

export type MarcoCombatBonus = {

  readonly attackFlat: number;

  readonly defenseFlat: number;

};



/**

 * Domínio por trilha para UI/Ficha.

 * Combate passivo usa `resolveCombatLoadout` + `marcoCombatEffectCatalog`.

 */

export function resolveMarcoCombatBonus(

  loadout: readonly string[],

  marcos: MarcoDominanceInput | undefined,

): MarcoCombatBonus {

  if (!marcos) {

    return { attackFlat: 0, defenseFlat: 0 };

  }



  const totals = computeMarcoBranchTotals(loadout, marcos);

  return {

    attackFlat: totals.fluxo + totals.precisao,

    defenseFlat: totals.resiliencia,

  };

}


