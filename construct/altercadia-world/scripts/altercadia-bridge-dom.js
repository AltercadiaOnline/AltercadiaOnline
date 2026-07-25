/**
 * Bridge DOM (iframe Construct) ↔ Altercadia parent + BroadcastChannel ↔ worker.
 * Carregado em index.html — tem acesso a window.parent.
 */
(function altercadiaConstructBridgeDom() {
  const CHANNEL = 'altercadia-construct-bridge';
  const VIEW_W = 640;
  const VIEW_H = 360;

  /** Trava o canvas C3 em 640×360 (evita stretch/letterbox no iframe). */
  function lockViewportCss() {
    if (typeof document === 'undefined') return;
    let style = document.getElementById('altercadia-construct-viewport-lock');
    if (!style) {
      style = document.createElement('style');
      style.id = 'altercadia-construct-viewport-lock';
      document.head.appendChild(style);
    }
    style.textContent = [
      `html,body{width:${VIEW_W}px!important;height:${VIEW_H}px!important;overflow:hidden!important;margin:0!important;padding:0!important;background:#050a0d!important;}`,
      /* Canvas 1:1 — mata letterbox. NÃO pintar .c3htmlwrap (fica por cima do WebGL e tapa o mapa). */
      `canvas,#c3canvas{left:0!important;top:0!important;right:auto!important;bottom:auto!important;width:${VIEW_W}px!important;height:${VIEW_H}px!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;background:transparent!important;}`,
      `.c3htmlwrap{left:0!important;top:0!important;width:${VIEW_W}px!important;height:${VIEW_H}px!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;background:transparent!important;pointer-events:none!important;}`,
      `img[src*="loading-logo"]{display:none!important;}`,
    ].join('');
  }

  function postToParent(message) {
    if (typeof window === 'undefined') return;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, window.location.origin);
    }
  }

  function isAltercadiaInbound(data) {
    return data
      && typeof data === 'object'
      && typeof data.type === 'string'
      && data.type.startsWith('altercadia:');
  }

  function isConstructOutbound(data) {
    return data
      && typeof data === 'object'
      && typeof data.type === 'string'
      && data.type.startsWith('construct:');
  }

  if (typeof BroadcastChannel === 'undefined') {
    console.error('[altercadia-bridge-dom] BroadcastChannel indisponível — bridge Construct inoperante.');
    return;
  }

  lockViewportCss();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', lockViewportCss, { once: true });
  }
  window.addEventListener('resize', lockViewportCss);

  const bus = new BroadcastChannel(CHANNEL);

  bus.onmessage = (event) => {
    const msg = event.data;
    if (isConstructOutbound(msg)) {
      postToParent(msg);
    }
  };

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const msg = event.data;
    if (!isAltercadiaInbound(msg)) return;
    bus.postMessage(msg);
  });
})();
