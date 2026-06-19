import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyHttpCors } from '../config/cors.js';
import type { ServerEnv } from '../config/env.js';
import type { PublicClientConfig } from '../../shared/publicClientConfig.js';
import { handleGiftTransferRoute } from './giftTransferRoute.js';
import { handlePlayerSnapshotRoute } from './playerSnapshotRoute.js';
import { handleCharacterHubRoute } from './characterHubRoute.js';
import { handleServerListRoute } from './serverListRoute.js';
import { tryGetServerInstanceContext } from '../instance/ServerInstanceContext.js';

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

function streamFile(res: ServerResponse, filePath: string, cacheControl?: string): void {
  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    ...(cacheControl ? { 'Cache-Control': cacheControl } : {}),
  });
  createReadStream(filePath).pipe(res);
}

async function serveStaticFile(
  options: StaticServerOptions,
  pathname: string,
  res: ServerResponse,
): Promise<boolean> {
  const relative = pathname.startsWith('/') ? pathname.slice(1) : pathname;

  const publicFile = safePath(options.publicDir, relative);
  if (publicFile && existsSync(publicFile) && statSync(publicFile).isFile()) {
    const ext = path.extname(publicFile);
    if (ext === '.html') {
      const html = await readTextFile(publicFile);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return true;
    }
    const cacheControl = ext === '.js' ? 'public, max-age=0, must-revalidate' : undefined;
    streamFile(res, publicFile, cacheControl);
    return true;
  }

  const distFile = safePath(options.distDir, relative);
  if (distFile && existsSync(distFile) && statSync(distFile).isFile()) {
    const ext = path.extname(distFile);
    if (ext === '.js' || ext === '.json') {
      streamFile(res, distFile, ext === '.js' ? 'no-store' : undefined);
      return true;
    }
  }

  return false;
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
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          ok: true,
          service: 'altercadia-v2',
          ...(instance
            ? {
                serverId: instance.id,
                serverName: instance.displayName,
                maps: instance.mapIds,
              }
            : {}),
        }));
        return;
      }

      if (pathname === '/config/client') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(options.clientPublicConfig));
        return;
      }

      if (await handleGiftTransferRoute(req, res, url, options.serverEnv)) {
        return;
      }

      if (await handlePlayerSnapshotRoute(req, res, url, options.serverEnv)) {
        return;
      }

      if (await handleServerListRoute(req, res, url)) {
        return;
      }

      if (await handleCharacterHubRoute(req, res, url, options.serverEnv)) {
        return;
      }

      if (pathname === '/') pathname = '/index.html';

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
