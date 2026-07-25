#!/usr/bin/env node
/**
 * Pós-processa public/construct-world após export HTML5:
 * - Injeta bridge DOM + worker (Construct roda em Web Worker — sem window)
 * - Garante import worker em c3main.js + script DOM em index.html
 * - Força política de render WebGL-only (desliga WebGPU + letterbox)
 * - Valida layouts (cidade_01 + zonabeco1 | beco_dos_fundos_zona1)
 */
import {
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  CONSTRUCT_RENDERER_POLICY,
  assertConstructRendererPolicy,
  patchConstructProjectRendererPolicy,
} from './lib/constructProjectPatch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetDir = path.join(root, 'public', 'construct-world');
const sourceExportDataJson = path.join(root, 'construct', 'altercadia-world', 'data.json');
const scriptsDir = path.join(targetDir, 'scripts');
const bridgeDir = path.join(root, 'construct', 'bridge');
const bridgeWorkerSrc = path.join(bridgeDir, 'altercadia-bridge-worker.js');
const bridgeDomSrc = path.join(bridgeDir, 'altercadia-bridge-dom.js');
const bridgeWorkerDest = path.join(scriptsDir, 'altercadia-bridge-worker.js');
const bridgeDomDest = path.join(scriptsDir, 'altercadia-bridge-dom.js');
const c3mainPath = path.join(scriptsDir, 'c3main.js');
const indexPath = path.join(targetDir, 'index.html');

const CITY_LAYOUTS = ['cidade_01'];
const FARM_LAYOUTS = ['zonabeco1', 'beco_dos_fundos_zona1'];
const WORKER_IMPORT = './altercadia-bridge-worker.js';
const DOM_SCRIPT = 'scripts/altercadia-bridge-dom.js';

function fail(msg) {
  console.error(`[prepare:construct] FAIL — ${msg}`);
  process.exit(1);
}

/** Aplica política WebGL no data.json (público e, se existir, pasta de export fonte). */
function applyRendererPolicy(filePath, label) {
  if (!existsSync(filePath)) return null;
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  const patch = patchConstructProjectRendererPolicy(data);
  if (patch.changed) {
    writeFileSync(filePath, JSON.stringify(data));
    console.log(`[prepare:construct] renderer policy aplicada (${label})`, {
      before: patch.before,
      after: patch.after,
      policy: CONSTRUCT_RENDERER_POLICY,
    });
  } else {
    console.log(`[prepare:construct] renderer policy OK (${label})`, patch.after);
  }
  const policyCheck = assertConstructRendererPolicy(data);
  if (!policyCheck.ok) {
    fail(`renderer policy inválida após patch (${label}): ${policyCheck.reason}`);
  }
  return policyCheck;
}

if (!existsSync(indexPath)) {
  fail('public/construct-world/index.html ausente — exporte o HTML5 primeiro');
}
if (!existsSync(scriptsDir)) {
  fail('public/construct-world/scripts/ ausente');
}
if (!existsSync(bridgeWorkerSrc) || !existsSync(bridgeDomSrc)) {
  fail('construct/bridge/altercadia-bridge-{worker,dom}.js ausente');
}

copyFileSync(bridgeWorkerSrc, bridgeWorkerDest);
copyFileSync(bridgeDomSrc, bridgeDomDest);
console.log('[prepare:construct] altercadia-bridge-worker.js + altercadia-bridge-dom.js copiados');

if (!existsSync(c3mainPath)) {
  fail('c3main.js ausente');
}

