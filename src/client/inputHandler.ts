/**
 * Facade legado — use PlayerController para novo código.
 */
import type { Player } from './entities/Player.js';
import type { PlayerSprite } from './entities/player/PlayerSprite.js';
import type { PlayerAnimationSnapshot } from '../shared/world/playerAnimationState.js';
import {
  playerController,
  type KeysPressed,
  type MovementKeyState,
  type PlayerControllerAttachOptions,
  type ProcessPlayerMovementOptions,
  directionFromKeyboard,
  isControlKey,
  isInteractKey,
  isMovementKey,
  shouldAcceptGameplayInput,
  shouldAcceptMovementInput,
  isInCombatContext,
} from './PlayerController.js';

export type {
  KeysPressed,
  MovementKeyState,
  PlayerControllerAttachOptions as InputHandlerInitOptions,
  ProcessPlayerMovementOptions as ProcessPlayerInputOptions,
};

export {
  directionFromKeyboard,
  isControlKey,
  isInteractKey,
  isMovementKey,
  shouldAcceptGameplayInput,
  shouldAcceptMovementInput,
  isInCombatContext,
};

export const InputHandler = {
  get keysPressed(): KeysPressed {
    return playerController.keysPressed;
  },

  get numpadAxis() {
    return playerController.numpadAxis;
  },

  get keys(): MovementKeyState {
    return playerController.keys;
  },

  get initialized(): boolean {
    return playerController.isAttached();
  },

  init(options: PlayerControllerAttachOptions = {}): void {
    playerController.attach(options);
  },

  detach(): void {
    playerController.detach();
  },

  resetKeys(): void {
    playerController.resetKeys();
  },

  emergencyStop(player?: Player, avatar?: PlayerSprite): void {
    playerController.emergencyStop(player, avatar);
  },

  applyKeyState(key: string, code: string, pressed: boolean): void {
    playerController.applyKeyState(key, code, pressed);
  },

  applyAxisInput(key: string, code: string, pressed: boolean): void {
    playerController.applyAxisInput(key, code, pressed);
  },

  applyNumpadAxis(key: string, code: string, pressed: boolean): void {
    playerController.applyNumpadAxis(key, code, pressed);
  },

  syncMovementKeys(): void {
    playerController.syncMovementKeys();
  },

  getMovementKeyState(): MovementKeyState {
    return playerController.getMovementKeyState();
  },

  isControlPressed(): boolean {
    return playerController.isControlPressed();
  },

  consumeInteractRequest(): boolean {
    return playerController.consumeInteractRequest();
  },

  setNpcInteractInRange(inRange: boolean): void {
    playerController.setNpcInteractInRange(inRange);
  },

  hasMovementInput(): boolean {
    return playerController.hasMovementInput();
  },

  getActiveDirection() {
    return playerController.getActiveDirection();
  },

  getActiveGridStep() {
    return playerController.getActiveGridStep();
  },

  getAnimationState(player: Player): PlayerAnimationSnapshot {
    return playerController.getAnimationState(player);
  },

  processPlayerInput(
    player: Player,
    avatar?: PlayerSprite,
    options: ProcessPlayerMovementOptions = {},
  ): void {
    playerController.processMovementFrame(player, avatar, options);
  },
};
