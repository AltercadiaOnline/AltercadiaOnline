import type { BattleReportSnapshot } from '../../../shared/combat/battleReportTypes.js';
import { getBattleStatsBridge } from '../../app/bridge/battleStatsBridge.js';

export type BattleStatisticsData = BattleReportSnapshot;

/** Apresenta relatório via React overlay (`BattleStatisticsMount`). */
export function showBattleStatisticsPanel(
  data: BattleStatisticsData,
  _mountRoot?: ParentNode,
): () => void {
  getBattleStatsBridge().present(data);
  return () => {
    getBattleStatsBridge().dismiss();
  };
}

export function closeBattleStatisticsPanel(): void {
  getBattleStatsBridge().dismiss();
}
