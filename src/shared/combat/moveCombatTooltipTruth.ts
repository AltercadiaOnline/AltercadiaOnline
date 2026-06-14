import { MoveCategory, MoveScalingStat, type MoveDefinition } from './moveTypes.js';
import { MoveEffectKind, type MoveEffectKind as MoveEffectKindType } from './classMovesetCatalog.js';

const HEAL_KINDS = new Set<MoveEffectKindType>([MoveEffectKind.Heal]);

const DEFENSE_ONLY_KINDS = new Set<MoveEffectKindType>([
  MoveEffectKind.SelfShield,
  MoveEffectKind.GroupShield,
  MoveEffectKind.StatusImmunity,
  MoveEffectKind.Thorns,
  MoveEffectKind.DamageMirror,
]);

/**
 * Como o build (equip / runa / livro / marcos) interage com este move no motor atual.
 * Fonte única para tooltip — deve espelhar CombatEngine + BattleEngine.
 */
export function formatMoveBuildImpactLine(move: MoveDefinition): string {
  if (HEAL_KINDS.has(move.effectKind as MoveEffectKindType)) {
    return 'No combate: cura = poder base × (1 + buffs de cura do turno). Linha “Escala com” indica build DEF; bônus de Defesa no equipamento reduz dano recebido, não amplia a cura hoje.';
  }

  if (DEFENSE_ONLY_KINDS.has(move.effectKind as MoveEffectKindType)) {
    return 'No combate: efeito defensivo no retrato/status — não usa fórmula Golpe − Defesa.';
  }

  if (move.category !== MoveCategory.Attack && (move.damage ?? 0) <= 0) {
    return 'No combate: utilitário/controle — leia o efeito principal acima.';
  }

  switch (move.scalingStat) {
    case MoveScalingStat.STR:
      return 'No combate: (Ataque da classe + poder base do move + Força do equipamento) − Defesa do alvo; buffs de ataque % no turno multiplicam o poder base antes do golpe.';
    case MoveScalingStat.CRIT:
      return 'No combate: mesma fórmula de golpe; bônus de Crítico (runa/livro) aumenta chance de crítico (×1,5+ dano), não soma no termo “Golpe”. Poder base ≠ dano final.';
    case MoveScalingStat.DEF:
      return 'No combate: poder base entra no golpe; bônus de Defesa no equipamento protege você, não soma dano neste ataque.';
    case MoveScalingStat.AGI:
      return 'No combate: poder base entra no golpe; Velocidade do build define iniciativa, não altera o número do hit.';
    default:
      return 'No combate: (Ataque da classe + poder base do move + Força do equipamento) − Defesa do alvo.';
  }
}
