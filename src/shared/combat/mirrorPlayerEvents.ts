/** Eventos espelhados no cliente para testes de automação do Player Espelho. */
export const MirrorPlayerEventType = {
  BATTLE_STARTED: 'BATTLE_STARTED',
  MOVE_USED: 'MOVE_USED',
} as const;

export type MirrorPlayerEventType =
  (typeof MirrorPlayerEventType)[keyof typeof MirrorPlayerEventType];

export type MirrorBattleStartedPayload = {
  readonly battleId: string;
  readonly mirrorActorId: string;
  readonly mirrorName: string;
  readonly classId: string;
};

export type MirrorMoveUsedPayload = {
  readonly battleId: string;
  readonly mirrorActorId: string;
  readonly skillId: string;
  readonly turn: number;
};

export type MirrorPlayerEvent =
  | { readonly type: typeof MirrorPlayerEventType.BATTLE_STARTED; readonly payload: MirrorBattleStartedPayload }
  | { readonly type: typeof MirrorPlayerEventType.MOVE_USED; readonly payload: MirrorMoveUsedPayload };

type MirrorListener = (event: MirrorPlayerEvent) => void;

const listeners = new Set<MirrorListener>();

export function subscribeMirrorPlayerEvents(listener: MirrorListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitMirrorPlayerEvent(event: MirrorPlayerEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}
