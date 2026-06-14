/** @deprecated Use InputHandler from `./inputHandler.js`. */
export {
  InputHandler as InputManager,
  directionFromKeyboard,
  isControlKey,
  isMovementKey,
  shouldAcceptGameplayInput,
  type InputHandlerInitOptions as InputManagerInitOptions,
  type MovementKeyState,
} from './inputHandler.js';

export type WorldPoint = {
  x: number;
  y: number;
};
