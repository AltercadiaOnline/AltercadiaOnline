import type { MapId } from '../../../shared/world/mapRegistry.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { GAME_RENDER_HOST_ID } from '../PhaserConfig.js';

const FATAL_OVERLAY_ID = 'altercadia-map-load-fatal';

export class TiledMapLoadError extends Error {
  readonly mapId: MapId;

  readonly issues: readonly string[];

  constructor(mapId: MapId, issues: readonly string[]) {
    const summary = formatTiledMapLoadMessage(mapId, issues);
    super(summary);
    this.name = 'TiledMapLoadError';
    this.mapId = mapId;
    this.issues = issues;
  }
}

type MapLoadFatalHandler = (error: TiledMapLoadError) => void;

let fatalHandler: MapLoadFatalHandler | null = null;

export function registerMapLoadFatalHandler(handler: MapLoadFatalHandler): () => void {
  fatalHandler = handler;
  return () => {
    if (fatalHandler === handler) {
      fatalHandler = null;
    }
  };
}

export function formatTiledMapLoadMessage(mapId: MapId, issues: readonly string[]): string {
  const header = `[Mapa Tiled] Falha ao montar "${mapId}" no Phaser — corrija no Tiled e exporte novamente.`;
  if (issues.length === 0) {
    return header;
  }
  return `${header}\n\n${issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n')}`;
}

function mountFatalOverlay(mapId: MapId, issues: readonly string[]): void {
  if (typeof document === 'undefined') return;

  const host = document.getElementById(GAME_RENDER_HOST_ID);
  if (!host) return;

  let overlay = document.getElementById(FATAL_OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = FATAL_OVERLAY_ID;
    overlay.setAttribute('role', 'alert');
    overlay.style.cssText = [
      'position:absolute',
      'inset:0',
      'z-index:9999',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'padding:24px',
      'background:rgba(5,6,10,0.96)',
      'color:#fecaca',
      'font:14px/1.5 monospace',
      'text-align:left',
      'overflow:auto',
    ].join(';');
    host.appendChild(overlay);
  }

  const listItems = issues.length > 0
    ? `<ul style="margin:12px 0 0;padding-left:20px;color:#fca5a5">${issues
      .map((issue) => `<li style="margin:6px 0">${escapeHtml(issue)}</li>`)
      .join('')}</ul>`
    : '';

  overlay.innerHTML = `
    <div style="max-width:560px;width:100%">
      <strong style="color:#f87171;font-size:16px">Erro ao carregar mapa (Phaser)</strong>
      <p style="margin:8px 0 0;color:#e2e8f0">Mapa: <code>${escapeHtml(mapId)}</code></p>
      <p style="margin:8px 0 0;color:#cbd5e1">O jogo foi interrompido. Corrija no Tiled e recarregue a página (Ctrl+Shift+R).</p>
      ${listItems}
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Modo estrito — interrompe exploração e exibe diagnóstico Tiled. */
export function failTiledMapLoad(mapId: MapId, issues: readonly string[]): never {
  const error = new TiledMapLoadError(mapId, issues);
  const message = error.message;

  console.error('[MapLoader]', message);
  alertSystem(message.split('\n')[0] ?? message);
  mountFatalOverlay(mapId, issues);
  fatalHandler?.(error);

  throw error;
}
