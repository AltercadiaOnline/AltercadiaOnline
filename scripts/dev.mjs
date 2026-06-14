import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientBundle = path.join(root, 'dist', 'client', 'browser', 'main.js');
const shell = process.platform === 'win32';

if (!existsSync(clientBundle)) {
  console.error('');
  console.error('[dev] Build incompleto: dist/client/browser/main.js não existe.');
  console.error('[dev] Rode: npm run build');
  console.error('[dev] Corrija os erros do TypeScript antes de npm run dev.');
  console.error('');
  process.exit(1);
}

const tsc = spawn('npx', ['tsc', '--watch', '--preserveWatchOutput'], {
  stdio: 'inherit',
  shell,
  cwd: root,
});

const server = spawn('npx', ['tsx', 'watch', 'src/server/index.ts'], {
  stdio: 'inherit',
  shell,
  cwd: root,
});

function shutdown(code = 0) {
  tsc.kill();
  server.kill();
  process.exit(code);
}

tsc.on('exit', (code) => {
  if (code && code !== 0) shutdown(code);
});

server.on('exit', (code) => {
  if (code && code !== 0) shutdown(code);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
