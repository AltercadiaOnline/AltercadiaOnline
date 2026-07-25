#!/usr/bin/env node
/**
 * Auditoria mínima do export Construct — MVP.
 * Falha se a pasta construct/ estiver ausente ou sem project.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const constructDir = path.join(root, 'construct');

if (!fs.existsSync(constructDir)) {
  console.error('[audit:construct] Pasta construct/ ausente.');
  process.exit(1);
}

const projectCandidates = [
  path.join(constructDir, 'project.c3proj'),
  path.join(constructDir, 'AltercadiaOnline.c3proj'),
];

const hasProject = projectCandidates.some((p) => fs.existsSync(p))
  || fs.readdirSync(constructDir).some((name) => name.endsWith('.c3proj'));

if (!hasProject) {
  console.warn('[audit:construct] Nenhum .c3proj encontrado — seguindo (MVP).');
} else {
  console.log('[audit:construct] OK — pasta construct/ presente.');
}

process.exit(0);
