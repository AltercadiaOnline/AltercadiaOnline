import { applyMarcosTrailResetAtNpc } from '../../progression/marcosTrailResetGateway.js';
import {
  chooseMarcoAuthoritative,
  selectMarcoBranchAuthoritative,
} from '../../../Economy/progressionGateway.js';
import type { MarcoProgressEvent } from '../../../shared/progression/marcoProgressEngine.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type SelectMarcoBranchPayload = { readonly starterNodeId: string };

export class SelectMarcoBranchHandler extends BaseIntentHandler<SelectMarcoBranchPayload> {
  readonly actionType = 'SELECT_MARCO_BRANCH';

  async execute(playerId: string, payload: SelectMarcoBranchPayload, intentId: string): Promise<void> {
    const result = selectMarcoBranchAuthoritative(
      playerId,
      this.characterId,
      payload.starterNodeId,
      intentId,
    );
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(playerId, intentId, true);
  }
}

export type ChooseMarcoPayload = { readonly nodeId: string };

export class ChooseMarcoHandler extends BaseIntentHandler<ChooseMarcoPayload> {
  readonly actionType = 'CHOOSE_MARCO';

  async execute(playerId: string, payload: ChooseMarcoPayload, intentId: string): Promise<void> {
    const result = chooseMarcoAuthoritative(
      playerId,
      this.characterId,
      payload.nodeId,
      intentId,
    );
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(playerId, intentId, true);
  }
}

export type ResetMarcoTrailPayload = { readonly npcId: string };

export class ResetMarcoTrailHandler extends BaseIntentHandler<ResetMarcoTrailPayload> {
  readonly actionType = 'RESET_MARCO_TRAIL';

  async execute(playerId: string, payload: ResetMarcoTrailPayload, intentId: string): Promise<void> {
    const result = await applyMarcosTrailResetAtNpc({
      playerId,
      characterId: this.characterId,
      npcId: payload.npcId,
      intentId,
    });
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(playerId, intentId, true);
  }
}

export type ProgressMarcoPayload = {
  readonly events: readonly MarcoProgressEvent[];
};

export class ProgressMarcoHandler extends BaseIntentHandler<ProgressMarcoPayload> {
  readonly actionType = 'PROGRESS_MARCO';

  async execute(playerId: string, _payload: ProgressMarcoPayload, intentId: string): Promise<void> {
    this.sendResponse(
      playerId,
      intentId,
      false,
      'Progressão de marcos é aplicada automaticamente pelo servidor ao fim da batalha.',
    );
  }
}

let selectHandler: SelectMarcoBranchHandler | null = null;
let chooseHandler: ChooseMarcoHandler | null = null;
let resetHandler: ResetMarcoTrailHandler | null = null;
let progressHandler: ProgressMarcoHandler | null = null;

export function getSelectMarcoBranchHandler(): SelectMarcoBranchHandler {
  if (!selectHandler) selectHandler = new SelectMarcoBranchHandler();
  return selectHandler;
}

export function getChooseMarcoHandler(): ChooseMarcoHandler {
  if (!chooseHandler) chooseHandler = new ChooseMarcoHandler();
  return chooseHandler;
}

export function getResetMarcoTrailHandler(): ResetMarcoTrailHandler {
  if (!resetHandler) resetHandler = new ResetMarcoTrailHandler();
  return resetHandler;
}

export function getProgressMarcoHandler(): ProgressMarcoHandler {
  if (!progressHandler) progressHandler = new ProgressMarcoHandler();
  return progressHandler;
}
