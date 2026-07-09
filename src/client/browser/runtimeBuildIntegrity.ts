type DeployManifest = {
  readonly commit?: string;
  readonly commitShort?: string;
};

export type ClientBuildIntegrity = {
  readonly expected: string | null;
  readonly loaded: string | null;
  readonly stale: boolean;
};

declare global {
  interface Window {
    __ALTERCADIA_BUILD__?: string;
  }
}

function readEmbeddedBuildStamp(): string | null {
  if (typeof window === 'undefined') return null;
  const embedded = window.__ALTERCADIA_BUILD__;
  return typeof embedded === 'string' && embedded.trim().length > 0
    ? embedded.trim().slice(0, 12)
    : null;
}

function readBuildFromModuleUrls(): string | null {
  if (typeof document === 'undefined') return null;

  const versions = new Set<string>();
  for (const script of document.querySelectorAll<HTMLScriptElement>('script[src*="?v="]')) {
    const match = script.src.match(/[?&]v=([^&]+)/);
    if (match?.[1]) {
      versions.add(match[1].slice(0, 12));
    }
  }

  if (versions.size === 0) return null;
  if (versions.size === 1) return [...versions][0] ?? null;

  console.warn('[Altercadia] Múltiplas versões de bundle no HTML:', [...versions]);
  return [...versions][0] ?? null;
}

export function resolveLoadedClientBuildStamp(): string | null {
  return readEmbeddedBuildStamp() ?? readBuildFromModuleUrls();
}

export async function fetchExpectedDeployCommit(): Promise<string | null> {
  try {
    const response = await fetch('/config/deploy-manifest.json', { cache: 'no-store' });
    if (!response.ok) return null;
    const manifest = (await response.json()) as DeployManifest;
    const commit = manifest.commitShort ?? manifest.commit;
    return typeof commit === 'string' && commit.trim().length > 0
      ? commit.trim().slice(0, 12)
      : null;
  } catch {
    return null;
  }
}

export async function checkClientBuildIntegrity(): Promise<ClientBuildIntegrity> {
  const [expected, loaded] = await Promise.all([
    fetchExpectedDeployCommit(),
    Promise.resolve(resolveLoadedClientBuildStamp()),
  ]);

  const stale = Boolean(expected && loaded && expected !== loaded);

  return { expected, loaded, stale };
}

/**
 * Detecta HTML/JS em cache (ex.: ?v=38bed53 com manifest cd629b0) e orienta reload.
 * Não bloqueia entrada no mundo — evita tela preta silenciosa por bundle antigo.
 */
export async function warnIfStaleClientBuild(context: string): Promise<ClientBuildIntegrity> {
  const integrity = await checkClientBuildIntegrity();

  if (!integrity.stale) {
    console.info(`[Altercadia] Build OK (${context})`, {
      loaded: integrity.loaded,
      expected: integrity.expected,
    });
    return integrity;
  }

  console.error(
    `[Altercadia] Build desatualizado no navegador (${context}) — esperado ${integrity.expected}, carregado ${integrity.loaded}. `
    + 'Use Ctrl+Shift+R ou abra em aba anônima. O mapa Phaser pode ficar preto com JS antigo.',
  );

  return integrity;
}
