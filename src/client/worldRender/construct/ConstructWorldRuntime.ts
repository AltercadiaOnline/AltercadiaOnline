// @ts-nocheck
import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { preloadAllNpcDefinitionAssets } from '../../loaders/npcAssetImageLoader.js';
import { preloadPlayerSprites } from '../../renderPlayer.js';
import { ConstructEntityOverlay } from './ConstructEntityOverlay.js';
import { CONSTRUCT_EXPORT_INDEX, isConstructOutboundMessage, toConstructExplorationMirror, } from './constructBridgeProtocol.js';
import { resolveConstructLayoutId } from './constructMapLayoutAlias.js';
const VIEWPORT_W = DESIGN_CONFIG.VIEWPORT.WIDTH;
const VIEWPORT_H = DESIGN_CONFIG.VIEWPORT.HEIGHT;
/** Boot pediu mapa A; world-login pediu mapa B — o waiter de A é cancelado de propósito. */
export class ConstructLoadMapSupersededError extends Error {
    fromMapId;
    toMapId;
    name = 'ConstructLoadMapSupersededError';
    constructor(fromMapId, toMapId) {
        super(`loadMap substituído por outro mapa (${fromMapId ?? '?'} → ${toMapId}).`);
        this.fromMapId = fromMapId;
        this.toMapId = toMapId;
    }
}
export function isConstructLoadMapSupersededError(error) {
    return error instanceof ConstructLoadMapSupersededError
        || (error instanceof Error && error.message.startsWith('loadMap substituído por outro mapa'));
}
/**
 * Runtime Construct — terreno no iframe 640×360 (1:1) + overlay de entidades.
 * Câmera: scroll no Construct (centro do viewport); entidades usam o mesmo cameraX/Y.
 */
