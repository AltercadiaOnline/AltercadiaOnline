import { useEffect, type RefObject } from 'react';
import {
  BATTLE_STAGE_FRAME_ID,
  BATTLE_STAGE_SCALE_ID,
  GAME_STAGE_FRAME_ID,
  GAME_STAGE_SCALE_ID,
  GAME_VIEWPORT_ID,
} from '../../layout/gameLayout.js';

function resolveStageHosts(): {
  readonly visibleHost: HTMLElement | null;
  readonly stage: HTMLElement | null;
} {
  const battleActive = document.body.classList.contains('battle-arena-active');
  if (battleActive) {
    return {
      visibleHost: document.getElementById(BATTLE_STAGE_FRAME_ID),
      stage: document.getElementById(BATTLE_STAGE_SCALE_ID),
    };
  }

  return {
    visibleHost:
      document.getElementById(GAME_STAGE_FRAME_ID)
      ?? document.getElementById(GAME_VIEWPORT_ID),
    stage: document.getElementById(GAME_STAGE_SCALE_ID),
  };
}

/**
 * Alinha a HUD à área *visível* do playfield.
 * Mundo: letterbox do stage Construct.
 * Batalha: coluna inteira (#game-react-hud-root já exclui a sidebar) —
 * a arena 640×360 fica no letterbox DOM; a chrome da HUD usa o visor útil.
 */
export function useAlignHudFrameToGameStage(
  frameRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const resolveShell = (): HTMLElement | null => {
      if (frame.offsetParent instanceof HTMLElement) return frame.offsetParent;
      return frame.parentElement;
    };

    const fillShell = (): void => {
      frame.style.position = 'absolute';
      frame.style.inset = '0';
      frame.style.width = 'auto';
      frame.style.height = 'auto';
      frame.style.left = '0';
      frame.style.top = '0';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.margin = '0';
      frame.style.transform = 'none';
    };

    const sync = (): void => {
      const shell = resolveShell();
      if (!shell) return;

      // Batalha: preenche o playfield (viewport − sidebar), não o letterbox 640×360.
      if (document.body.classList.contains('battle-arena-active')) {
        fillShell();
        return;
      }

      const { visibleHost, stage } = resolveStageHosts();

      if (!visibleHost) {
        fillShell();
        return;
      }

      const hostRect = visibleHost.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      if (hostRect.width <= 1 || hostRect.height <= 1 || shellRect.width <= 1) {
        fillShell();
        return;
      }

      let left = hostRect.left;
      let top = hostRect.top;
      let right = hostRect.right;
      let bottom = hostRect.bottom;

      if (stage) {
        const stageRect = stage.getBoundingClientRect();
        if (stageRect.width > 1 && stageRect.height > 1) {
          left = Math.max(hostRect.left, stageRect.left);
          top = Math.max(hostRect.top, stageRect.top);
          right = Math.min(hostRect.right, stageRect.right);
          bottom = Math.min(hostRect.bottom, stageRect.bottom);
        }
      }

      const width = Math.max(0, right - left);
      const height = Math.max(0, bottom - top);
      if (width <= 1 || height <= 1) {
        fillShell();
        return;
      }

      frame.style.position = 'absolute';
      frame.style.inset = 'auto';
      frame.style.width = `${width}px`;
      frame.style.height = `${height}px`;
      frame.style.left = `${left - shellRect.left}px`;
      frame.style.top = `${top - shellRect.top}px`;
      frame.style.right = 'auto';
      frame.style.bottom = 'auto';
      frame.style.margin = '0';
      frame.style.transform = 'none';
      frame.style.transformOrigin = 'top left';
      frame.style.overflow = 'visible';
    };

    sync();

    const { visibleHost, stage } = resolveStageHosts();
    const shell = resolveShell();
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => sync())
      : null;

    if (observer && visibleHost) observer.observe(visibleHost);
    if (observer && stage) observer.observe(stage);
    if (observer && shell) observer.observe(shell);

    const combat = document.getElementById('scene-combat');
    if (observer && combat) observer.observe(combat);

    window.addEventListener('resize', sync);
    document.addEventListener('fullscreenchange', sync);
    window.visualViewport?.addEventListener('resize', sync);

    const bodyObserver = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => sync())
      : null;
    bodyObserver?.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

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
      bodyObserver?.disconnect();
    };
  }, [frameRef]);
}
