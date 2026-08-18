/**
 * Preset visual para PC fraco — só cliente.
 * Não muda viewport 640×360, Construct, combate nem servidor.
 *
 * `auto` (padrão): GPU software / pouca RAM / poucos núcleos → Leve.
 * Se ainda assim o login/mundo ficar abaixo de ~30 fps, trava em Leve.
 */

export type PerformanceChoice = 'auto' | 'lite' | 'full';
export type PerformanceMode = 'lite' | 'full';

export const PERFORMANCE_PRESET_STORAGE_KEY = 'altercadia.performancePreset';

/** ~30 fps no modo Leve — pixel art aguenta; software GL não. */
export const LITE_MIN_FRAME_INTERVAL_MS = 33;

const GAME_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Rajdhani:wght@500;600;700&family=Roboto+Mono:wght@400;500;600&display=swap';

let gameFontsInjected = false;

const FPS_SAMPLE_FRAMES = 48;
const FPS_SLOW_FRAME_MS = 33;
const FPS_SLOW_RATIO = 0.45;

export type PerformanceHardwareHints = {
  readonly deviceMemory?: number;
  readonly hardwareConcurrency?: number;
  readonly renderer?: string;
  readonly userAgent?: string;
};

const SOFTWARE_GL_RE =
  /swiftshader|llvmpipe|microsoft basic render|softpipe|software rasterizer|mesa offscreen|google swiftshader/;

const listeners = new Set<() => void>();

let sessionChoice: PerformanceChoice | null = null;
let resolvedMode: PerformanceMode | null = null;
let installed = false;
let fpsRafId = 0;
let cachedRenderer: string | undefined;

export function detectLiteHardware(hints: PerformanceHardwareHints): boolean {
  if (typeof hints.deviceMemory === 'number' && hints.deviceMemory > 0 && hints.deviceMemory <= 4) {
    return true;
  }
  if (
    typeof hints.hardwareConcurrency === 'number'
    && hints.hardwareConcurrency > 0
    && hints.hardwareConcurrency <= 2
  ) {
    return true;
  }
  const blob = `${hints.renderer ?? ''} ${hints.userAgent ?? ''}`.toLowerCase();
  return SOFTWARE_GL_RE.test(blob);
}

export function resolvePerformanceMode(
  choice: PerformanceChoice,
  hints: PerformanceHardwareHints,
): PerformanceMode {
  if (choice === 'lite') return 'lite';
  if (choice === 'full') return 'full';
  return detectLiteHardware(hints) ? 'lite' : 'full';
}

function isPerformanceChoice(value: string | null): value is PerformanceChoice {
  return value === 'auto' || value === 'lite' || value === 'full';
}

function readQueryChoice(): PerformanceChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = new URLSearchParams(window.location.search).get('perf');
    return isPerformanceChoice(raw) ? raw : null;
  } catch {
    return null;
  }
}

function readStoredChoice(): PerformanceChoice {
  if (typeof window === 'undefined') return 'auto';
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_PRESET_STORAGE_KEY);
    return isPerformanceChoice(raw) ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

function writeStoredChoice(choice: PerformanceChoice): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PERFORMANCE_PRESET_STORAGE_KEY, choice);
  } catch {
    /* ignore quota / private mode */
  }
}

function readNavigatorHints(): PerformanceHardwareHints {
  if (typeof navigator === 'undefined') return {};
  const nav = navigator as Navigator & { deviceMemory?: number };
  const renderer = readWebGLRenderer();
  return {
    ...(typeof nav.deviceMemory === 'number' ? { deviceMemory: nav.deviceMemory } : {}),
    hardwareConcurrency: nav.hardwareConcurrency,
    ...(renderer ? { renderer } : {}),
    userAgent: nav.userAgent,
  };
}

function readWebGLRenderer(): string | undefined {
  if (cachedRenderer !== undefined) return cachedRenderer || undefined;
  if (typeof document === 'undefined') return undefined;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    if (!gl || typeof WebGLRenderingContext === 'undefined' || !(gl instanceof WebGLRenderingContext)) {
      cachedRenderer = '';
      return undefined;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const raw = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '')
      : String(gl.getParameter(gl.RENDERER) ?? '');
    cachedRenderer = raw;
    return raw || undefined;
  } catch {
    cachedRenderer = '';
    return undefined;
  }
}

function applyDocumentClass(mode: PerformanceMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.perf = mode;
  root.classList.toggle('is-perf-lite', mode === 'lite');
}

function emit(): void {
  for (const listener of listeners) listener();
}

function commitMode(mode: PerformanceMode): void {
  if (resolvedMode === mode) {
    applyDocumentClass(mode);
    return;
  }
  resolvedMode = mode;
  applyDocumentClass(mode);
  emit();
}

