/** Entrada de frequência de uso de habilidade no relatório pós-batalha. */
export type BattleMoveUsageEntry = {
  readonly nome: string;
  readonly uso: number;
};

/** Relatório estruturado exibido no PostBattleHub. */
export type BattleReportSnapshot = {
  readonly battleId: string;
  readonly totalDanoCausado: number;
  readonly totalDanoRecebido: number;
  readonly turnos: number;
  readonly movesUsados: readonly BattleMoveUsageEntry[];
};
