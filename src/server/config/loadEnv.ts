import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  GOVERNANCE_ENV_FILENAME,
  GOVERNANCE_ENV_KEYS,
  LOCAL_ENV_FILENAME,
} from './governanceEnvKeys.js';

type LoadEnvFileOptions = {
  /** Não altera chaves já presentes no shell antes do bootstrap. */
  readonly skipShellKeys: ReadonlySet<string>;
  /** Restringe quais chaves podem ser aplicadas. */
  readonly onlyKeys?: readonly string[];
  /** Sobrescreve valores já definidos por `.env` (nunca o shell). */
  readonly force?: boolean;
  /** Ignora valores vazios em arquivos — evita apagar credenciais do Railway com placeholders. */
  readonly skipEmptyValues?: boolean;
};

export type ProjectEnvLoadReport = {
  readonly localEnvLoaded: boolean;
  readonly governanceEnvLoaded: boolean;
  readonly localEnvPath: string;
  readonly governanceEnvPath: string;
  readonly shellGovernanceKeys: readonly string[];
};

function parseEnvContent(content: string): ReadonlyMap<string, string> {
  const entries = new Map<string, string>();

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    if (!key) continue;

    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries.set(key, value);
  }

  return entries;
}

function loadEnvFileAt(filePath: string, options: LoadEnvFileOptions): boolean {
  if (!existsSync(filePath)) return false;

  const content = readFileSync(filePath, 'utf8');
  const entries = parseEnvContent(content);
  const onlyKeys = options.onlyKeys ? new Set(options.onlyKeys) : null;

  for (const [key, value] of entries) {
    if (onlyKeys && !onlyKeys.has(key)) continue;
    if (options.skipShellKeys.has(key)) continue;
    if (options.skipEmptyValues && !value.trim()) continue;
    if (!options.force && process.env[key] !== undefined) continue;
    process.env[key] = value;
  }

  return true;
}

/**
 * Bootstrap de variáveis do projeto:
 * 1. Shell / Vercel — maior prioridade (nunca sobrescrito por arquivos)
 * 2. `.env` — config local geral (PORT, CORS, etc.)
 * 3. `.env.governance` — fonte oficial Supabase + Postgres (sobrescreve `.env` nas chaves de governance)
 *
 * Cliente browser: apenas `SUPABASE_URL` + `SUPABASE_ANON_KEY` via `/config/client`.
 * Servidor: `SUPABASE_SERVICE_ROLE_KEY` nunca é exposta ao browser.
 */
export function loadProjectEnv(cwd: string = process.cwd()): ProjectEnvLoadReport {
  const shellKeys = new Set(Object.keys(process.env));
  const localEnvPath = path.join(cwd, LOCAL_ENV_FILENAME);
  const governanceEnvPath = path.join(cwd, GOVERNANCE_ENV_FILENAME);

  const localEnvLoaded = loadEnvFileAt(localEnvPath, {
    skipShellKeys: shellKeys,
    skipEmptyValues: true,
  });

  const governanceEnvLoaded = loadEnvFileAt(governanceEnvPath, {
    skipShellKeys: shellKeys,
    onlyKeys: GOVERNANCE_ENV_KEYS,
    force: true,
    skipEmptyValues: true,
  });

  const shellGovernanceKeys = GOVERNANCE_ENV_KEYS.filter((key) => shellKeys.has(key));

  return {
    localEnvLoaded,
    governanceEnvLoaded,
    localEnvPath,
    governanceEnvPath,
    shellGovernanceKeys,
  };
}

export function logProjectEnvLoadReport(report: ProjectEnvLoadReport): void {
  console.log('[env] Bootstrap de variáveis — prioridade: shell/Railway > .env.governance > .env');
  console.log(
    `  ${LOCAL_ENV_FILENAME} → ${report.localEnvLoaded ? `carregado (${report.localEnvPath})` : 'não encontrado (ok em produção)'}`,
  );
  console.log(
    `  ${GOVERNANCE_ENV_FILENAME} → ${report.governanceEnvLoaded ? `carregado (${report.governanceEnvPath})` : 'não encontrado (ok em produção)'}`,
  );
  console.log(
    `  Chaves de governança no shell: ${report.shellGovernanceKeys.length ? report.shellGovernanceKeys.join(', ') : '(nenhuma — confira Variables no Railway)'}`,
  );
}

/** @deprecated Use `loadProjectEnv`. */
export function loadEnvFile(cwd: string = process.cwd()): void {
  loadProjectEnv(cwd);
}
