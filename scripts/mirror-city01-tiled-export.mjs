/**
 * @deprecated Use `npm run mirror:map-mund` — fonte canônica: public/assets/map_mund/
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
console.warn('[mirror-tiled] DEPRECATED — redirecionando para mirror:map-mund');

const result = spawnSync('npm', ['run', 'mirror:map-mund'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);
