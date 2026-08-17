import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientBundle = path.join(root, 'dist', 'client', 'browser', 'main.js');
const shell = process.platform === 'win32';
const mockOnly = process.argv.includes('--mock');
const defaultGameMode = mockOnly ? 'local' : 'online';

if (!existsSync(clientBundle)) {
  console.error('');
  console.error('[dev] Build incompleto: dist/client/browser/main.js não existe.');
  console.error('[dev] Rode: npm run build');
  console.error('[dev] Corrija os erros do TypeScript antes de npm run dev.');
  console.error('');
  process.exit(1);
}

console.log('');
console.log('[dev] Altercadia — modo desenvolvimento');
if (mockOnly) {
  console.log('[dev] MOCK 1 jogador (sem multiplayer). Voltar ao MMO: npm run dev');
} else {
  console.log('[dev] Multiplayer = servidor local (mesmo protocolo da Vercel).');
  console.log('[dev] Abra http://localhost:3000/  — dois browsers / duas contas.');
  console.log('[dev] Mock 1 jogador: npm run dev:mock  ou  /?gameMode=local');
}
console.log('[dev] JS compilado: dist/client (tsc --watch) tem prioridade sobre public/client.');
console.log('[dev] No console do browser procure: [Altercadia] DEV bundle ativo: dev-...');
console.log('[dev] React HUD: public/app-ui (esbuild --watch).');
console.log('[dev] Após mudanças no código: aguarde "Found 0 errors" do tsc / "[build-react-ui]" e Ctrl+Shift+R.');
console.log('');

const tsc = spawn('npx', ['tsc', '--watch', '--preserveWatchOutput'], {
  stdio: 'inherit',
  shell,
  cwd: root,
});

const ui = spawn('node', ['scripts/build-react-ui.mjs', '--watch'], {
  stdio: 'inherit',
  shell,
  cwd: root,
});

const server = spawn('npx', ['tsx', 'watch', 'src/server/index.ts'], {
  stdio: 'inherit',
  shell,
  cwd: root,
  env: {
    ...process.env,
    ALTERCADIA_DEFAULT_GAME_MODE: defaultGameMode,
  },
});

function shutdown(code = 0) {
  tsc.kill();
  ui.kill();
  server.kill();
  process.exit(code);
}

tsc.on('exit', (code) => {
  if (code && code !== 0) shutdown(code);
});

ui.on('exit', (code) => {
  if (code && code !== 0) shutdown(code);
});

server.on('exit', (code) => {
  if (code && code !== 0) shutdown(code);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
