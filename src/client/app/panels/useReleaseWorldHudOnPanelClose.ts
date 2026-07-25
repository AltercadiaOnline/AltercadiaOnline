import { useEffect, useRef } from 'react';
import type { UiWindowId } from '../../ui/uiEvents.js';
import { isWorldPanelOpen } from '../store/worldPanelsStore.js';
import { releaseWorldHudInteractionIfIdle } from '../../world/worldHudInteractionSession.js';

/**
 * Libera a trava de exploração ao desmontar o painel de verdade.
 * Ignora remount do React Strict Mode (painel ainda consta como aberto no store).
 * Usa microtask para ler o store depois do closePanel síncrono.
 */
export function useReleaseWorldHudOnPanelClose(
  windowId: UiWindowId,
  shouldRelease?: () => boolean,
): void {
  const shouldReleaseRef = useRef(shouldRelease);
  shouldReleaseRef.current = shouldRelease;

  useEffect(() => {
    return () => {
      queueMicrotask(() => {
        if (isWorldPanelOpen(windowId)) return;
        if (shouldReleaseRef.current && !shouldReleaseRef.current()) return;
        releaseWorldHudInteractionIfIdle({ defer: false });
      });
    };
  }, [windowId]);
}
