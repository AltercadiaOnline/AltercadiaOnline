import type { CombatUiHints } from '../../shared/combatWire.js';
import type { CombatEvent, SkillCatalogEvent, TurnUpdate } from '../../shared/events.js';
import { CombatEventType } from '../../shared/events.js';
import type { CombatState, Skill } from '../../shared/types.js';

type HudElements = {
  readonly root?: HTMLElement | null;
  readonly turnLabel?: HTMLElement | null;
  readonly log?: HTMLElement | null;
  readonly actions?: HTMLElement | null;
};

export type HUDManagerOptions = {
  readonly elements?: HudElements;
  /** Clique em habilidade na paleta (enviar ActionRequest ao gateway). */
  readonly onSkillClick?: (skillId: string, actorId: string) => void;
};

/**
 * C35 — interface de HUD tipada.
 * Escuta eventos do contrato shared e mantém a UI em sincronia com o servidor.
 */
export class HUDManager {
  private readonly els: HudElements;
  private readonly onSkillClick: ((skillId: string, actorId: string) => void) | undefined;
  private readonly skillCache = new Map<string, readonly { id: string; name: string }[]>();
  private lastTurn: TurnUpdate | null = null;
  private lastUi: CombatUiHints | null = null;

  constructor(options: HUDManagerOptions = {}) {
    this.els = options.elements ?? {};
    this.onSkillClick = options.onSkillClick;
  }

  public consume(event: CombatEvent): void {
    switch (event.type) {
      case CombatEventType.BATTLE_START:
        this.appendLog(`Battle started: ${event.payload.battleId}`);
        break;
      case CombatEventType.TURN_START:
      case CombatEventType.BATTLE_STATE_UPDATE:
        this.onTurnUpdate(event.payload);
        break;
      case CombatEventType.DAMAGE_DEALT:
        this.updateHealthBar(event.payload.targetId, event.payload.hpAfter);
        this.appendLog(
          `${event.payload.sourceId} -> ${event.payload.targetId} (${event.payload.amount})`,
        );
        break;
      case CombatEventType.COMBAT_LOG:
        this.appendLog(event.line);
        break;
      case CombatEventType.ACTION_ACCEPTED:
        this.appendLog(`Action accepted: ${event.payload.requestId}`);
        break;
      case CombatEventType.ACTION_REJECTED:
        this.appendLog(`Action rejected: ${event.payload.reason}`);
        break;
      case CombatEventType.SKILL_CATALOG:
        this.onSkillCatalog(event);
        break;
      default:
        break;
    }
  }

  public updateHealthBar(combatantId: string, hp: number, maxHp?: number): void {
    if (!this.els.root) return;
    const bar = this.els.root.querySelector<HTMLElement>(`[data-hp-for="${combatantId}"]`);
    if (!bar) return;
    const max = Math.max(1, maxHp ?? 100);
    const ratio = Math.min(100, Math.max(0, (hp / max) * 100));
    bar.style.width = `${ratio}%`;
  }

  /** Sincroniza barras de HP a partir do snapshot autoritativo do servidor. */
  public syncCombatantsFromState(combatants: TurnUpdate['combatants']): void {
    for (const [id, c] of Object.entries(combatants)) {
      const hp = c.hpCurrent ?? c.hp;
      const maxHp = c.hpMax ?? c.maxHp;
      this.updateHealthBar(id, hp, maxHp);
    }
  }

  private onTurnUpdate(payload: TurnUpdate): void {
    this.lastTurn = payload;
    const { turn, phase, activeActorId } = payload;
    if (this.els.turnLabel) {
      this.els.turnLabel.textContent = `Turn ${turn} · ${phase}${activeActorId ? ` · ${activeActorId}` : ''}`;
    }
    if (this.lastUi) {
      this.syncSkillPalette(payload, this.lastUi);
    }
  }

  private onSkillCatalog(event: SkillCatalogEvent): void {
    const list = event.payload.skills.map((s) => ({ id: s.id, name: s.name }));
    this.skillCache.set(event.payload.actorId, list);
    this.appendLog(`Skills synced for ${event.payload.actorId}: ${list.length}`);
    if (this.lastTurn?.activeActorId === event.payload.actorId && this.lastUi) {
      this.renderSkillButtons(event.payload.actorId, event.payload.skills, this.lastUi.actionsEnabled);
    }
  }

  /** Resolve skills do ator ativo: snapshot autoritativo primeiro, cache SKILL_CATALOG como fallback. */
  public resolveSkillsForActor(payload: TurnUpdate): readonly Skill[] {
    const actorId = payload.activeActorId;
    if (!actorId) return [];
    const fromState = payload.combatants[actorId]?.skills ?? [];
    if (fromState.length > 0) return [...fromState];

    const cached = this.skillCache.get(actorId);
    if (!cached?.length) return [];
    return cached.map((c) => ({ id: c.id, name: c.name, damage: 0, cooldown: 0 }));
  }

  /**
   * Camada defensiva (Proxy UI): repinta paleta a partir do snapshot do servidor.
   * Usar em renderState após consumeCombatEvents — cobre SKILL_CATALOG perdido no wire.
   */
  public syncSkillPaletteFromCombatState(state: CombatState, ui: CombatUiHints): void {
    this.lastUi = ui;

    const phase: TurnUpdate['phase'] =
      state.phase === 'RESOLVING' || state.phase === 'ENDED' ? state.phase : 'CHOOSING';

    const turnUpdate: TurnUpdate = {
      battleId: state.battleId,
      turn: state.turn,
      phase,
      activeActorId: state.activeActorId,
      combatants: state.combatants,
    };
    this.lastTurn = turnUpdate;
    this.syncSkillPalette(turnUpdate, ui);
  }

  private syncSkillPalette(payload: TurnUpdate, ui: CombatUiHints): void {
    const enabled = ui.actionsEnabled;
    if (this.els.actions) {
      this.els.actions.toggleAttribute('aria-disabled', !enabled);
      this.els.actions.classList.toggle('is-disabled', !enabled);
    }
    if (!payload.activeActorId) {
      this.renderSkillButtons(null, [], false);
      return;
    }
    const skills = this.resolveSkillsForActor(payload);
    this.renderSkillButtons(payload.activeActorId, skills, enabled);
  }

  private renderSkillButtons(
    actorId: string | null,
    skills: readonly Skill[],
    enabled: boolean,
  ): void {
    const container = this.els.actions;
    if (!container) return;

    container.innerHTML = '';
    if (!actorId || skills.length === 0) {
      container.setAttribute('data-empty', 'true');
      return;
    }
    container.removeAttribute('data-empty');

    for (const skill of skills) {
      const btn = container.ownerDocument.createElement('button');
      btn.type = 'button';
      btn.className = 'hud-skill-btn';
      btn.dataset.skillId = skill.id;
      btn.dataset.actorId = actorId;
      btn.textContent = skill.name;
      btn.disabled = !enabled;
      if (enabled) {
        btn.addEventListener('click', () => {
          this.onSkillClick?.(skill.id, actorId);
        });
      }
      container.appendChild(btn);
    }
  }

  public getLastTurn(): TurnUpdate | null {
    return this.lastTurn;
  }

  public getSkillCache(actorId: string): readonly { id: string; name: string }[] {
    return this.skillCache.get(actorId) ?? [];
  }

  public clearSkillCache(): void {
    this.skillCache.clear();
    this.lastTurn = null;
    this.lastUi = null;
  }

  private appendLog(line: string): void {
    if (!this.els.log) return;
    const row = this.els.log.ownerDocument.createElement('div');
    row.textContent = line;
    this.els.log.appendChild(row);
  }
}