function stopFpsWatcher(): void {
  if (fpsRafId) {
    cancelAnimationFrame(fpsRafId);
    fpsRafId = 0;
  }
}

function startFpsWatcher(): void {
  if (typeof requestAnimationFrame === 'undefined') return;
  stopFpsWatcher();
  let frames = 0;
  let slow = 0;
  let last = 0;
  const tick = (now: number): void => {
    if (sessionChoice !== 'auto' || resolvedMode === 'lite') {
      fpsRafId = 0;
      return;
    }
    if (last > 0) {
      const dt = now - last;
      frames += 1;
      if (dt > FPS_SLOW_FRAME_MS) slow += 1;
      if (frames >= FPS_SAMPLE_FRAMES) {
        fpsRafId = 0;
        if (slow / frames >= FPS_SLOW_RATIO) {
          setPerformanceChoice('lite');
        }
        return;
      }
    }
    last = now;
    fpsRafId = requestAnimationFrame(tick);
  };
  fpsRafId = requestAnimationFrame(tick);
}

/** Escolha persistida / desta sessão (`auto` até o jogador travar Leve ou Normal). */
export function getPerformanceChoice(): PerformanceChoice {
  return sessionChoice ?? readQueryChoice() ?? readStoredChoice();
}

/** Modo visual efetivo. */
export function getPerformanceMode(): PerformanceMode {
  if (resolvedMode) return resolvedMode;
  return resolvePerformanceMode(getPerformanceChoice(), readNavigatorHints());
}

export function isLitePerformance(): boolean {
  return getPerformanceMode() === 'lite';
}

/** 0 = todo rAF; 33 = teto ~30 fps no Leve. */
export function getLiteMinFrameIntervalMs(): number {
  return isLitePerformance() ? LITE_MIN_FRAME_INTERVAL_MS : 0;
}

export function shouldSkipRenderFrame(
  lastTimestampMs: number,
  nowMs: number,
  minFrameMs: number = getLiteMinFrameIntervalMs(),
): boolean {
  if (minFrameMs <= 0 || lastTimestampMs <= 0) return false;
  return nowMs - lastTimestampMs < minFrameMs;
}

function injectGameFontsIfNeeded(): void {
  if (gameFontsInjected || typeof document === 'undefined') return;
  if (getPerformanceMode() === 'lite') return;
  const head = document.head;
  if (!head || typeof document.createElement !== 'function') return;
  try {
    if (document.querySelector?.(`link[href="${GAME_FONTS_HREF}"]`)) {
      gameFontsInjected = true;
      return;
    }
    gameFontsInjected = true;
    const pre1 = document.createElement('link');
    pre1.rel = 'preconnect';
    pre1.href = 'https://fonts.googleapis.com';
    head.appendChild(pre1);
    const pre2 = document.createElement('link');
    pre2.rel = 'preconnect';
    pre2.href = 'https://fonts.gstatic.com';
    pre2.crossOrigin = 'anonymous';
    head.appendChild(pre2);
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = GAME_FONTS_HREF;
    head.appendChild(fonts);
  } catch {
    gameFontsInjected = false;
  }
}

export function subscribePerformanceMode(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Clique do jogador — trava Leve ou Normal e grava no navegador. */
export function setPerformanceChoice(choice: PerformanceChoice): void {
  sessionChoice = choice;
  if (choice !== 'auto') {
    writeStoredChoice(choice);
    stopFpsWatcher();
  } else {
    writeStoredChoice('auto');
  }
  commitMode(resolvePerformanceMode(choice, readNavigatorHints()));
  injectGameFontsIfNeeded();
  if (choice === 'auto' && resolvedMode === 'full') {
    startFpsWatcher();
  }
}

/** Boot: aplica classe no `<html>` antes do React e observa FPS se ainda for auto. */
export function installPerformancePreset(): void {
  sessionChoice = readQueryChoice() ?? readStoredChoice();
  commitMode(resolvePerformanceMode(sessionChoice, readNavigatorHints()));
  injectGameFontsIfNeeded();
  if (installed) return;
  installed = true;
  if (sessionChoice === 'auto' && resolvedMode === 'full') {
    startFpsWatcher();
  }
}

/** Só testes. */
export function resetPerformancePresetForTests(): void {
  stopFpsWatcher();
  sessionChoice = null;
  resolvedMode = null;
  installed = false;
  cachedRenderer = undefined;
  gameFontsInjected = false;
  listeners.clear();
  if (typeof document !== 'undefined') {
    delete document.documentElement.dataset.perf;
    document.documentElement.classList.remove('is-perf-lite');
  }
}
