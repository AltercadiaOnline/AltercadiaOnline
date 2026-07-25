#!/usr/bin/env node
/**
 * Copia o export HTML5 do Construct para public/construct-world/.
 *
 * Contrato enxuto (v2): Tilemap + layouts + bridge.
 * - Apaga public/construct-world inteiro a cada sync (sprites mortos somem).
 * - NÃO copia pasta de projeto (layouts/, objectTypes/, .c3proj).
 * - Exige index.html + data.json; bridge injetada por prepare:construct.
 * - Não exige objectTypes de terreno (ruas, calçadas, etc.).
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'construct', 'altercadia-world');
const targetDir = path.join(root, 'public', 'construct-world');

const EXPORT_DIRS = ['icons', 'images', 'scripts', 'media'];
const EXPORT_FILES = [
  'index.html',
  'data.json',
  'style.css',
  'appmanifest.json',
  'workermain.js',
  'offline.json',
];

const REQUIRED_LAYOUTS = ['cidade_01'];
const FARM_LAYOUT_ALIASES = ['zonabeco1', 'beco_dos_fundos_zona1'];

const EXCLUDED_NAMES = new Set([
  '.gitkeep',
  'project.c3proj',
  'project.uistate.json',
  'projectfiles.uistate.json',
  'objecttypes.uistate.json',
  'models3d.uistate.json',
]);

function isProjectSource(name) {
  if (EXCLUDED_NAMES.has(name)) return true;
  if (name.endsWith('.uistate.json')) return true;
  return ['eventSheets', 'flowcharts', 'layouts', 'objectTypes', 'timelines'].includes(name);
}

function copyExportTree() {
  if (!existsSync(sourceDir)) {
    console.error(`[sync:construct] Origem ausente: ${sourceDir}`);
    process.exit(1);
  }

  const indexSource = path.join(sourceDir, 'index.html');
  if (!existsSync(indexSource)) {
    console.error(
      '[sync:construct] index.html ausente em construct/altercadia-world/.\n'
        + '  Exporte HTML5 do Construct para essa pasta (ou sobrescreva o export atual),\n'
        + '  depois rode de novo: npm run sync:construct',
    );
    process.exit(1);
  }

  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  for (const file of EXPORT_FILES) {
    const from = path.join(sourceDir, file);
    if (!existsSync(from)) {
      if (file === 'index.html' || file === 'data.json') {
        console.error(`[sync:construct] Obrigatório ausente: ${file}`);
        process.exit(1);
      }
      console.warn(`[sync:construct] Arquivo opcional ausente: ${file}`);
      continue;
    }
    cpSync(from, path.join(targetDir, file));
    console.log(`[sync:construct] ${file}`);
  }

  for (const dir of EXPORT_DIRS) {
    const from = path.join(sourceDir, dir);
    if (!existsSync(from)) {
      if (dir === 'scripts' || dir === 'images') {
        console.error(`[sync:construct] Pasta obrigatória ausente: ${dir}/`);
        process.exit(1);
      }
      console.warn(`[sync:construct] Pasta opcional ausente: ${dir}/`);
      continue;
    }
    cpSync(from, path.join(targetDir, dir), { recursive: true });
    console.log(`[sync:construct] ${dir}/`);
  }

  // Bridge é injetada por prepare:construct — não falhar se o Construct não trouxe o script.

  const extras = readdirSync(sourceDir);
  for (const name of extras) {
    if (isProjectSource(name)) continue;
    if (EXPORT_FILES.includes(name) || EXPORT_DIRS.includes(name)) continue;
    const from = path.join(sourceDir, name);
    const to = path.join(targetDir, name);
    if (!statSync(from).isFile()) continue;
    cpSync(from, to);
    console.log(`[sync:construct] ${name}`);
  }

  const dataRaw = readFileSync(path.join(targetDir, 'data.json'), 'utf8');
  for (const layout of REQUIRED_LAYOUTS) {
    if (!dataRaw.includes(layout)) {
      console.error(`[sync:construct] Layout obrigatório ausente em data.json: ${layout}`);
      process.exit(1);
    }
  }
  const farmHit = FARM_LAYOUT_ALIASES.find((name) => dataRaw.includes(name));
  if (!farmHit) {
    console.error(
      `[sync:construct] Layout do beco ausente (esperava ${FARM_LAYOUT_ALIASES.join(' | ')})`,
    );
    process.exit(1);
  }

  console.log(
    `[sync:construct] OK → public/construct-world/ (${readdirSync(targetDir).length} entradas na raiz)`,
  );
  console.log(`[sync:construct] Layouts OK: cidade_01, ${farmHit}`);
}

copyExportTree();

const prepare = spawnSync(
  process.execPath,
  [path.join(root, 'scripts', 'prepare-construct-runtime.mjs')],
  { cwd: root, stdio: 'inherit' },
);
if (prepare.status !== 0) {
  process.exit(prepare.status ?? 1);
}

const generate = spawnSync(
  process.execPath,
  [path.join(root, 'scripts', 'generate-construct-placements.mjs')],
  { cwd: root, stdio: 'inherit' },
);
if (generate.status !== 0) {
  process.exit(generate.status ?? 1);
}

const audit = spawnSync(process.execPath, [path.join(root, 'scripts', 'audit-construct-export.mjs')], {
  cwd: root,
  stdio: 'inherit',
});
if (audit.status !== 0) {
  process.exit(audit.status ?? 1);
}
