import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAuthCallbackPath } from '../../shared/auth/authCallback.js';
import { applyHttpCors } from '../config/cors.js';
import type { ServerEnv } from '../config/env.js';
import { createServerPublicClientConfig } from '../config/clientPublicConfig.js';
import type { PublicClientConfig } from '../../shared/publicClientConfig.js';
import { handleCriticalPersistOpsRoute } from './criticalPersistOpsRoute.js';
import { handleGiftTransferRoute } from './giftTransferRoute.js';
import { handlePlayerSnapshotRoute } from './playerSnapshotRoute.js';
import { handleCharacterHubRoute } from './characterHubRoute.js';
import { handleServerListRoute } from './serverListRoute.js';
import { tryGetServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { getActivePersistenceStorage } from '../persistence/storage/persistenceStorageRegistry.js';
import { resolveSupabaseAdminCredentials } from '../supabase/supabaseAdmin.js';

type ReadinessCheck = {
  readonly name: string;
  readonly ok: boolean;
  readonly detail?: string;
};

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function isCompiledBrowserAsset(relative: string): boolean {
  if (relative.startsWith('client/') || relative.startsWith('shared/') || relative.startsWith('config/')) {
    return relative.endsWith('.js') || relative.endsWith('.json');
  }
  if (relative.startsWith('game/')) {
    return relative.endsWith('.js') || relative.endsWith('.json');
  }
  return relative.startsWith('assets/') && relative.endsWith('.js');
}

function resolveDevHtmlCacheBustVersion(distDir: string): string {
  const mainJs = path.join(distDir, 'client', 'browser', 'main.js');
  if (existsSync(mainJs)) {
    return `dev-${Math.floor(statSync(mainJs).mtimeMs)}`;
  }
  return `dev-${Date.now()}`;
}

function injectDevCacheBust(html: string, version: string): string {
  return html.replace(/\?v=[^"'?]+/g, `?v=${version}`);
}

function streamDistOrPublicJs(
  res: ServerResponse,
  filePath: string,
  source: 'dist' | 'public',
  nodeEnv: string,
): void {
  const extraHeaders: Record<string, string> = {};
  let cacheControl: string | undefined;
  if (nodeEnv === 'development') {
    cacheControl = 'no-store';
    extraHeaders['X-Altercadia-Asset-Source'] = source;
  }
  streamFile(res, filePath, cacheControl, extraHeaders);
}

function projectRootFromModule(metaUrl: string): string {
  return path.join(fileURLToPath(metaUrl), '..', '..', '..');
}

/** Pacotes npm expostos ao browser via import map (ex.: gsap). */
const VENDOR_PACKAGE_ROOTS: Readonly<Record<string, string>> = {
  gsap: 'gsap',
};

export type StaticServerOptions = {
  readonly publicDir: string;
  readonly distDir: string;
  readonly projectRoot: string;
  readonly corsOrigins: readonly string[];
  readonly clientPublicConfig: PublicClientConfig;
  readonly serverEnv: ServerEnv;
};

export type StaticRequestListener = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | Promise<void>;

export function resolveStaticDirs(moduleUrl: string): Pick<StaticServerOptions, 'publicDir' | 'distDir' | 'projectRoot'> {
  const root = projectRootFromModule(moduleUrl);
  return {
    projectRoot: root,
    publicDir: path.join(root, 'public'),
    distDir: path.join(root, 'dist'),
  };
}

function resolveVendorFile(options: StaticServerOptions, pathname: string): string | null {
  const prefix = '/vendor/';
  if (!pathname.startsWith(prefix)) return null;

  const remainder = pathname.slice(prefix.length);
  const slash = remainder.indexOf('/');
  if (slash <= 0) return null;

  const packageName = remainder.slice(0, slash);
  const packageDirName = VENDOR_PACKAGE_ROOTS[packageName];
  if (!packageDirName) return null;

  const relativeFile = remainder.slice(slash + 1);

  const publicVendor = safePath(path.join(options.publicDir, 'vendor', packageDirName), relativeFile);
  if (publicVendor && existsSync(publicVendor) && statSync(publicVendor).isFile()) {
    return publicVendor;
  }

  const nodeVendor = path.join(options.projectRoot, 'node_modules', packageDirName);
  return safePath(nodeVendor, relativeFile);
}

function safePath(base: string, requestPath: string): string | null {
  const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(base, normalized);
  if (!full.startsWith(base)) return null;
  return full;
}

async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

function streamFile(
  res: ServerResponse,
  filePath: string,
  cacheControl?: string,
  extraHeaders?: Record<string, string>,
): void {
  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    ...(cacheControl ? { 'Cache-Control': cacheControl } : {}),
    ...extraHeaders,
  });
  createReadStream(filePath).pipe(res);
}

function writeJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function probeSupabaseReadiness(env: ServerEnv): Promise<ReadinessCheck> {
  const credentials = resolveSupabaseAdminCredentials(env);
  if (!credentials) {
    return { name: 'supabase', ok: false, detail: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente/inválido' };
  }

  try {
    const endpoint = `${credentials.url.replace(/\/+$/, '')}/rest/v1/profiles?select=id&limit=1`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: credentials.serviceRoleKey,
        Authorization: `Bearer ${credentials.serviceRoleKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (response.ok) {
      return { name: 'supabase', ok: true };
    }

    const body = await response.text().catch(() => '');
    return {
      name: 'supabase',
      ok: false,
      detail: `HTTP ${response.status}: ${body.slice(0, 160) || response.statusText}`,
    };
  } catch (error) {
    return {
      name: 'supabase',
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildStaticReadinessChecks(options: StaticServerOptions): ReadinessCheck[] {
  const instance = tryGetServerInstanceContext();
  const storage = getActivePersistenceStorage();
  const isProduction = options.serverEnv.nodeEnv === 'production';

  return [
    {
      name: 'server-instance',
      ok: Boolean(instance?.id),
      ...(instance ? { detail: `${instance.id} (${instance.displayName})` } : { detail: 'SERVER_ID não inicializado' }),
    },
    {
      name: 'persistence',
      ok: !isProduction || storage.isDurable(),
      detail: `${storage.mode}${storage.isDurable() ? ' durable' : ' ephemeral'}`,
    },
    {
      name: 'game-ws-url',
      ok: !isProduction || Boolean(options.serverEnv.gameWsUrl),
      detail: options.serverEnv.gameWsUrl ?? 'GAME_WS_URL ausente',
    },
    {
      name: 'game-http-url',
      ok: !isProduction || Boolean(options.serverEnv.gameHttpUrl),
      detail: options.serverEnv.gameHttpUrl ?? 'GAME_HTTP_URL ausente',
    },
    {
      name: 'browser-auth-config',
      ok: Boolean(options.serverEnv.supabaseUrl && options.serverEnv.supabaseAnonKey),
      detail: options.serverEnv.supabaseAnonKey ? 'SUPABASE_URL + ANON_KEY configurados' : 'SUPABASE_ANON_KEY ausente',
    },
  ];
}

async function buildReadinessResponse(options: StaticServerOptions): Promise<{
  readonly ok: boolean;
  readonly service: string;
  readonly serverId?: string;
  readonly checks: readonly ReadinessCheck[];
}> {
  const instance = tryGetServerInstanceContext();
  const checks = [
    ...buildStaticReadinessChecks(options),
    await probeSupabaseReadiness(options.serverEnv),
  ];

  return {
    ok: checks.every((check) => check.ok),
    service: 'altercadia-v2',
    ...(instance ? { serverId: instance.id } : {}),
    checks,
  };
}

async function serveStaticFile(
  options: StaticServerOptions,
  pathname: string,
  res: ServerResponse,
): Promise<boolean> {
  const relative = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  const isDev = options.serverEnv.nodeEnv === 'development';
  const preferDist = isDev && isCompiledBrowserAsset(relative);

  const tryServeDist = (): boolean => {
    const distFile = safePath(options.distDir, relative);
    if (!distFile || !existsSync(distFile) || !statSync(distFile).isFile()) {
      return false;
    }
    const ext = path.extname(distFile);
    if (ext !== '.js' && ext !== '.json') {
      return false;
    }
    streamDistOrPublicJs(res, distFile, 'dist', options.serverEnv.nodeEnv);
    return true;
  };

  const tryServePublic = async (): Promise<boolean> => {
    const publicFile = safePath(options.publicDir, relative);
    if (!publicFile || !existsSync(publicFile) || !statSync(publicFile).isFile()) {
      return false;
    }
    const ext = path.extname(publicFile);
    if (ext === '.html') {
      let html = await readTextFile(publicFile);
      if (isDev) {
        const version = resolveDevHtmlCacheBustVersion(options.distDir);
        html = injectDevCacheBust(html, version);
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        ...(isDev ? { 'Cache-Control': 'no-store' } : {}),
      });
      res.end(html);
      return true;
    }
    const cacheControl = ext === '.js' ? 'public, max-age=0, must-revalidate' : undefined;
    if (isDev && ext === '.js') {
      streamDistOrPublicJs(res, publicFile, 'public', options.serverEnv.nodeEnv);
    } else {
      streamFile(res, publicFile, cacheControl);
    }
    return true;
  };

  if (preferDist) {
    if (tryServeDist()) return true;
    return tryServePublic();
  }

  if (await tryServePublic()) return true;
  return tryServeDist();
}

/** Handler HTTP reutilizável (Node local + testes). */
export function createStaticRequestListener(options: StaticServerOptions): StaticRequestListener {
  return async (req, res) => {
    try {
      if (applyHttpCors(req, res, options.corsOrigins)) return;

      const url = new URL(req.url ?? '/', 'http://localhost');
      let pathname = decodeURIComponent(url.pathname);

      if (pathname === '/health') {
        const instance = tryGetServerInstanceContext();
        writeJson(res, 200, {
          ok: true,
          service: 'altercadia-v2',
          ...(instance
            ? {
                serverId: instance.id,
                serverName: instance.displayName,
                maps: instance.mapIds,
              }
            : {}),
        });
        return;
      }

      if (pathname === '/ready') {
        const body = await buildReadinessResponse(options);
        writeJson(res, body.ok ? 200 : 503, body);
        return;
      }

      if (await handleCriticalPersistOpsRoute(req, res, url, options.serverEnv)) {
        return;
      }

      if (pathname === '/config/client') {
        const clientConfig =
          options.serverEnv.nodeEnv === 'development'
            ? createServerPublicClientConfig(options.serverEnv, options.distDir)
            : options.clientPublicConfig;
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          ...(options.serverEnv.nodeEnv === 'development' ? { 'Cache-Control': 'no-store' } : {}),
        });
        res.end(JSON.stringify(clientConfig));
        return;
      }

      if (pathname === '/config/game-origin.json') {
        const gameOriginFile = safePath(options.publicDir, 'config/game-origin.json');
        if (
          gameOriginFile
          && existsSync(gameOriginFile)
          && statSync(gameOriginFile).isFile()
        ) {
          streamFile(
            res,
            gameOriginFile,
            options.serverEnv.nodeEnv === 'development' ? 'no-store' : undefined,
          );
          return;
        }
        writeJson(res, 200, { gameWsUrl: null, gameHttpUrl: null });
        return;
      }

      if (await handleGiftTransferRoute(req, res, url, options.serverEnv)) {
        return;
      }

      if (await handlePlayerSnapshotRoute(req, res, url, options.serverEnv)) {
        return;
      }

      if (await handleServerListRoute(req, res, url, options.serverEnv)) {
        return;
      }

      if (await handleCharacterHubRoute(req, res, url, options.serverEnv)) {
        return;
      }

      if (pathname === '/' || isAuthCallbackPath(pathname)) pathname = '/index.html';

      const vendorFile = resolveVendorFile(options, pathname);
      if (vendorFile) {
        streamFile(res, vendorFile, 'public, max-age=86400, immutable');
        return;
      }

      if (await serveStaticFile(options, pathname, res)) {
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    } catch (error) {
      console.error('[HTTP] Erro:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    }
  };
}

export function createStaticServer(options: StaticServerOptions): http.Server {
  return http.createServer(createStaticRequestListener(options));
}
