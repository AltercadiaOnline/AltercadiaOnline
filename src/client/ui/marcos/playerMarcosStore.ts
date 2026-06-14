import { uiEvents, UIEventType } from '../uiEvents.js';

import { getPlayerProgressionStore } from '../../progression/playerProgressionStore.js';
import { getPlayerEquipmentStore } from '../equipment/playerEquipmentStore.js';

import {

  canChooseMarco,

  canSelectBranchStarter,

  resolveRamificacaoFromContext,

  type MarcoTreePlayerContext,

} from '../../../shared/progression/milestoneTreeState.js';

import {

  isMarcoBranchStarter,

  resolveRamificacaoFromStarter,

} from '../../../shared/progression/milestoneTreeCatalog.js';

import { isMarcosTrailResetAllowed } from './marcosTrailResetGate.js';
import type { MarcosNodeProgressionData } from '../../../shared/progression/marcoProgression.js';
import { emptyMarcosNodeProgression } from '../../../shared/progression/marcoProgression.js';



export type PlayerMarcosSnapshot = {
  readonly activeMarcos: readonly string[];
  readonly flowSpeedBase: number;
  readonly nodeProgression: MarcosNodeProgressionData;
};



type Listener = (snapshot: PlayerMarcosSnapshot) => void;



class PlayerMarcosStore {

  private activeMarcos: string[] = [];

  private flowSpeedBase = 35;

  private nodeProgression: MarcosNodeProgressionData = emptyMarcosNodeProgression();

  private readonly listeners = new Set<Listener>();



  subscribe(listener: Listener): () => void {

    this.listeners.add(listener);

    listener(this.getSnapshot());

    return () => this.listeners.delete(listener);

  }



  getSnapshot(): PlayerMarcosSnapshot {

    return {

      activeMarcos: [...this.activeMarcos],

      flowSpeedBase: this.flowSpeedBase,

      nodeProgression: {
        byNodeId: { ...this.nodeProgression.byNodeId },
      },

    };

  }



  getPlayerContext(): MarcoTreePlayerContext {

    const progression = getPlayerProgressionStore().getSnapshot();

    return {

      activeMarcos: this.activeMarcos,

      flowSpeedBase: this.flowSpeedBase,

      milestoneTotalProgress: progression.milestoneTotalProgress,

      playerLevel: getPlayerEquipmentStore().getSnapshot().level,

      ramificacaoSelecionada: resolveRamificacaoFromContext(progression.ramificacaoSelecionada),

      trilhaTravada: progression.trilhaTravada,

      nodeProgression: this.nodeProgression,

    };

  }



  setFlowSpeedBase(value: number): void {

    this.flowSpeedBase = Math.max(0, Math.floor(value));

    this.publish();

  }



  /** Escolha inicial de trilha — persiste ramificacaoSelecionada, trava escolha e ativa nível 1. */

  selectBranch(starterNodeId: string): boolean {

    if (!canSelectBranchStarter(starterNodeId, this.getPlayerContext())) return false;



    const ramificacao = resolveRamificacaoFromStarter(starterNodeId);

    if (!ramificacao) return false;



    const progression = getPlayerProgressionStore();

    progression.setRamificacaoSelecionada(ramificacao);

    progression.setTrilhaTravada(true);

    this.chooseMarco(starterNodeId);

    return true;

  }



  /** Ativa um marco disponível na trilha escolhida (cumulativo). */

  chooseMarco(nodeId: string): boolean {

    if (!canChooseMarco(nodeId, this.getPlayerContext())) return false;

    if (this.activeMarcos.includes(nodeId)) return true;

    this.activeMarcos = [...this.activeMarcos, nodeId];

    this.publish();

    uiEvents.emit(UIEventType.MARCO_CHOSEN, { nodeId });

    return true;

  }



  /** Espelha snapshot autoritativo do servidor (sem validação de trilha). */
  applyAuthoritativeSnapshot(
    activeMarcos: readonly string[],
    flowSpeedBase: number,
    nodeProgression: MarcosNodeProgressionData = emptyMarcosNodeProgression(),
  ): void {
    this.activeMarcos = [...activeMarcos];
    this.flowSpeedBase = Math.max(0, Math.floor(flowSpeedBase));
    this.nodeProgression = {
      byNodeId: { ...nodeProgression.byNodeId },
    };
    this.publish();
  }

  applyNodeProgression(nodeProgression: MarcosNodeProgressionData): void {
    this.nodeProgression = {
      byNodeId: { ...nodeProgression.byNodeId },
    };
    this.publish();
  }

  /** Reset completo — só permitido quando o jogador está no NPC de reset. */

  resetLockedTrail(): boolean {

    if (!isMarcosTrailResetAllowed()) return false;



    getPlayerProgressionStore().clearMarcosTrailSelection();

    this.activeMarcos = [];

    this.nodeProgression = emptyMarcosNodeProgression();

    this.publish();

    return true;

  }



  private publish(): void {

    const snapshot = this.getSnapshot();

    for (const listener of this.listeners) {

      listener(snapshot);

    }

    uiEvents.emit(UIEventType.MARCOS_UPDATED, snapshot);

  }

}



let store: PlayerMarcosStore | null = null;



export function getPlayerMarcosStore(): PlayerMarcosStore {

  if (!store) store = new PlayerMarcosStore();

  return store;

}



export function resetPlayerMarcosStore(): void {

  store = null;

}

