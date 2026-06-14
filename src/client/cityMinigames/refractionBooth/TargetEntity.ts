/** Estado de um alvo móvel no simulador. */
export type TargetEntityState = 'alive' | 'hit' | 'escaped';

export type ArenaBounds = {
  readonly width: number;
  readonly height: number;
};

export type TargetRenderContext = {
  readonly ctx: CanvasRenderingContext2D;
  readonly bounds: ArenaBounds;
  readonly nowMs: number;
};

/** Contrato modular — substituível por outros tipos de alvo (alien, drone, etc.). */
export interface TargetEntity {
  readonly id: number;
  readonly kind: string;
  readonly state: TargetEntityState;
  update(deltaMs: number, nowMs: number): void;
  /** Posição normalizada (0–1) no centro do sprite. */
  getPosition(): { readonly x: number; readonly y: number };
  hitTest(normX: number, normY: number): boolean;
  applyHit(nowMs: number): void;
  render(context: TargetRenderContext): void;
  /** Remove da simulação após animação de queda ou saída de tela. */
  isFinished(): boolean;
}

export type TargetFactory = (id: number) => TargetEntity;
