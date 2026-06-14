#!/usr/bin/env node
import { execSync } from 'node:child_process';

const message = `Deploy: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', encoding: 'utf8' });
}

run('git add .');

const pending = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
if (!pending) {
  console.log('[deploy] Nenhuma alteração para commitar.');
  process.exit(0);
}

run(`git commit -m "${message}"`);
run('git push origin main');
