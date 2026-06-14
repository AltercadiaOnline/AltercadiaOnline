/** Mensagens amigáveis para ACTION_REJECTED (espelho de CombatEngine.validateAction). */
export function formatCombatActionRejection(reason: string): string {
  switch (reason) {
    case 'STALE_TURN':
      return 'Turno desatualizado — aguarde a confirmação do servidor.';
    case 'INVALID_SKILL':
      return 'Este movimento não está disponível nesta batalha.';
    case 'SKILL_ON_COOLDOWN':
      return 'Movimento em recarga.';
    case 'NO_PP':
      return 'PP insuficiente para este movimento.';
    case 'SKILL_LOCKED':
      return 'Movimento bloqueado por efeito de status.';
    case 'NOT_YOUR_TURN':
    case 'NOT_IN_CHOOSING_PHASE':
      return 'Aguarde sua vez para agir.';
    case 'TURN_CHOICE_EXPIRED':
      return 'Tempo esgotado — aguarde o próximo turno.';
    case 'TURN_CHOICE_NOT_OPEN':
      return 'Janela de escolha encerrada.';
    case 'PARALYZED_TURN_SKIP':
      return 'Paralisia impediu sua ação.';
    case 'CONFUSED_TURN_SKIP':
      return 'Confusão impediu sua ação.';
    case 'POTION_ON_COOLDOWN':
      return 'Poção em recarga.';
    case 'PET_INACTIVE':
      return 'Pet indisponível no momento.';
    case 'BATTLE_ENDED':
      return 'A batalha já terminou.';
    default:
      return 'Sua ação não pôde ser executada.';
  }
}
