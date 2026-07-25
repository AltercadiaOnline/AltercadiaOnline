/**
 * Patches canônicos do `data.json` do export Construct 3 (project[]).
 *
 * Política Altercadia = WebGL-only + viewport fixo 640×360 + sampling barato.
 * Índices validados contra c3runtime (`_SetWebGPUEnabled(t[13])`, fullscreen t[12]).
 *
 * Por quê WebGL (não WebGPU):
 * - WebGPU em AMD/RDNA e vários drivers → canvas preto / hang / timeout de layout
 * - WebGL é o caminho estável para iframe 640×360 + OffscreenCanvas no worker
 */
export const CONSTRUCT_PROJECT_VIEWPORT_WIDTH_INDEX = 10;
export const CONSTRUCT_PROJECT_VIEWPORT_HEIGHT_INDEX = 11;
export const CONSTRUCT_PROJECT_FULLSCREEN_MODE_INDEX = 12;
export const CONSTRUCT_PROJECT_WEBGPU_ENABLED_INDEX = 13;
export const CONSTRUCT_PROJECT_SAMPLING_INDEX = 14;
export const CONSTRUCT_PROJECT_GPU_POWER_PREFERENCE_INDEX = 34;

/** Viewport oficial — espelha DESIGN_CONFIG.VIEWPORT. */
export const CONSTRUCT_VIEWPORT_WIDTH = 640;
export const CONSTRUCT_VIEWPORT_HEIGHT = 360;

/** Fullscreen off — CSS/bridge travam 640×360 (sem letterbox). */
export const CONSTRUCT_FULLSCREEN_MODE_OFF = 0;

/** Sempre false → WebGL. */
export const CONSTRUCT_WEBGPU_ENABLED = false;

/**
 * Nearest = pixel art + menos custo de filtro na GPU.
 * (bilinear/trilinear custam mais fill/bandwidth no tilemap).
 */
export const CONSTRUCT_SAMPLING_MODE = 'nearest';

/** Preferência de adaptador WebGL — prioriza GPU dedicada quando existir. */
export const CONSTRUCT_GPU_POWER_PREFERENCE = 'high-performance';

export const CONSTRUCT_RENDERER_POLICY = 'webgl-only';

/**
 * @typedef {{
 *   viewportWidth: unknown,
 *   viewportHeight: unknown,
 *   fullscreenMode: unknown,
 *   webgpuEnabled: unknown,
 *   sampling: unknown,
 *   gpuPowerPreference: unknown,
 * }} ConstructRendererSnapshot
 */

/**
 * @param {unknown} data
 * @returns {{
 *   changed: boolean,
 *   before: ConstructRendererSnapshot,
 *   after: {
 *     viewportWidth: number,
 *     viewportHeight: number,
 *     fullscreenMode: number,
 *     webgpuEnabled: false,
 *     sampling: string,
 *     gpuPowerPreference: string,
 *   },
 * }}
 */
export function patchConstructProjectRendererPolicy(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(/** @type {{ project?: unknown }} */ (data).project)) {
    throw new Error('data.json inválido — project[] ausente');
  }

  const project = /** @type {unknown[]} */ (/** @type {{ project: unknown[] }} */ (data).project);
  const before = readSnapshot(project);

  let changed = false;
  const set = (index, value) => {
    if (project[index] !== value) {
      project[index] = value;
      changed = true;
    }
  };

  set(CONSTRUCT_PROJECT_VIEWPORT_WIDTH_INDEX, CONSTRUCT_VIEWPORT_WIDTH);
  set(CONSTRUCT_PROJECT_VIEWPORT_HEIGHT_INDEX, CONSTRUCT_VIEWPORT_HEIGHT);
  set(CONSTRUCT_PROJECT_FULLSCREEN_MODE_INDEX, CONSTRUCT_FULLSCREEN_MODE_OFF);
  set(CONSTRUCT_PROJECT_WEBGPU_ENABLED_INDEX, CONSTRUCT_WEBGPU_ENABLED);
  set(CONSTRUCT_PROJECT_SAMPLING_INDEX, CONSTRUCT_SAMPLING_MODE);
  set(CONSTRUCT_PROJECT_GPU_POWER_PREFERENCE_INDEX, CONSTRUCT_GPU_POWER_PREFERENCE);

  return {
    changed,
    before,
    after: {
      viewportWidth: CONSTRUCT_VIEWPORT_WIDTH,
      viewportHeight: CONSTRUCT_VIEWPORT_HEIGHT,
      fullscreenMode: CONSTRUCT_FULLSCREEN_MODE_OFF,
      webgpuEnabled: CONSTRUCT_WEBGPU_ENABLED,
      sampling: CONSTRUCT_SAMPLING_MODE,
      gpuPowerPreference: CONSTRUCT_GPU_POWER_PREFERENCE,
    },
  };
}

