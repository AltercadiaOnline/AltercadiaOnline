import type { MoveDirection } from '../shared/world/protocol.js';

export type MovementKeys = {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  control: boolean;
};
export type WorldPoint = {
  x: number;
  y: number;
};

export type InputManagerInitOptions = {
  readonly canvas?: HTMLCanvasElement | null;
  readonly toWorld?: (clientX: number, clientY: number) => WorldPoint | null;
};

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || (target instanceof HTMLElement && target.isContentEditable)
  );
}

function movementKeyFromEvent(key: string): keyof MovementKeys | null {
  switch (key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      return 'w';
    case 'a':
    case 'arrowleft':
      return 'a';
    case 's':
    case 'arrowdown':
      return 's';
    case 'd':
    case 'arrowright':
      return 'd';
    default:
      return null;
  }
}

export const InputManager = {
  keys: {
    w: false,
    a: false,
    s: false,
    d: false,
    control: false,
  } as MovementKeys,
  targetPosition: null as WorldPoint | null,
  initialized: false,

  init(options: InputManagerInitOptions = {}): void {
    if (this.initialized) return;
    this.initialized = true;

    window.addEventListener('keydown', (e) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === 'Control') {
        this.keys.control = true;
        return;
      }

      const movementKey = movementKeyFromEvent(e.key);
      if (!movementKey) return;

      this.keys[movementKey] = true;

      if (['w', 'a', 's', 'd'].includes(movementKey)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Control') {
        this.keys.control = false;
        return;
      }

      const movementKey = movementKeyFromEvent(e.key);
      if (movementKey) {
        this.keys[movementKey] = false;
      }
    });

    window.addEventListener('blur', () => {
      this.keys.w = false;
      this.keys.a = false;
      this.keys.s = false;
      this.keys.d = false;
      this.keys.control = false;
    });

    const canvas = options.canvas;
    if (canvas) {
      canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (isTypingTarget(e.target)) return;

        const world = options.toWorld?.(e.clientX, e.clientY);
        if (world) {
          this.targetPosition = world;
        }
      });
    }
  },

  clearTarget(): void {
    this.targetPosition = null;
  },

  hasMovementInput(): boolean {
    return this.keys.w || this.keys.a || this.keys.s || this.keys.d;
  },

  getActiveDirection(): MoveDirection | null {
    if (this.keys.w) return 'up';
    if (this.keys.s) return 'down';
    if (this.keys.a) return 'left';
    if (this.keys.d) return 'right';
    return null;
  },
};
