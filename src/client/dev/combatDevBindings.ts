import type { ActionRequest } from '../../shared/events.js';
import { configureMirrorPlayerClient } from '../combat/MirrorPlayerController.js';
import { configureSpawnMirrorPlayer } from './spawnMirrorPlayer.js';

type CombatDevSend = (type: string, payload?: unknown) => void;

let resolveSend: (() => CombatDevSend | null) | null = null;

/** Registra acesso lazy ao socket de combate (ex.: `() => socket` em main.ts). */
export function registerCombatDevTransportResolver(
  resolver: () => CombatDevSend | null,
): void {
  resolveSend = resolver;
  refreshCombatDevBindings();
}

/** Reaplica handlers — chamar após connect/reconnect, START_COMBAT ou logout. */
export function refreshCombatDevBindings(): void {
  const send = resolveSend?.() ?? null;

  configureSpawnMirrorPlayer(
    send
      ? () => {
          send('dev-spawn-mirror-player', {});
        }
      : null,
  );

  configureMirrorPlayerClient(
    send
      ? (action: ActionRequest) => {
          send('mirror-combat-action', action);
        }
      : null,
  );
}