/**
 * @param {unknown} data
 * @returns {{ ok: true } & ConstructRendererSnapshot | { ok: false, reason: string }}
 */
export function assertConstructRendererPolicy(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(/** @type {{ project?: unknown }} */ (data).project)) {
    return { ok: false, reason: 'project[] ausente' };
  }
  const project = /** @type {unknown[]} */ (/** @type {{ project: unknown[] }} */ (data).project);
  const snap = readSnapshot(project);

  if (snap.viewportWidth !== CONSTRUCT_VIEWPORT_WIDTH || snap.viewportHeight !== CONSTRUCT_VIEWPORT_HEIGHT) {
    return {
      ok: false,
      reason: `viewport=${String(snap.viewportWidth)}×${String(snap.viewportHeight)} (esperado ${CONSTRUCT_VIEWPORT_WIDTH}×${CONSTRUCT_VIEWPORT_HEIGHT})`,
    };
  }
  if (snap.fullscreenMode !== CONSTRUCT_FULLSCREEN_MODE_OFF) {
    return {
      ok: false,
      reason: `fullscreenMode=${String(snap.fullscreenMode)} (esperado ${CONSTRUCT_FULLSCREEN_MODE_OFF})`,
    };
  }
  if (snap.webgpuEnabled !== CONSTRUCT_WEBGPU_ENABLED) {
    return {
      ok: false,
      reason: `enableWebGPU=${String(snap.webgpuEnabled)} (esperado ${CONSTRUCT_WEBGPU_ENABLED} → WebGL)`,
    };
  }
  if (snap.sampling !== CONSTRUCT_SAMPLING_MODE) {
    return {
      ok: false,
      reason: `sampling=${String(snap.sampling)} (esperado ${CONSTRUCT_SAMPLING_MODE})`,
    };
  }
  if (snap.gpuPowerPreference !== CONSTRUCT_GPU_POWER_PREFERENCE) {
    return {
      ok: false,
      reason: `gpuPowerPreference=${String(snap.gpuPowerPreference)} (esperado ${CONSTRUCT_GPU_POWER_PREFERENCE})`,
    };
  }
  return { ok: true, ...snap };
}

/**
 * @param {unknown[]} project
 * @returns {ConstructRendererSnapshot}
 */
function readSnapshot(project) {
  return {
    viewportWidth: project[CONSTRUCT_PROJECT_VIEWPORT_WIDTH_INDEX],
    viewportHeight: project[CONSTRUCT_PROJECT_VIEWPORT_HEIGHT_INDEX],
    fullscreenMode: project[CONSTRUCT_PROJECT_FULLSCREEN_MODE_INDEX],
    webgpuEnabled: project[CONSTRUCT_PROJECT_WEBGPU_ENABLED_INDEX],
    sampling: project[CONSTRUCT_PROJECT_SAMPLING_INDEX],
    gpuPowerPreference: project[CONSTRUCT_PROJECT_GPU_POWER_PREFERENCE_INDEX],
  };
}
