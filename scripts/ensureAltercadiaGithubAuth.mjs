/**
 * Garante a conta GitHub do deploy Altercadia antes do `git push`.
 * Evita 403 quando o `gh` ativo é outra conta (ex.: nocautecrm-pixel).
 *
 * Override: DEPLOY_GH_USER=OutraConta
 */
import { spawnSync } from 'node:child_process';

export const ALTERCADIA_GH_USER = process.env.DEPLOY_GH_USER ?? 'AltercadiaOnline';

export function ensureAltercadiaGithubAuth() {
  const result = spawnSync('gh', ['auth', 'switch', '--user', ALTERCADIA_GH_USER], {
    stdio: 'inherit',
    encoding: 'utf8',
    shell: false,
  });

  if (result.status !== 0) {
    console.error(`[deploy] Conta GitHub ativa precisa ser "${ALTERCADIA_GH_USER}".`);
    console.error('[deploy] Rode: gh auth login -h github.com -p https -w  (conta Altercadia)');
    console.error('[deploy] Depois: gh auth status  → Active account = AltercadiaOnline');
    process.exit(1);
  }
}
