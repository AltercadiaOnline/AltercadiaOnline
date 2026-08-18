import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { isStaticDistrictId } from '../../../shared/static/staticDistrictCatalog.js';
import {
  STATIC_NOT_LIVE_CODE,
  isStaticFlexReactionKind,
} from '../../../shared/static/staticNetworkTypes.js';

export class StaticSabotageContributeHandler extends BaseIntentHandler<{ readonly districtId: string }> {
  readonly actionType = 'STATIC_SABOTAGE_CONTRIBUTE';

  async execute(playerId: string, payload: { readonly districtId: string }, intentId: string): Promise<void> {
    if (!isStaticDistrictId(payload.districtId)) {
      this.sendResponse(playerId, intentId, false, 'DISTRICT_INVALID');
      return;
    }
    this.sendResponse(playerId, intentId, false, STATIC_NOT_LIVE_CODE);
  }
}

export class StaticWarRoomOpenHandler extends BaseIntentHandler<{ readonly districtId: string }> {
  readonly actionType = 'STATIC_WAR_ROOM_OPEN';

  async execute(playerId: string, payload: { readonly districtId: string }, intentId: string): Promise<void> {
    if (!isStaticDistrictId(payload.districtId)) {
      this.sendResponse(playerId, intentId, false, 'DISTRICT_INVALID');
      return;
    }
    this.sendResponse(playerId, intentId, false, STATIC_NOT_LIVE_CODE);
  }
}

export class StaticWarRoomJoinHandler extends BaseIntentHandler<{ readonly callId: string }> {
  readonly actionType = 'STATIC_WAR_ROOM_JOIN';

  async execute(playerId: string, payload: { readonly callId: string }, intentId: string): Promise<void> {
    if (typeof payload.callId !== 'string' || payload.callId.trim().length === 0) {
      this.sendResponse(playerId, intentId, false, 'CALL_INVALID');
      return;
    }
    this.sendResponse(playerId, intentId, false, STATIC_NOT_LIVE_CODE);
  }
}

export class StaticWarRoomLeaveHandler extends BaseIntentHandler<{ readonly callId: string }> {
  readonly actionType = 'STATIC_WAR_ROOM_LEAVE';

  async execute(playerId: string, payload: { readonly callId: string }, intentId: string): Promise<void> {
    if (typeof payload.callId !== 'string' || payload.callId.trim().length === 0) {
      this.sendResponse(playerId, intentId, false, 'CALL_INVALID');
      return;
    }
    this.sendResponse(playerId, intentId, false, STATIC_NOT_LIVE_CODE);
  }
}

export class StaticWarRoomLockHandler extends BaseIntentHandler<{ readonly callId: string }> {
  readonly actionType = 'STATIC_WAR_ROOM_LOCK';

  async execute(playerId: string, payload: { readonly callId: string }, intentId: string): Promise<void> {
    if (typeof payload.callId !== 'string' || payload.callId.trim().length === 0) {
      this.sendResponse(playerId, intentId, false, 'CALL_INVALID');
      return;
    }
    this.sendResponse(playerId, intentId, false, STATIC_NOT_LIVE_CODE);
  }
}

export class StaticFlexReactHandler extends BaseIntentHandler<{
  readonly targetCharacterId: number;
  readonly kind: string;
}> {
  readonly actionType = 'STATIC_FLEX_REACT';

  async execute(
    playerId: string,
    payload: { readonly targetCharacterId: number; readonly kind: string },
    intentId: string,
  ): Promise<void> {
    if (!Number.isFinite(payload.targetCharacterId) || payload.targetCharacterId < 1) {
      this.sendResponse(playerId, intentId, false, 'FLEX_TARGET_INVALID');
      return;
    }
    if (!isStaticFlexReactionKind(payload.kind)) {
      this.sendResponse(playerId, intentId, false, 'FLEX_KIND_INVALID');
      return;
    }
    this.sendResponse(playerId, intentId, false, STATIC_NOT_LIVE_CODE);
  }
}

export class StaticFlexSetHeadlineHandler extends BaseIntentHandler<{ readonly headline: string }> {
  readonly actionType = 'STATIC_FLEX_SET_HEADLINE';

  async execute(playerId: string, payload: { readonly headline: string }, intentId: string): Promise<void> {
    if (typeof payload.headline !== 'string') {
      this.sendResponse(playerId, intentId, false, 'HEADLINE_INVALID');
      return;
    }
    this.sendResponse(playerId, intentId, false, STATIC_NOT_LIVE_CODE);
  }
}

let sabotageHandler: StaticSabotageContributeHandler | null = null;
let warRoomOpenHandler: StaticWarRoomOpenHandler | null = null;
let warRoomJoinHandler: StaticWarRoomJoinHandler | null = null;
let warRoomLeaveHandler: StaticWarRoomLeaveHandler | null = null;
let warRoomLockHandler: StaticWarRoomLockHandler | null = null;
let flexReactHandler: StaticFlexReactHandler | null = null;
let flexHeadlineHandler: StaticFlexSetHeadlineHandler | null = null;

export function getStaticSabotageContributeHandler(): StaticSabotageContributeHandler {
  if (!sabotageHandler) sabotageHandler = new StaticSabotageContributeHandler();
  return sabotageHandler;
}

export function getStaticWarRoomOpenHandler(): StaticWarRoomOpenHandler {
  if (!warRoomOpenHandler) warRoomOpenHandler = new StaticWarRoomOpenHandler();
  return warRoomOpenHandler;
}

export function getStaticWarRoomJoinHandler(): StaticWarRoomJoinHandler {
  if (!warRoomJoinHandler) warRoomJoinHandler = new StaticWarRoomJoinHandler();
  return warRoomJoinHandler;
}

export function getStaticWarRoomLeaveHandler(): StaticWarRoomLeaveHandler {
  if (!warRoomLeaveHandler) warRoomLeaveHandler = new StaticWarRoomLeaveHandler();
  return warRoomLeaveHandler;
}

export function getStaticWarRoomLockHandler(): StaticWarRoomLockHandler {
  if (!warRoomLockHandler) warRoomLockHandler = new StaticWarRoomLockHandler();
  return warRoomLockHandler;
}

export function getStaticFlexReactHandler(): StaticFlexReactHandler {
  if (!flexReactHandler) flexReactHandler = new StaticFlexReactHandler();
  return flexReactHandler;
}

export function getStaticFlexSetHeadlineHandler(): StaticFlexSetHeadlineHandler {
  if (!flexHeadlineHandler) flexHeadlineHandler = new StaticFlexSetHeadlineHandler();
  return flexHeadlineHandler;
}
