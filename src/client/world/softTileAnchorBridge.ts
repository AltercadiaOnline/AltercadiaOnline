type SoftTileAnchor = { readonly x: number; readonly y: number };

type SoftTileAnchorConsumer = (anchor: SoftTileAnchor) => void;

let consumer: SoftTileAnchorConsumer | null = null;

/** Registra quem calibra o cursor de tile (AuthoritativeWorldSocket). */
export function setSoftTileAnchorConsumer(next: SoftTileAnchorConsumer | null): void {
  consumer = next;
}

/** Âncora suave pós-hold — só cursor de intent, não sprite. */
export function emitSoftTileAnchor(anchor: SoftTileAnchor): void {
  consumer?.(anchor);
}
