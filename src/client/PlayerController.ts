import { isPauseMenuOpen } from './components/pauseMenu.js';
import { GameState as GameStateValue } from '../shared/game/gameState.js';
import { getGameStateManager } from '../shared/state/GameStateManager.js';
import { isWorldSessionReady } from './world/worldSessionGate.js';
import { isWorldHudInteractionLocked } from './world/worldHudInteractionSession.js';
import type { Player } from './entities/Player.js';
import type { PlayerSprite } from './entities/player/PlayerSprite.js';
import type { PlayerAnimationSnapshot } from '../shared/world/playerAnimationState.js';
import type { MoveDirection } from '../shared/world/protocol.js';
import { composeGridStep } from '../shared/world/gridMovement.js';
import {
  axisContributionFromKeyboard,
  isMovementKey as isMovementKeyShared,
  normalizeMovementKeyCode,
  resolvePivotDirection,
} from '../shared/world/movementInput.js';
import { moveDirectionToFacing, moveVectorToFacing } from '../shared/world/playerFacing.js';
import { getWorldMovementAuthority } from './world/worldMovementAuthority.js';

export type KeysPressed = {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  diagNw: boolean;
  diagNe: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  control: boolean;
};

export type MovementKeyState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  control: boolean;
};

type NumpadAxisCounts = {
  up: number;
  down: number;
  left: number;
  right: number;
};

export type MovementInputStartCallback = (
  direction: MoveDirection | null,
) => void;

export type PlayerControllerAttachOptions = {
  readonly canvas?: HTMLCanvasElement | null;
  readonly onMovementInputStart?: MovementInputStartCallback;
};

export type ProcessPlayerMovementOptions = {
  readonly pauseMenuOpen?: boolean;
  readonly deltaMs?: number;
  readonly mapData?: number[][];
};

function createEmptyKeysPressed(): KeysPressed {
  return {
    w: false,
    a: false,
    s: false,
    d: false,
    diagNw: false,
    diagNe: false,
    up: false,
    down: false,
    left: false,
    right: false,
    control: false,
  };
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || (target instanceof HTMLElement && target.isContentEditable)
  );
}

function isNumpadCode(code: string): boolean {
  return normalizeMovementKeyCode(code).startsWith('Numpad');
}

export function isInCombatContext(): boolean {
  return getGameStateManager().isInCombat();
}

export function isControlKey(key: string, code = ''): boolean {
  return key === 'Control' || code === 'ControlLeft' || code === 'ControlRight';
}

export function isInteractKey(key: string, code = ''): boolean {
  return (
    key === 'Enter'
    || code === 'Enter'
    || key === ' '
    || code === 'Space'
  );
}

export function isMovementKey(key: string, code = ''): boolean {
  return isMovementKeyShared(key, code);
}

export function shouldAcceptGameplayInput(pauseMenuOpen: boolean): boolean {
  return isWorldSessionReady() && !pauseMenuOpen && !getGameStateManager().isInCombat();
}

export function shouldAcceptMovementInput(pauseMenuOpen: boolean): boolean {
  return (
    isWorldSessionReady()
    && !pauseMenuOpen
    && !getGameStateManager().isInCombat()
    && !isWorldHudInteractionLocked()
  );
}

export function directionFromKeyboard(key: string, code = ''): MoveDirection | null {
  const contrib = axisContributionFromKeyboard(key, code);
  if (!contrib) return null;
  if (contrib.up && !contrib.down && !contrib.left && !contrib.right) return 'up';
  if (contrib.down && !contrib.up && !contrib.left && !contrib.right) return 'down';
  if (contrib.left && !contrib.right && !contrib.up && !contrib.down) return 'left';
  if (contrib.right && !contrib.left && !contrib.up && !contrib.down) return 'right';
  return resolvePivotDirection({
    up: Boolean(contrib.up),
    down: Boolean(contrib.down),
    left: Boolean(contrib.left),
    right: Boolean(contrib.right),
  });
}

export class PlayerController {
  readonly keysPressed: KeysPressed = createEmptyKeysPressed();

