import { getProjectileAsset } from '../../assets/combat/combatAssetManifest.js';
import type {
  CombatActionIntentResultData,
  CombatActionKind,
} from '../../shared/combat/combatIntentFeedback.js';
import { resolveFeedbackEffectType } from '../../shared/combat/combatIntentFeedback.js';
import type { CombatVfxEffectType } from '../../shared/combat/combatVfxEffectTypes.js';
import { exactOptionalProps } from '../../shared/util/exactOptionalProps.js';
import type { ClassType } from '../../shared/types/classes.js';
import { resolveUseCombatAssets } from '../config/combatAssetConfig.js';
import { getPendingIntentRegistry } from '../sync/pendingIntentRegistry.js';
import { showFloatingTextAtElement } from './FloatingText.js';
import { resolveBattleEffectsHost } from './battleEffectsLayer.js';
import { resolveActivePlayerClassId } from './vfxProjectilePlayerClass.js';
import { tweenProjectileWithGsap } from './vfxProjectileGsap.js';
import { logCriticalBattleError } from './combatSafeExecution.js';

export { getProjectileAsset } from '../../assets/combat/combatAssetManifest.js';

/** Palette swap por classe do jogo — servidor autoriza; cliente aplica no spawn. */
export type ClassVfxPaletteConfig = {
  readonly filter: string;
  readonly vibe: string;
};

export const CLASS_VFX_CONFIG: Readonly<Record<ClassType, ClassVfxPaletteConfig>> = {
  IMPETUS: {
    filter: 'hue-rotate(0deg) saturate(1.3) brightness(1.1) drop-shadow(0 0 6px rgba(255, 90, 40, 0.7))',
    vibe: 'assault',
  },
  COGITOR: {
    filter: 'hue-rotate(198deg) saturate(1.5) brightness(1.14) drop-shadow(0 0 8px rgba(70, 160, 255, 0.8))',
    vibe: 'arcane',
  },
  TUTATOR: {
    filter: 'hue-rotate(28deg) saturate(1.2) brightness(1.05) drop-shadow(0 0 6px rgba(255, 200, 80, 0.65))',
    vibe: 'guardian',
  },
  DISSOLUTUS: {
    filter: 'hue-rotate(108deg) saturate(1.2) brightness(0.96) drop-shadow(0 0 7px rgba(60, 210, 130, 0.65))',
    vibe: 'rogue',
  },
};

const PLAYER_PORTRAIT_SELECTOR = '#battle-player-portrait';
const OPPONENT_PORTRAIT_SELECTOR = '#battle-opponent-portrait';
const BATTLE_SCENE_SELECTOR = '#scene-combat';
const BATTLE_ARENA_SELECTOR = '.battle-arena';
const IMPACT_HIT_STOP_MS = 100;
const DEDUPE_WINDOW_MS = 900;

export type VfxPosition = {
  readonly x: number;
  readonly y: number;
};

/** Duração do voo — 3× a base original para leitura cinematográfica. */
const EFFECT_DURATION_MS: Record<CombatVfxEffectType, number> = {
  PROJECTILE_BASIC: 780,
  SLASH: 660,
  FIREBALL: 960,
  ICE_SHARD: 900,
  SHOCK: 780,
  HEAL_GLOW: 900,
  BLOCK_IMPACT: 600,
};

function waitMs(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  const schedule = typeof globalThis.setTimeout === 'function'
    ? globalThis.setTimeout.bind(globalThis)
    : setTimeout;
  return new Promise((resolve) => {
    schedule(resolve, ms);
  });
}