let c3 = readFileSync(c3mainPath, 'utf8');
c3 = c3
  .replace(/import\s+["']\.\/altercadia-bridge\.js["'];\s*\n?/g, '')
  .replace(/import\s+["']\.\/altercadia-bridge-worker\.js["'];\s*\n?/g, '');

if (!c3.includes('altercadia-bridge-worker')) {
  if (!c3.trimEnd().endsWith('\n')) c3 += '\n';
  c3 += `import "${WORKER_IMPORT}";\n`;
  writeFileSync(c3mainPath, c3);
  console.log('[prepare:construct] import worker bridge em c3main.js');
} else {
  writeFileSync(c3mainPath, c3);
  console.log('[prepare:construct] c3main.js já importa worker bridge');
}

let indexHtml = readFileSync(indexPath, 'utf8');
if (!indexHtml.includes(DOM_SCRIPT)) {
  indexHtml = indexHtml.replace(
    '<script src="scripts/main.js" type="module"></script>',
    `<script src="${DOM_SCRIPT}"></script>\n\t<script src="scripts/main.js" type="module"></script>`,
  );
  writeFileSync(indexPath, indexHtml);
  console.log('[prepare:construct] altercadia-bridge-dom.js adicionado ao index.html');
} else {
  console.log('[prepare:construct] index.html já inclui bridge DOM');
}

/** Garante CSS 640×360 no export (reaplica após cada sync HTML5). */
const stylePath = path.join(targetDir, 'style.css');
if (existsSync(stylePath)) {
  let css = readFileSync(stylePath, 'utf8');
  if (!css.includes('/* altercadia-viewport-lock */')) {
    css = `/* altercadia-viewport-lock */\nhtml, body { width: 640px; height: 360px; overflow: hidden; margin: 0; padding: 0; background: #050a0d; }\ncanvas, #c3canvas { left: 0 !important; top: 0 !important; width: 640px !important; height: 360px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; transform: none !important; background: transparent !important; }\n.c3htmlwrap { left: 0 !important; top: 0 !important; width: 640px !important; height: 360px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; transform: none !important; background: transparent !important; pointer-events: none !important; }\nimg[src*="loading-logo"] { display: none !important; }\n\n${css}`;
    writeFileSync(stylePath, css);
    console.log('[prepare:construct] style.css — viewport 640×360 travado');
  } else if (css.includes('canvas, .c3htmlwrap, #c3canvas') && css.includes('background: #050a0d !important')) {
    // Export antigo: fundo opaco no .c3htmlwrap tapava o WebGL (só overlay PNG visível).
    css = css.replace(
      /canvas, \.c3htmlwrap, #c3canvas \{ left: 0 !important; top: 0 !important; width: 640px !important; height: 360px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; transform: none !important; background: #050a0d !important; \}/,
      'canvas, #c3canvas { left: 0 !important; top: 0 !important; width: 640px !important; height: 360px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; transform: none !important; background: transparent !important; }\n.c3htmlwrap { left: 0 !important; top: 0 !important; width: 640px !important; height: 360px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; transform: none !important; background: transparent !important; pointer-events: none !important; }',
    );
    writeFileSync(stylePath, css);
    console.log('[prepare:construct] style.css — removido fundo opaco do .c3htmlwrap');
  }
}

const dataJsonPath = path.join(targetDir, 'data.json');
if (!existsSync(dataJsonPath)) {
  fail('data.json ausente');
}

const policyCheck = applyRendererPolicy(dataJsonPath, 'public/construct-world');
// Espelha no export fonte — próximo sync já nasce WebGL-only.
applyRendererPolicy(sourceExportDataJson, 'construct/altercadia-world');

const dataRaw = readFileSync(dataJsonPath, 'utf8');
const hasCity = CITY_LAYOUTS.some((n) => dataRaw.includes(n));
const farmHit = FARM_LAYOUTS.find((n) => dataRaw.includes(n));
if (!hasCity) fail('layout cidade_01 ausente em data.json');
if (!farmHit) fail('layout do beco ausente (esperava zonabeco1 ou beco_dos_fundos_zona1)');

const meta = {
  contractVersion: 2,
  preparedAt: new Date().toISOString(),
  cityLayout: 'cidade_01',
  farmLayout: farmHit,
  rendererPolicy: CONSTRUCT_RENDERER_POLICY,
  projectFlags: {
    viewportWidth: policyCheck.viewportWidth,
    viewportHeight: policyCheck.viewportHeight,
    fullscreenMode: policyCheck.fullscreenMode,
    enableWebGPU: policyCheck.webgpuEnabled,
    sampling: policyCheck.sampling,
    gpuPowerPreference: policyCheck.gpuPowerPreference,
  },
  runtimeGuards: {
    devicePixelRatio: 1,
    webgpuKillSwitch: true,
    imageRendering: 'pixelated',
  },
  bridge: {
    worker: 'scripts/altercadia-bridge-worker.js',
    dom: DOM_SCRIPT,
    channel: 'altercadia-construct-bridge',
  },
  preferredTerrain: 'TiledBg/Tilemap',
};
writeFileSync(path.join(targetDir, 'export-meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
console.log('[prepare:construct] OK', meta);

const generate = spawnSync(
  process.execPath,
  [path.join(root, 'scripts', 'generate-construct-placements.mjs')],
  { cwd: root, stdio: 'inherit' },
);
if (generate.status !== 0) {
  process.exit(generate.status ?? 1);
}
