import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyHttpCors } from '../config/cors.js';
import type { PublicClientConfig } from '../../shared/publicClientConfig.js';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
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
};

export function resolveStaticDirs(moduleUrl: string): Pick<StaticServerOptions, 'publicDir' | 'distDir' | 'projectRoot'> {
  const root = projectRootFromModule(moduleUrl);
  return {
    projectRoot: root,
    publicDir: path.join(root, 'public'),
    distDir: path.join(root, 'dist'),
  };
}

function resolveVendorFile(projectRoot: string, pathname: string): string | null {
  const prefix = '/vendor/';
  if (!pathname.startsWith(prefix)) return null;

  const remainder = pathname.slice(prefix.length);
  const slash = remainder.indexOf('/');
  if (slash <= 0) return null;

  const packageName = remainder.slice(0, slash);
  const packageDirName = VENDOR_PACKAGE_ROOTS[packageName];
  if (!packageDirName) return null;

  const relativeFile = remainder.slice(slash + 1);
  const vendorBase = path.join(projectRoot, 'node_modules', packageDirName);
  return safePath(vendorBase, relativeFile);
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

export function createStaticServer(options: StaticServerOptions): http.Server {
  return http.createServer(async (req, res) => {
    try {
      if (applyHttpCors(req, res, options.corsOrigins)) return;

      const url = new URL(req.url ?? '/', 'http://localhost');
      let pathname = decodeURIComponent(url.pathname);

      if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, service: 'altercadia-v2' }));
        return;
      }

      if (pathname === '/config/client') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(options.clientPublicConfig));
        return;
      }

      if (pathname === '/') pathname = '/index.html';

      const vendorFile = resolveVendorFile(options.projectRoot, pathname);
      if (vendorFile && existsSync(vendorFile) && statSync(vendorFile).isFile()) {
        const ext = path.extname(vendorFile);
        res.writeHead(200, {
          'Content-Type': MIME[ext] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        createReadStream(vendorFile).pipe(res);
        return;
      }

      // Artefatos compilados (client + shared): /client/... e /shared/... → dist/
      const distRelative = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      const distFile = safePath(options.distDir, distRelative);
      if (distFile && existsSync(distFile) && statSync(distFile).isFile()) {
        const ext = path.extname(distFile);
        if (ext === '.js' || ext === '.json') {
          const cacheControl = ext === '.js' ? 'no-store' : undefined;
          res.writeHead(200, {
            'Content-Type': MIME[ext] ?? 'application/octet-stream',
            ...(cacheControl ? { 'Cache-Control': cacheControl } : {}),
          });
          createReadStream(distFile).pipe(res);
          return;
        }
      }

      const publicFile = safePath(options.publicDir, pathname.slice(1));
      if (publicFile && existsSync(publicFile) && statSync(publicFile).isFile()) {
        const ext = path.extname(publicFile);
        if (ext === '.html') {
          const html = await readTextFile(publicFile);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
        createReadStream(publicFile).pipe(res);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    } catch (error) {
      console.error('[HTTP] Erro:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    }
  });
}