function waitOneFrame(): Promise<void> {
  if (typeof requestAnimationFrame !== 'function') {
    return waitMs(16);
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function resolveScope(root?: ParentNode): ParentNode | Document | null {
  if (root) return root;
  return typeof document !== 'undefined' ? document : null;
}

function isDocumentLike(scope: ParentNode | Document): scope is Document {
  return 'createElement' in scope && typeof (scope as Document).createElement === 'function';
}

function resolveDocument(scope: ParentNode | Document): Document | null {
  if (isDocumentLike(scope)) return scope;
  if ('ownerDocument' in scope && scope.ownerDocument) return scope.ownerDocument;
  return typeof document !== 'undefined' ? document : null;
}

function canQuerySelector(scope: ParentNode | Document): scope is ParentNode & Document {
  return typeof (scope as Document).querySelector === 'function';
}

function resolvePortrait(scope: ParentNode | Document | null, selector: string): HTMLElement | null {
  if (!scope || !canQuerySelector(scope)) return null;
  return scope.querySelector<HTMLElement>(selector);
}

function resolveScene(scope: ParentNode | Document | null): HTMLElement | null {
  if (!scope || !canQuerySelector(scope)) return null;
  return (
    scope.querySelector<HTMLElement>(BATTLE_ARENA_SELECTOR)
    ?? scope.querySelector<HTMLElement>(BATTLE_SCENE_SELECTOR)
  );
}

export function portraitCenter(portrait: HTMLElement, host: HTMLElement): VfxPosition {
  const portraitRect = portrait.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  return {
    x: portraitRect.left - hostRect.left + portraitRect.width * 0.5,
    y: portraitRect.top - hostRect.top + portraitRect.height * 0.4,
  };
}

function projectileClassFor(effectType: CombatVfxEffectType): string {
  return `vfx-projectile vfx-projectile--sphere vfx-projectile--${effectType.toLowerCase().replace(/_/g, '-')}`;
}

/** Aplica palette swap CSS no projétil — lido da classe ativa no momento do spawn. */
export function applyClassPaletteSwap(element: HTMLElement, classId: ClassType): ClassVfxPaletteConfig {
  const config = CLASS_VFX_CONFIG[classId] ?? CLASS_VFX_CONFIG.IMPETUS;
  element.style.filter = config.filter;
  element.dataset.vfxVibe = config.vibe;
  element.dataset.playerClass = classId;
  return config;
}

function applyProjectileLayout(element: HTMLElement, sourcePos: VfxPosition): void {
  element.style.position = 'absolute';
  element.style.left = `${sourcePos.x}px`;
  element.style.top = `${sourcePos.y}px`;
  element.style.transform = 'translate(-50%, -50%)';
  element.style.zIndex = '18';
  element.style.pointerEvents = 'none';
}

/** Placeholder — div esfera 20×20 com palette swap por classe. */
export function createProjectilePlaceholderElement(
  doc: Document,
  effectType: CombatVfxEffectType,
  classId: ClassType,
  sourcePos: VfxPosition,
): HTMLDivElement {
  const div = doc.createElement('div');
  div.className = `${projectileClassFor(effectType)} vfx-projectile--placeholder`;
  div.setAttribute('aria-hidden', 'true');
  div.setAttribute('data-vfx-effect', effectType);
  div.setAttribute('data-vfx-mode', 'placeholder');
  applyClassPaletteSwap(div, classId);

  div.style.width = '20px';
  div.style.height = '20px';
  div.style.borderRadius = '50%';
  applyProjectileLayout(div, sourcePos);

  return div;
}

/** Asset real — img PNG de src/assets/combat/projectiles/ (+ tint por classe). */
export function createProjectileImageElement(
  doc: Document,
  effectType: CombatVfxEffectType,
  classId: ClassType,
  sourcePos: VfxPosition,
): HTMLImageElement {
  const img = doc.createElement('img');
  img.src = getProjectileAsset(effectType);
  img.alt = '';
  img.draggable = false;
  img.className = `${projectileClassFor(effectType)} vfx-projectile--image`;
  img.setAttribute('aria-hidden', 'true');
  img.setAttribute('data-vfx-effect', effectType);
  img.setAttribute('data-vfx-mode', 'asset');
  applyClassPaletteSwap(img, classId);
  applyProjectileLayout(img, sourcePos);

  return img;
}

export function createProjectileElement(
  doc: Document,
  effectType: CombatVfxEffectType,
  classId: ClassType,
  sourcePos: VfxPosition,
  useAssets: boolean = resolveUseCombatAssets(),
): HTMLElement {
  if (useAssets) {
    return createProjectileImageElement(doc, effectType, classId, sourcePos);
  }
  return createProjectilePlaceholderElement(doc, effectType, classId, sourcePos);
}

function detachProjectile(projectile: HTMLElement): void {
  if (projectile.isConnected) {
    projectile.remove();
  }
}

export function isProjectileCombatAction(action: CombatActionKind): boolean {
  return action === 'ATTACK' || action === 'SKILL';
}

export type PlayAttackAnimationOptions = {
  readonly host?: HTMLElement;
  readonly targetElement?: HTMLElement;
  readonly scene?: HTMLElement | null;
  readonly damage?: number;
  readonly skipImpactEffects?: boolean;
  readonly skipRegistryLock?: boolean;
  readonly doc?: Document;
  readonly classId?: ClassType;
  readonly resolveClassId?: () => ClassType;
  readonly useCombatAssets?: boolean;
  readonly tweenProjectile?: (
    element: HTMLElement,
    from: VfxPosition,
    to: VfxPosition,
    durationMs: number,
  ) => Promise<void>;
};

/**
 * Projétil 2D — player estático; apenas a esfera viaja até o adversário.
 */
export class VfxProjectileManager {
  private lastSignature = '';
  private suppressUntil = 0;
  private playing = false;

  get isPlaying(): boolean {
    return this.playing;
  }

  buildSignature(data: CombatActionIntentResultData): string {
    const effectType = resolveFeedbackEffectType(data.feedback, data.action);
    return `${data.action}:${data.damage}:${effectType}`;
  }

  shouldSkipDuplicate(data: CombatActionIntentResultData): boolean {
    const signature = this.buildSignature(data);
    if (signature === this.lastSignature && Date.now() < this.suppressUntil) {
      return true;
    }
    return false;
  }

  async playAttackAnimation(
    sourcePos: VfxPosition,
    targetPos: VfxPosition,
    effectType: CombatVfxEffectType,
    options: PlayAttackAnimationOptions = {},
  ): Promise<boolean> {
    const host = options.host;
    const doc = options.doc ?? (typeof document !== 'undefined' ? document : null);
    if (!host || !doc) return false;

    const registry = getPendingIntentRegistry();
    const lockRegistry = !options.skipRegistryLock;
    const tween = options.tweenProjectile ?? ((el, from, to, ms) => (
      tweenProjectileWithGsap(el, from, to, {
        durationMs: ms,
        ease: 'sine.inOut',
      })
    ));

    this.playing = true;
    if (lockRegistry) registry.beginCombatVfxAnimation();

    const classId = options.classId
      ?? options.resolveClassId?.()
      ?? resolveActivePlayerClassId();
    const useAssets = options.useCombatAssets ?? resolveUseCombatAssets();
    const projectile = createProjectileElement(doc, effectType, classId, sourcePos, useAssets);
    host.appendChild(projectile);

    try {
      await tween(
        projectile,
        sourcePos,
        targetPos,
        EFFECT_DURATION_MS[effectType],
      );

      if (!options.skipImpactEffects && options.targetElement) {
        await this.playImpactPipeline(
          options.damage ?? 0,
          options.targetElement,
          options.scene ?? null,
        );
      }

      detachProjectile(projectile);
    } catch (error) {
      logCriticalBattleError('vfx-projectile', error);
      detachProjectile(projectile);
    } finally {
      detachProjectile(projectile);
      this.playing = false;
      if (lockRegistry) registry.endCombatVfxAnimation();
    }

    return true;
  }

  async playImpactPipeline(
    damage: number,
    target: HTMLElement,
    scene: HTMLElement | null,
  ): Promise<void> {
    if (scene) scene.classList.add('combat-hit-stop');

    target.classList.add('vfx-impact-flash--white');
    await waitOneFrame();
    target.classList.remove('vfx-impact-flash--white');

    if (damage > 0) {
      showFloatingTextAtElement(damage, target);
    }

    await waitMs(IMPACT_HIT_STOP_MS);
    scene?.classList.remove('combat-hit-stop');
  }

  async playFromGatewayResult(
    data: CombatActionIntentResultData,
    options: {
      readonly root?: ParentNode;
      readonly sourcePortrait?: HTMLElement;
      readonly targetPortrait?: HTMLElement;
      readonly skipImpactEffects?: boolean;
      readonly skipRegistryLock?: boolean;
      readonly classId?: ClassType;
    } = {},
  ): Promise<boolean> {
    if (!isProjectileCombatAction(data.action)) return false;
    if (this.shouldSkipDuplicate(data)) return true;

    const scope = resolveScope(options.root);
    const source = options.sourcePortrait ?? resolvePortrait(scope, PLAYER_PORTRAIT_SELECTOR);
    const target = options.targetPortrait ?? resolvePortrait(scope, OPPONENT_PORTRAIT_SELECTOR);
    if (!source || !target) return false;

    const host = resolveBattleEffectsHost(source);
    const scene = resolveScene(scope);
    const from = portraitCenter(source, host);
    const to = portraitCenter(target, host);
    const effectType = resolveFeedbackEffectType(data.feedback, data.action);
    const doc = resolveDocument(scope ?? host);

    const played = await this.playAttackAnimation(from, to, effectType, exactOptionalProps({
      host,
      targetElement: target,
      scene,
      damage: data.damage,
      skipImpactEffects: options.skipImpactEffects,
      skipRegistryLock: options.skipRegistryLock,
      doc: doc ?? undefined,
      classId: options.classId,
    }));

    if (played) {
      this.lastSignature = this.buildSignature(data);
      this.suppressUntil = Date.now() + DEDUPE_WINDOW_MS;
    }

    return played;
  }

  abort(): void {
    this.playing = false;
    while (getPendingIntentRegistry().isCombatVfxAnimating()) {
      getPendingIntentRegistry().endCombatVfxAnimation();
    }
  }
}

let activeManager: VfxProjectileManager | null = null;

export function getVfxProjectileManager(): VfxProjectileManager {
  if (!activeManager) activeManager = new VfxProjectileManager();
  return activeManager;
}

export function resetVfxProjectileManager(): void {
  activeManager?.abort();
  activeManager = null;
}
