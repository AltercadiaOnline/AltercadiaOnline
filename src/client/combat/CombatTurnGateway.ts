import type { PendingIntentRegistry } from '../sync/pendingIntentRegistry.js';

export type CombatAnimationGate = {
  readonly isAnimating: boolean;
  subscribe(listener: (animating: boolean) => void): () => void;
};

const BATTLE_COMMAND_SELECTOR = '.battle-command-bar [data-battle-cmd], nav.battle-command-bar [data-battle-cmd]';
const BATTLE_ITEMS_SELECTOR = '[data-hud-battle-items] .battle-menu-btn, [data-hud-battle-items] button';
const BATTLE_MOVESET_SELECTOR = '[data-hud-skill-actions] .battle-menu-btn:not(.is-empty)';

/**
 * Espelha ActionGatewayButton — desabilita comandos de turno enquanto `isAnimating` ou pending extra.
 */
export class CombatTurnGatewayController {
  private root: ParentNode | null = null;
  private unsubscribeGate: (() => void) | null = null;
  private unsubscribeRegistry: (() => void) | null = null;
  private extraBlocked = false;

  constructor(
    private readonly gate: CombatAnimationGate,
    private readonly pendingRegistry?: PendingIntentRegistry,
  ) {}

  bindRoot(root: ParentNode = document): void {
    this.root = root;
    this.unsubscribeGate?.();
    this.unsubscribeGate = this.gate.subscribe(() => this.sync());
    this.unsubscribeRegistry?.();
    this.unsubscribeRegistry = this.pendingRegistry?.subscribeChange(() => this.sync()) ?? null;
    this.sync();
  }

  setExtraBlocked(blocked: boolean): void {
    this.extraBlocked = blocked;
    this.sync();
  }

  isAnimating(): boolean {
    return this.gate.isAnimating;
  }

  isBlocked(): boolean {
    return this.extraBlocked
      || this.gate.isAnimating
      || (this.pendingRegistry?.isCombatVfxAnimating() ?? false);
  }

  destroy(): void {
    this.unsubscribeGate?.();
    this.unsubscribeGate = null;
    this.unsubscribeRegistry?.();
    this.unsubscribeRegistry = null;
    this.setBlockedOnTargets(false);
  }

  private sync(): void {
    this.setBlockedOnTargets(this.isBlocked());
  }

  private setBlockedOnTargets(blocked: boolean): void {
    const targets = this.collectTargets();
    for (const element of targets) {
      if ('disabled' in element) {
        (element as HTMLButtonElement).disabled = blocked;
      }
      if (blocked) element.setAttribute('aria-busy', 'true');
      else element.removeAttribute('aria-busy');
    }
  }

  private collectTargets(): HTMLElement[] {
    if (!this.root) return [];
    const list: HTMLElement[] = [];
    for (const element of this.root.querySelectorAll<HTMLElement>(BATTLE_COMMAND_SELECTOR)) {
      list.push(element);
    }
    for (const element of this.root.querySelectorAll<HTMLElement>(BATTLE_ITEMS_SELECTOR)) {
      list.push(element);
    }
    for (const element of this.root.querySelectorAll<HTMLElement>(BATTLE_MOVESET_SELECTOR)) {
      list.push(element);
    }
    return list;
  }
}

let activeGateway: CombatTurnGatewayController | null = null;

export function getCombatTurnGateway(): CombatTurnGatewayController | null {
  return activeGateway;
}

export function initCombatTurnGateway(
  gate: CombatAnimationGate,
  root: ParentNode = document,
  pendingRegistry?: PendingIntentRegistry,
): CombatTurnGatewayController {
  activeGateway?.destroy();
  activeGateway = new CombatTurnGatewayController(gate, pendingRegistry);
  activeGateway.bindRoot(root);
  return activeGateway;
}

export function resetCombatTurnGateway(): void {
  activeGateway?.destroy();
  activeGateway = null;
}