export class ConstructWorldRuntime {
    id = 'construct';
    host = null;
    iframe = null;
    entityOverlay = null;
    onMessage = null;
    bridgeReady = false;
    layoutMapId = null;
    wantedMapId = null;
    wantedSpawn;
    mode = 'exploration';
    lastPostedCamX = Number.NaN;
    lastPostedCamY = Number.NaN;
    layoutReadyWaiter = null;
    async boot(host) {
        this.shutdown();
        this.host = host;
        host.replaceChildren();
        host.classList.remove('hidden');
        host.toggleAttribute('aria-hidden', false);
        Object.assign(host.style, {
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            height: '100%',
        });
        // Prefetch em paralelo com o iframe — loadMap só resolve após layout-ready.
        const assetsReady = Promise.all([
            preloadPlayerSprites(),
            preloadAllNpcDefinitionAssets(),
        ]).catch((error) => {
            console.warn('[ConstructWorld] Prefetch de sprites falhou (segue com placeholder):', error);
        });
        if (!(await this.probeExport())) {
            this.mountPlaceholder(host);
            await assetsReady;
            return;
        }
        await this.mountIframe(host);
        // Sprites em paralelo — não bloqueia loadMap / layout-ready.
        void assetsReady;
    }
    shutdown() {
        this.rejectLayoutWaiter(new Error('Construct shutdown antes do layout.'));
        if (this.onMessage) {
            window.removeEventListener('message', this.onMessage);
            this.onMessage = null;
        }
        this.entityOverlay?.unmount();
        this.entityOverlay = null;
        this.iframe = null;
        this.bridgeReady = false;
        this.layoutMapId = null;
        this.wantedMapId = null;
        this.wantedSpawn = undefined;
        this.lastPostedCamX = Number.NaN;
        this.lastPostedCamY = Number.NaN;
        if (this.host)
            this.host.replaceChildren();
        this.host = null;
    }
    async loadMap(mapId, options) {
        this.wantedMapId = mapId;
        this.wantedSpawn = options?.spawn;
        if (this.layoutMapId === mapId) {
            this.setIframeBooting(false);
            return;
        }
        // Mesmo mapa já em voo (boot + world-login) — compartilha a promise.
        if (this.layoutReadyWaiter?.mapId === mapId) {
            this.flushWantedMap();
            await this.layoutReadyWaiter.promise;
            this.setIframeBooting(false);
            return;
        }
        // Só cancela waiter se for OUTRO mapa (ex.: boot city_01 vs world-login farm).
        if (this.layoutReadyWaiter) {
            this.rejectLayoutWaiter(new ConstructLoadMapSupersededError(this.layoutReadyWaiter.mapId, mapId));
        }
        this.layoutMapId = null;
        this.setIframeBooting(true);
        let settle;
        const promise = new Promise((resolve, reject) => {
            settle = (ok, error) => {
                if (ok)
                    resolve();
                else
                    reject(error ?? new Error('layout wait failed'));
            };
        });
        const timer = window.setTimeout(() => {
            if (this.layoutReadyWaiter?.mapId === mapId) {
                this.layoutReadyWaiter = null;
            }
            settle(false, new Error(`Timeout aguardando layout Construct (${mapId}).`));
        }, 20_000);
        this.layoutReadyWaiter = {
            mapId,
            promise,
            resolve: () => {
                window.clearTimeout(timer);
                settle(true);
            },
            reject: (error) => {
                window.clearTimeout(timer);
                settle(false, error);
            },
            timer,
        };
        this.flushWantedMap();
        try {
            await promise;
        }
        finally {
            // Garante iframe visível mesmo se layout-ready e await corriderem em race.
            this.setIframeBooting(false);
        }
    }
    applyFrame(frame) {
        this.entityOverlay?.render(frame);
        if (!this.layoutMapId || this.mode !== 'exploration')
            return;
        // Só reenvia scroll se a câmera mudou (evita spam postMessage → worker).
        if (frame.cameraX === this.lastPostedCamX && frame.cameraY === this.lastPostedCamY) {
            return;
        }
        this.lastPostedCamX = frame.cameraX;
        this.lastPostedCamY = frame.cameraY;
        this.postToConstruct({
            type: 'altercadia:exploration-frame',
            mirror: toConstructExplorationMirror(frame),
        });
    }
    applyMinimap(_snapshot) { }
    setMode(mode) {
        this.mode = mode;
        this.postToConstruct({ type: 'altercadia:set-mode', mode });
        if (this.host)
            this.host.dataset.worldMode = mode;
    }
    getInputSurface() {
        return this.host;
    }
    /** Layout já confirmado via construct:layout-ready (ou null). */
    getReadyMapId() {
        return this.layoutMapId;
    }
    /**
     * Aguarda o layout ativo (inclui corrida boot × world-login).
     * Se um loadMap for substituído, segue o waiter vencedor até layout-ready ou timeout.
     */
    async awaitActiveLayout(timeoutMs = 20_000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            if (this.layoutMapId)
                return this.layoutMapId;
            const waiter = this.layoutReadyWaiter;
            if (!waiter) {
                if (this.wantedMapId && this.bridgeReady) {
                    this.flushWantedMap();
                }
                await new Promise((resolve) => {
                    window.setTimeout(resolve, 40);
                });
                continue;
            }
            try {
                await waiter.promise;
            }
            catch (error) {
                if (isConstructLoadMapSupersededError(error)) {
                    continue;
                }
                if (this.layoutMapId)
                    return this.layoutMapId;
                throw error;
            }
            if (this.layoutMapId)
                return this.layoutMapId;
        }
        return this.layoutMapId;
    }
    setIframeBooting(booting) {
        const iframe = this.iframe;
        if (!iframe)
            return;
        iframe.classList.toggle('is-construct-booting', booting);
        // Nunca esconder o iframe com opacity/visibility — race deixava só o overlay
        // (player/NPC) visível sobre fundo #050a0d, com o mapa Construct “pronto” mas invisível.
        iframe.style.opacity = '1';
        iframe.style.visibility = 'visible';
    }
    rejectLayoutWaiter(error) {
        const waiter = this.layoutReadyWaiter;
        if (!waiter)
            return;
        this.layoutReadyWaiter = null;
        window.clearTimeout(waiter.timer);
        waiter.reject(error);
    }
    resolveLayoutWaiter(mapId) {
        const waiter = this.layoutReadyWaiter;
        if (!waiter || waiter.mapId !== mapId)
            return;
        this.layoutReadyWaiter = null;
        window.clearTimeout(waiter.timer);
        waiter.resolve();
    }
    flushWantedMap() {
        if (!this.bridgeReady || !this.wantedMapId)
            return;
        if (this.layoutMapId === this.wantedMapId)
            return;
        const mapId = this.wantedMapId;
        const spawn = this.wantedSpawn;
        this.postToConstruct({
            type: 'altercadia:load-map',
            mapId,
            layoutId: resolveConstructLayoutId(mapId),
            ...(spawn
                ? {
                    spawn: {
                        x: spawn.x,
                        y: spawn.y,
                        ...(spawn.facing ? { facing: spawn.facing } : {}),
                    },
                }
                : {}),
        });
    }
    async probeExport() {
        try {
            const response = await fetch(CONSTRUCT_EXPORT_INDEX, { method: 'HEAD', cache: 'no-store' });
            if (!response.ok)
                return false;
            // Fail-fast se prepare não rodou (WebGPU ainda ligado no meta).
            try {
                const metaRes = await fetch('/construct-world/export-meta.json', { cache: 'no-store' });
                if (metaRes.ok) {
                    const meta = (await metaRes.json());
                    if (meta.rendererPolicy && meta.rendererPolicy !== 'webgl-only') {
                        console.error('[ConstructWorld] export-meta não é webgl-only — rode npm run prepare:construct', meta);
                        return false;
                    }
                    if (meta.projectFlags?.enableWebGPU === true) {
                        console.error('[ConstructWorld] WebGPU ainda ligado no export-meta — rode npm run prepare:construct');
                        return false;
                    }
                }
            }
            catch {
                // meta opcional em deploys antigos — HEAD do index basta
            }
            return true;
        }
        catch {
            return false;
        }
    }
    async mountIframe(host) {
        const viewport = document.createElement('div');
        viewport.className = 'construct-world-viewport';
        const iframe = document.createElement('iframe');
        iframe.id = 'construct-world-frame';
        iframe.title = 'Altercadia World (Construct)';
        iframe.className = 'is-construct-booting';
        iframe.setAttribute('allow', 'autoplay');
        Object.assign(iframe.style, {
            border: '0',
            display: 'block',
            width: `${VIEWPORT_W}px`,
            height: `${VIEWPORT_H}px`,
            background: '#050a0d',
            opacity: '1',
            visibility: 'visible',
        });
        viewport.appendChild(iframe);
        host.appendChild(viewport);
        this.iframe = iframe;
        const overlay = new ConstructEntityOverlay();
        overlay.mount(viewport);
        this.entityOverlay = overlay;
        this.onMessage = (event) => {
            if (event.source !== iframe.contentWindow)
                return;
            if (!isConstructOutboundMessage(event.data))
                return;
            switch (event.data.type) {
                case 'construct:ready':
                    if (event.data.renderer === 'webgpu') {
                        this.setIframeBooting(false);
                        this.rejectLayoutWaiter(new Error('Construct em WebGPU — política Altercadia é WebGL-only. Rode npm run prepare:construct.'));
                        console.error('[ConstructWorld] WebGPU rejeitado no construct:ready');
                        break;
                    }
                    this.bridgeReady = true;
                    console.info('[ConstructWorld] Bridge pronta (WebGL).', {
                        renderer: event.data.renderer ?? 'webgl',
                        dpr: event.data.devicePixelRatio ?? 1,
                        viewport: event.data.viewport,
                    });
                    this.flushWantedMap();
                    break;
                case 'construct:layout-ready':
                    this.layoutMapId = event.data.mapId;
                    this.lastPostedCamX = Number.NaN;
                    this.lastPostedCamY = Number.NaN;
                    this.setIframeBooting(false);
                    this.resolveLayoutWaiter(event.data.mapId);
                    console.info('[ConstructWorld] Layout pronto:', event.data.mapId);
                    // City ready → warm hunt; farm ready → ensure local/server seed.
                    void import('../../world/zoneLoad/zoneLoadClient.js').then((mod) => {
                        mod.onExplorationMapLayoutReady(event.data.mapId);
                    });
                    break;
                case 'construct:error':
                    this.setIframeBooting(false);
                    this.rejectLayoutWaiter(new Error(event.data.message));
                    console.error('[ConstructWorld]', event.data.message);
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('message', this.onMessage);
        await new Promise((resolve) => {
            iframe.addEventListener('load', () => resolve(), { once: true });
            iframe.src = CONSTRUCT_EXPORT_INDEX;
            window.setTimeout(() => resolve(), 8000);
        });
        console.info('[ConstructWorld] Iframe montado — aguardando construct:ready.');
    }
    mountPlaceholder(host) {
        const panel = document.createElement('div');
        panel.className = 'construct-world-placeholder';
        panel.setAttribute('role', 'status');
        panel.textContent = 'Construct export ausente — npm run prepare:construct';
        Object.assign(panel.style, {
            display: 'grid',
            placeItems: 'center',
            width: '100%',
            height: '100%',
            background: '#0b151c',
            color: '#d7e2ea',
            fontSize: '12px',
        });
        host.appendChild(panel);
    }
    postToConstruct(message) {
        this.iframe?.contentWindow?.postMessage(message, window.location.origin);
    }
}
