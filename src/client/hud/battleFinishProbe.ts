export type BattleFinishTraceEntry = {
  readonly t: number;
  readonly step: string;
  readonly detail?: unknown;
};

const traceLog: BattleFinishTraceEntry[] = [];
const MAX_TRACE = 64;

let debugPanelEl: HTMLElement | null = null;

export function traceBattleFinish(step: string, detail?: unknown): void {
  const entry: BattleFinishTraceEntry = { t: Date.now(), step, detail };
  traceLog.push(entry);
  if (traceLog.length > MAX_TRACE) traceLog.shift();
  console.info(`[BattleFinish] ${step}`, detail ?? '');
}

export function getBattleFinishTrace(): readonly BattleFinishTraceEntry[] {
  return traceLog;
}

export function dumpBattleFinishTrace(): string {
  return traceLog
    .map((e) => `${new Date(e.t).toISOString()} ${e.step} ${e.detail ? JSON.stringify(e.detail) : ''}`)
    .join('\n');
}

/** Painel visível na tela quando o hub falha — copia trace para debug. */
export function showBattleFinishDebugPanel(message: string, extra?: unknown): void {
  if (typeof document === 'undefined') return;

  traceBattleFinish('debug.panel', { message, extra });

  debugPanelEl?.remove();
  const panel = document.createElement('div');
  panel.className = 'battle-finish-debug-panel';
  panel.setAttribute('role', 'alert');
  panel.style.cssText =
    'position:fixed;bottom:12px;right:12px;z-index:99999;max-width:min(420px,92vw);'
    + 'padding:10px 12px;background:rgba(8,12,16,0.96);border:1px solid #c44;color:#fdd;'
    + 'font:12px/1.4 monospace;pointer-events:auto;';

  const title = document.createElement('p');
  title.style.margin = '0 0 6px';
  title.style.fontWeight = '700';
  title.textContent = 'Diagnóstico pós-batalha';

  const body = document.createElement('pre');
  body.style.margin = '0 0 8px';
  body.style.whiteSpace = 'pre-wrap';
  body.style.maxHeight = '140px';
  body.style.overflow = 'auto';
  body.textContent = `${message}\n\n${dumpBattleFinishTrace()}`;

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copiar trace';
  copyBtn.style.marginRight = '6px';
  copyBtn.onclick = () => {
    void navigator.clipboard?.writeText(dumpBattleFinishTrace());
  };

  const mirrorBtn = document.createElement('button');
  mirrorBtn.type = 'button';
  mirrorBtn.textContent = 'Spawn Espelho';
  mirrorBtn.style.marginRight = '6px';
  mirrorBtn.onclick = () => {
    if (typeof window.spawnMirrorPlayer === 'function') {
      window.spawnMirrorPlayer();
    } else {
      console.warn('[BattleFinish] spawnMirrorPlayer não disponível.');
    }
  };

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Fechar';
  closeBtn.onclick = () => panel.remove();

  panel.append(title, body, copyBtn, mirrorBtn, closeBtn);
  document.body.appendChild(panel);
  debugPanelEl = panel;
}

export function installBattleFinishDebugGlobal(): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & {
    __altercadiaBattleFinish?: {
      trace: typeof traceBattleFinish;
      dump: typeof dumpBattleFinishTrace;
      getTrace: typeof getBattleFinishTrace;
      probeDom: () => Record<string, unknown>;
    };
  };

  w.__altercadiaBattleFinish = {
    trace: traceBattleFinish,
    dump: dumpBattleFinishTrace,
    getTrace: getBattleFinishTrace,
    probeDom: () => ({
      hubExit: Boolean(document.querySelector('.post-battle-hub__exit')),
      hubRoot: Boolean(document.querySelector('.post-battle-hub')),
      emergencyExit: Boolean(document.querySelector('.battle-emergency-exit')),
      resultOverlay: Boolean(document.querySelector('.battle-result-overlay')),
      sceneCombatHidden: document.querySelector('#scene-combat')?.classList.contains('hidden') ?? null,
      gameContainerDisplay: document.querySelector<HTMLElement>('#game-container')?.style.display ?? null,
    }),
  };
}