  readonly numpadAxis: NumpadAxisCounts = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
  };

  readonly keys: MovementKeyState = {
    up: false,
    down: false,
    left: false,
    right: false,
    control: false,
  };

  private listenersAttached = false;
  private interactRequested = false;
  private npcInteractInRange = false;
  private unsubGameState: (() => void) | null = null;
  private onMovementInputStart: MovementInputStartCallback | null = null;
  /** Teclas do numpad pressionadas — evita contagem duplicada por key-repeat do SO. */
  private readonly numpadKeysHeld = new Set<string>();
  /** Pivot CTRL — gira uma vez por combinação CTRL+direção (evita spam e travamento). */
  private pivotLatchDirection: MoveDirection | null = null;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) return;

    if (event.key === 'Escape') {
      this.emergencyStop();
      return;
    }

    const movementContrib = axisContributionFromKeyboard(event.key, event.code);

    if (isControlKey(event.key, event.code)) {
      if (!shouldAcceptMovementInput(isPauseMenuOpen())) return;
      this.keysPressed.control = true;
      this.syncMovementKeys();
      event.preventDefault();
      return;
    }

    if (isInteractKey(event.key, event.code)) {
      if (shouldAcceptGameplayInput(isPauseMenuOpen())) {
        this.interactRequested = true;
      }
      event.preventDefault();
      return;
    }

    if (event.code === 'KeyE' && this.npcInteractInRange) {
      if (shouldAcceptGameplayInput(isPauseMenuOpen())) {
        this.interactRequested = true;
      }
      event.preventDefault();
      return;
    }

    if (!movementContrib) return;

    if (!shouldAcceptMovementInput(isPauseMenuOpen())) {
      event.preventDefault();
      return;
    }

    this.applyKeyState(event.key, event.code, true);
    if (!this.keysPressed.control) {
      this.notifyMovementInputStart();
    }
    event.preventDefault();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (isControlKey(event.key, event.code)) {
      this.keysPressed.control = false;
      this.pivotLatchDirection = null;
      this.syncMovementKeys();
      return;
    }

    if (!axisContributionFromKeyboard(event.key, event.code)) return;

    this.applyKeyState(event.key, event.code, false);
    if (this.keysPressed.control) {
      this.pivotLatchDirection = null;
    }
  };

  private readonly onWindowBlur = (): void => {
    this.resetKeys();
  };

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.resetKeys();
    }
  };

  attach(options: PlayerControllerAttachOptions = {}): void {
    if (this.listenersAttached) return;
    this.listenersAttached = true;
    this.onMovementInputStart = options.onMovementInputStart ?? null;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.unsubGameState = getGameStateManager().subscribe((state) => {
      if (state === GameStateValue.Battle || state === GameStateValue.Transitioning) {
        this.resetKeys();
      }
    });
  }

  detach(): void {
    if (!this.listenersAttached) return;
    this.listenersAttached = false;

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    this.unsubGameState?.();
    this.unsubGameState = null;
    this.onMovementInputStart = null;
    this.resetKeys();
  }

  setMovementInputStartCallback(callback: MovementInputStartCallback | null): void {
    this.onMovementInputStart = callback;
  }

  private notifyMovementInputStart(): void {
    this.syncMovementKeys();
    const direction = this.getActiveDirection();
    const authority = getWorldMovementAuthority();
    if (direction) {
      authority.lockPredictionFromInput({
        facing: moveDirectionToFacing(direction),
      });
    } else {
      authority.lockPredictionFromInput({});
    }
    this.onMovementInputStart?.(direction);
  }

  isAttached(): boolean {
    return this.listenersAttached;
  }

  resetKeys(): void {
    Object.assign(this.keysPressed, createEmptyKeysPressed());
    this.numpadKeysHeld.clear();
    this.numpadAxis.up = 0;
    this.numpadAxis.down = 0;
    this.numpadAxis.left = 0;
    this.numpadAxis.right = 0;
    this.pivotLatchDirection = null;
    this.syncMovementKeys();
    this.interactRequested = false;
  }

  emergencyStop(player?: Player, avatar?: PlayerSprite): void {
    this.resetKeys();
    player?.clearMovementInput();
    player?.clearWalkPath();
    avatar?.setMoving(false);
  }

  applyKeyState(key: string, code: string, pressed: boolean): void {
    switch (code) {
      case 'KeyW':
        this.keysPressed.w = pressed;
        this.syncMovementKeys();
        return;
      case 'KeyA':
        this.keysPressed.a = pressed;
        this.syncMovementKeys();
        return;
      case 'KeyS':
        this.keysPressed.s = pressed;
        this.syncMovementKeys();
        return;
      case 'KeyD':
        this.keysPressed.d = pressed;
        this.syncMovementKeys();
        return;
      case 'KeyQ':
        this.keysPressed.diagNw = pressed;
        this.syncMovementKeys();
        return;
      case 'KeyE':
        this.keysPressed.diagNe = pressed;
        this.syncMovementKeys();
        return;
      case 'ArrowUp':
        this.keysPressed.up = pressed;
        this.syncMovementKeys();
        return;
      case 'ArrowDown':
        this.keysPressed.down = pressed;
        this.syncMovementKeys();
        return;
      case 'ArrowLeft':
        this.keysPressed.left = pressed;
        this.syncMovementKeys();
        return;
      case 'ArrowRight':
        this.keysPressed.right = pressed;
        this.syncMovementKeys();
        return;
      default:
        break;
    }

    if (isNumpadCode(code)) {
      this.applyNumpadAxis(key, code, pressed);
      return;
    }

    const normalized = key.toLowerCase();
    if (normalized === 'w') this.keysPressed.w = pressed;
    else if (normalized === 'a') this.keysPressed.a = pressed;
    else if (normalized === 's') this.keysPressed.s = pressed;
    else if (normalized === 'd') this.keysPressed.d = pressed;
    else if (normalized === 'arrowup') this.keysPressed.up = pressed;
    else if (normalized === 'arrowdown') this.keysPressed.down = pressed;
    else if (normalized === 'arrowleft') this.keysPressed.left = pressed;
    else if (normalized === 'arrowright') this.keysPressed.right = pressed;
    else return;

    this.syncMovementKeys();
  }

  applyAxisInput(key: string, code: string, pressed: boolean): void {
    this.applyKeyState(key, code, pressed);
  }

  applyNumpadAxis(key: string, code: string, pressed: boolean): void {
    const movementCode = normalizeMovementKeyCode(code);
    const contrib = axisContributionFromKeyboard(key, movementCode);
    if (!contrib) return;

    if (pressed) {
      if (this.numpadKeysHeld.has(movementCode)) return;
      this.numpadKeysHeld.add(movementCode);
    } else {
      this.numpadKeysHeld.delete(movementCode);
    }

    this.rebuildNumpadAxisFromHeldKeys();
  }

  private rebuildNumpadAxisFromHeldKeys(): void {
    this.numpadAxis.up = 0;
    this.numpadAxis.down = 0;
    this.numpadAxis.left = 0;
    this.numpadAxis.right = 0;

    for (const heldCode of this.numpadKeysHeld) {
      const contrib = axisContributionFromKeyboard('', heldCode);
      if (!contrib) continue;
      if (contrib.up) this.numpadAxis.up = 1;
      if (contrib.down) this.numpadAxis.down = 1;
      if (contrib.left) this.numpadAxis.left = 1;
      if (contrib.right) this.numpadAxis.right = 1;
    }

    this.syncMovementKeys();
  }

  syncMovementKeys(): void {
    this.keys.up = this.keysPressed.w || this.keysPressed.up || this.numpadAxis.up > 0
      || this.keysPressed.diagNw || this.keysPressed.diagNe;
    this.keys.down = this.keysPressed.s || this.keysPressed.down || this.numpadAxis.down > 0;
    this.keys.left = this.keysPressed.a || this.keysPressed.left || this.numpadAxis.left > 0
      || this.keysPressed.diagNw;
    this.keys.right = this.keysPressed.d || this.keysPressed.right || this.numpadAxis.right > 0
      || this.keysPressed.diagNe;
    this.keys.control = this.keysPressed.control;
  }

  getMovementKeyState(): MovementKeyState {
    this.syncMovementKeys();
    return { ...this.keys };
  }

  isControlPressed(): boolean {
    this.syncMovementKeys();
    return this.keys.control;
  }

  consumeInteractRequest(): boolean {
    if (!this.interactRequested) return false;
    this.interactRequested = false;
    return true;
  }

  setNpcInteractInRange(inRange: boolean): void {
    this.npcInteractInRange = inRange;
  }

  hasMovementInput(): boolean {
    this.syncMovementKeys();
    if (this.keys.up && this.keys.down) return false;
    if (this.keys.left && this.keys.right) return false;
    return this.keys.up || this.keys.down || this.keys.left || this.keys.right;
  }

  getActiveDirection(): MoveDirection | null {
    this.syncMovementKeys();
    return resolvePivotDirection(this.keys);
  }

  getActiveGridStep() {
    return composeGridStep(this.keys);
  }

  /** Deriva IDLE/WALK/RUN a partir da velocidade autoritativa do Player. */
  getAnimationState(player: Player): PlayerAnimationSnapshot {
    return player.getAnimationState();
  }

  private syncAvatarAnimation(player: Player, avatar?: PlayerSprite): void {
    if (!avatar) return;
    avatar.applyAnimationSnapshot(player.getAnimationState());
  }

  /** CTRL + seta — gira no eixo uma vez; não chama stop() a cada frame. */
  private applyPivotRotate(
    player: Player,
    avatar: PlayerSprite | undefined,
    pivot: MoveDirection,
  ): void {
    player.clearWalkPath();
    player.clearMovementInput();
    avatar?.setMoving(false);

    if (this.pivotLatchDirection === pivot) {
      avatar?.setFacing(player.facing);
      return;
    }

    this.pivotLatchDirection = pivot;
    player.rotate(pivot);
    getWorldMovementAuthority().lockPredictionFromInput({
      facing: player.facing,
      x: player.x,
      y: player.y,
    });
    avatar?.setFacing(player.facing);
    this.syncAvatarAnimation(player, avatar);
  }

  processMovementFrame(
    player: Player,
    avatar?: PlayerSprite,
    options: ProcessPlayerMovementOptions = {},
  ): void {
    const pauseMenuOpen = options.pauseMenuOpen ?? isPauseMenuOpen();
    const deltaMs = options.deltaMs ?? 16.67;
    const mapData = options.mapData;

    if (!shouldAcceptMovementInput(pauseMenuOpen)) {
      player.clearMovementInput();
      player.clearWalkPath();
      avatar?.setMoving(false);
      this.syncAvatarAnimation(player, avatar);
      return;
    }

    if (!mapData) return;

    const movementKeys = this.hasMovementInput() ? this.getMovementKeyState() : null;

    if (!movementKeys) {
      if (!player.hasActiveWalkPath()) {
        avatar?.setMoving(player.isMoving);
      }
      player.tickGridMovement(deltaMs, mapData, null);
      this.syncAvatarAnimation(player, avatar);
      return;
    }

    if (this.isControlPressed()) {
      const pivot = this.getActiveDirection();
      if (pivot) {
        this.applyPivotRotate(player, avatar, pivot);
        return;
      }
      // CTRL sozinho — não bloqueia locomoção normal.
    }

    const step = this.getActiveGridStep();
    if (step) {
      player.facing = moveVectorToFacing(step.stepX, step.stepY);
    }

    getWorldMovementAuthority().extendPredictionLock({
      facing: player.facing,
      x: player.x,
      y: player.y,
    });

    player.tickGridMovement(deltaMs, mapData, movementKeys);

    if (this.hasMovementInput()) {
      avatar?.setFacing(player.facing);
      avatar?.setMoving(player.isMoving || player.isGridAnimating());
    } else {
      this.syncAvatarAnimation(player, avatar);
    }
  }
}

export const playerController = new PlayerController();
