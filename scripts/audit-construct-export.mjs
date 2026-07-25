#!/usr/bin/env node
/**
 * Valida o export HTML5 em public/construct-world/ contra o contrato enxuto.
 * Não exige objectTypes de terreno/sprite — Tilemap + layouts bastam.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONSTRUCT_RENDERER_POLICY,
  assertConstructRendererPolicy,
} from './lib/constructProjectPatch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetDir = path.join(root, 'public', 'construct-world');

const REQUIRED_FILES = [
  'index.html',
  'data.json',
  'style.css',
  'appmanifest.json',
  'workermain.js',
];
const REQUIRED_DIRS = ['scripts', 'images'];
const REQUIRED_LAYOUTS = ['cidade_01'];
const FARM_LAYOUT_ALIASES = ['zonabeco1', 'beco_dos_fundos_zona1'];
const OPTIONAL_MARKERS = [
  'spawn_players',
  'computador_arena',
  'combate_pvp',
  'computador_zona1',
  'computador_marketplace',
  'computador_marktplace', // typo legado — ok se ainda existir
];

function fail(message) {
  console.error(`[audit:construct] FAIL — ${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`[audit:construct] WARN — ${message}`);
}

if (!existsSync(targetDir)) {
  fail(`pasta ausente: ${targetDir} (rode npm run sync:construct ou prepare:construct)`);
}

for (const file of REQUIRED_FILES) {
  if (!existsSync(path.join(targetDir, file))) {
    fail(`arquivo obrigatório ausente: ${file}`);
  }
}

for (const dir of REQUIRED_DIRS) {
  const p = path.join(targetDir, dir);
  if (!existsSync(p) || !statSync(p).isDirectory()) {
    fail(`pasta obrigatória ausente: ${dir}/`);
  }
}

const bridgePath = path.join(targetDir, 'scripts', 'altercadia-bridge-worker.js');
const bridgeDomPath = path.join(targetDir, 'scripts', 'altercadia-bridge-dom.js');
if (!existsSync(bridgePath)) {
  fail('scripts/altercadia-bridge-worker.js ausente — rode npm run prepare:construct');
}
if (!existsSync(bridgeDomPath)) {
  fail('scripts/altercadia-bridge-dom.js ausente — rode npm run prepare:construct');
}

const indexHtml = readFileSync(path.join(targetDir, 'index.html'), 'utf8');
if (!indexHtml.includes('altercadia-bridge-dom.js')) {
  fail('index.html não inclui altercadia-bridge-dom.js — rode npm run prepare:construct');
}

const c3main = path.join(targetDir, 'scripts', 'c3main.js');
if (existsSync(c3main)) {
  const c3 = readFileSync(c3main, 'utf8');
  if (!c3.includes('altercadia-bridge-worker')) {
    fail('c3main.js não importa altercadia-bridge-worker — rode npm run prepare:construct');
  }
} else {
  warn('scripts/c3main.js ausente (export incompleto?)');
}

const dataJson = JSON.parse(readFileSync(path.join(targetDir, 'data.json'), 'utf8'));
const dataRaw = JSON.stringify(dataJson);
for (const layout of REQUIRED_LAYOUTS) {
  if (!dataRaw.includes(layout)) {
    fail(`layout obrigatório não encontrado em data.json: ${layout}`);
  }
}
const farmHit = FARM_LAYOUT_ALIASES.find((name) => dataRaw.includes(name));
if (!farmHit) {
  fail(`layout do beco ausente (esperava ${FARM_LAYOUT_ALIASES.join(' | ')})`);
}

const rendererPolicy = assertConstructRendererPolicy(dataJson);
if (!rendererPolicy.ok) {
  fail(
    `renderer policy: ${rendererPolicy.reason} — rode npm run prepare:construct (força ${CONSTRUCT_RENDERER_POLICY})`,
  );
}

const foundMarkers = OPTIONAL_MARKERS.filter((m) => dataRaw.includes(m));
const missingMarkers = OPTIONAL_MARKERS.filter(
  (m) => m !== 'computador_marktplace' && !dataRaw.includes(m),
);

console.log('[audit:construct] OK — export enxuto válido');
console.log(`  path        → ${targetDir}`);
console.log(`  root entries→ ${readdirSync(targetDir).length}`);
console.log(`  layouts     → cidade_01, ${farmHit}`);
console.log(
  `  renderer    → ${CONSTRUCT_RENDERER_POLICY} (viewport=${rendererPolicy.viewportWidth}×${rendererPolicy.viewportHeight}, fullscreen=${rendererPolicy.fullscreenMode}, webgpu=${rendererPolicy.webgpuEnabled}, sampling=${rendererPolicy.sampling}, gpu=${rendererPolicy.gpuPowerPreference})`,
);
console.log(
  `  markers hit → ${foundMarkers.length ? foundMarkers.join(', ') : '(nenhum — ok, overlay usa registry)'}`,
);
if (missingMarkers.length) {
  warn(
    `markers opcionais ausentes (só décor): ${missingMarkers.join(', ')} — gameplay não depende deles`,
  );
}
console.log('  terreno     → TiledBg/Tilemap OK; sprites de chão NÃO são exigidos');
