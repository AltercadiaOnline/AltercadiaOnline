import { createPortal } from 'react-dom';
import { useLayoutEffect, useState } from 'react';
import { DESIGN_CONFIG } from '../../../../config/designConstants.js';
import { BATTLE_STAGE_FRAME_ID, BATTLE_STAGE_SCALE_ID } from '../../../layout/gameLayout.js';
import { useBattleHudStore } from '../../battle/battleHudStore.js';
import {
  BATTLE_ARENA_GROUND_Y,
  resolveBattleFoeDrawHeight,
  resolveBattleFoeGroundDrop,
  resolveBattleFoeHomeXs,
} from '../../../ui/battle/battleArenaPose.js';

const VIEW_W = DESIGN_CONFIG.VIEWPORT.WIDTH;
const VIEW_H = DESIGN_CONFIG.VIEWPORT.HEIGHT;
const NAMEPLATE_HEIGHT = 36;

type StageOverlayRect = {
  readonly left: number;
  readonly top: number;
  readonly scale: number;
};

function readStageOverlayRect(): StageOverlayRect | null {
  if (typeof document === 'undefined') return null;
  const stage = document.getElementById(BATTLE_STAGE_SCALE_ID);
  if (!stage) return null;
  const box = stage.getBoundingClientRect();
  if (box.width < 8 || box.height < 8) return null;
  return {
    left: box.left,
    top: box.top,
    scale: box.width / VIEW_W,
  };
}

function overlayUnchanged(prev: StageOverlayRect | null, next: StageOverlayRect | null): boolean {
  if (!prev || !next) return prev === next;
  return (
    Math.abs(prev.left - next.left) < 0.4
    && Math.abs(prev.top - next.top) < 0.4
    && Math.abs(prev.scale - next.scale) < 0.002
  );
}

/**
 * HUD de HP acima de cada sprite — camada React (z HUD), alinhada ao buffer 640×360.
 * Portal no body evita clip da chrome; coords em pixels de design.
 */
export function BattleFoeNameplates() {
  const opponents = useBattleHudStore((state) => state.opponents);
  const opponent = useBattleHudStore((state) => state.opponent);
  const selectedFoeActorId = useBattleHudStore((state) => state.selectedFoeActorId) ?? null;
  const selectFoe = useBattleHudStore((state) => state.selectFoe);
  const foes = Array.isArray(opponents) && opponents.length > 0
    ? opponents
    : opponent
      ? [opponent]
      : [];
  const canSelectFoe = foes.length > 1 && typeof selectFoe === 'function';

  const [rect, setRect] = useState<StageOverlayRect | null>(readStageOverlayRect);

  useLayoutEffect(() => {
    if (foes.length === 0) return undefined;

    const sync = (): void => {
      const next = readStageOverlayRect();
      setRect((prev) => (overlayUnchanged(prev, next) ? prev : next));
    };

    sync();
    const stage = document.getElementById(BATTLE_STAGE_SCALE_ID);
    const frame = document.getElementById(BATTLE_STAGE_FRAME_ID);
    const combat = document.getElementById('scene-combat');
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    if (stage) observer?.observe(stage);
    if (frame) observer?.observe(frame);
    if (combat) observer?.observe(combat);
    const styleObserver = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(sync)
      : null;
    if (stage) styleObserver?.observe(stage, { attributes: true, attributeFilter: ['style', 'class'] });
    if (combat) styleObserver?.observe(combat, { attributes: true, attributeFilter: ['style', 'class'] });
    styleObserver?.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    window.addEventListener('resize', sync);
    document.addEventListener('fullscreenchange', sync);
    window.visualViewport?.addEventListener('resize', sync);
    const rafId = window.requestAnimationFrame(() => {
      sync();
      window.requestAnimationFrame(sync);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', sync);
      document.removeEventListener('fullscreenchange', sync);
      window.visualViewport?.removeEventListener('resize', sync);
      observer?.disconnect();
      styleObserver?.disconnect();
    };
  }, [foes.length]);

  if (foes.length === 0 || !rect) return null;

  const packSize = foes.length;
  const homes = resolveBattleFoeHomeXs(packSize);
  const drawH = resolveBattleFoeDrawHeight(packSize);
  const plateWidth = packSize >= 3 ? 96 : packSize === 2 ? 108 : 124;

  return createPortal(
    <div
      className="battle-foe-nameplates"
      role="group"
      aria-label="Vida dos oponentes"
      style={{
        left: rect.left,
        top: rect.top,
        width: VIEW_W,
        height: VIEW_H,
        transform: `scale(${rect.scale})`,
      }}
    >
      {foes.map((foe, index) => {
        const actorId = foe.actorId;
        const defeated = foe.hp <= 0;
        const selected = Boolean(actorId) && actorId === selectedFoeActorId && !defeated;
        const homeX = homes[index] ?? VIEW_W * 0.78;
        const drop = resolveBattleFoeGroundDrop(packSize, index);
        const spriteTop = BATTLE_ARENA_GROUND_Y + drop - drawH;
        const top = Math.max(6, spriteTop - NAMEPLATE_HEIGHT - 4);
        return (
          <button
            key={actorId ?? `foe-plate-${index}`}
            type="button"
            className={[
              'battle-foe-nameplate',
              defeated ? 'battle-foe-nameplate--down' : '',
              selected ? 'battle-foe-nameplate--selected' : '',
            ].filter(Boolean).join(' ')}
            style={{ left: homeX, top, width: plateWidth }}
            aria-label={defeated ? `${foe.name} derrotado` : foe.name}
            disabled={Boolean(canSelectFoe) && (defeated || !actorId)}
            onClick={() => {
              if (actorId && canSelectFoe && !defeated) selectFoe(actorId);
            }}
          >
            <span className="battle-foe-nameplate__name">{foe.name}</span>
            <span className="battle-foe-nameplate__bar" role="progressbar" aria-hidden="true">
              <span
                className="battle-foe-nameplate__fill"
                style={{ width: `${defeated ? 0 : foe.hpRatio}%` }}
              />
            </span>
            <span className="battle-foe-nameplate__hp">
              {defeated ? 'Derrotado' : `${Math.max(0, Math.ceil(foe.hp))} / ${foe.maxHp}`}
            </span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
