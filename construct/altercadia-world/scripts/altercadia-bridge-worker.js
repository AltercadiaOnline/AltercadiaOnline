/**
 * Bridge Construct (worker) — pipeline:
 *   afterprojectstart → construct:ready
 *   load-map → goToLayout → construct:layout-ready
 *   exploration-frame → scroll (centro do viewport 640×360)
 */
const CHANNEL = 'altercadia-construct-bridge';

/** Viewport oficial Altercadia — espelha DESIGN_CONFIG.VIEWPORT */
const VIEW_W = 640;
const VIEW_H = 360;

const LAYOUT_BY_MAP_ID = {
  city_01: 'cidade_01',
  farm_zone_01: 'zonabeco1',
};

const LAYOUT_ALIASES = {
  beco_dos_fundos_zona1: 'zonabeco1',
  zonabeco1: 'zonabeco1',
  cidade_01: 'cidade_01',
};

function resolveLayoutName(mapId, layoutId) {
  const requested = layoutId ?? LAYOUT_BY_MAP_ID[mapId] ?? mapId;
  return LAYOUT_ALIASES[requested] ?? requested;
}

function isAltercadiaInbound(data) {
  return data
    && typeof data === 'object'
    && typeof data.type === 'string'
    && data.type.startsWith('altercadia:');
}

function tryGetLayout(runtime) {
  try {
    return runtime.layout ?? null;
  } catch {
    return null;
  }
}

function sameLayoutName(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

/** Markers spawn_* — âncora só; overlay Altercadia desenha o sprite top-down. */
const HIDDEN_CREATURE_SPAWN_TYPES = [
  'spawn_rato',
  'spawn_morcego',
  'spawn_corvo',
  'spawn_cachorro',
  'spawn_aranha',
];

/** Placeholders grandes (250×250) — só âncora lógica; não pintar no Construct. */
const HIDDEN_ANCHOR_MARKER_TYPES = [
  'spawn_players',
  'player_spawn',
  'teletransporte_asset',
];

/** Markers NPC/terminais — overlay desenha PNG de public/assets. */
const HIDDEN_NPC_MARKER_TYPES = [
  'npc_anciao_cael',
  'npc_banqueiro',
  'npc_ferreiro',
  'npc_alquimista',
  'npc_vendedor',
  'npc_treinador_pet',
  'npc_mestre_trilhas',
  'npc_mercenario',
  'computador_arena',
  'computador_marketplace',
  'computador_zona1',
  'pulpito',
  'combate_pvp',
];

function hideGameplayMarkers(runtime) {
  for (const typeName of [
    ...HIDDEN_CREATURE_SPAWN_TYPES,
    ...HIDDEN_ANCHOR_MARKER_TYPES,
    ...HIDDEN_NPC_MARKER_TYPES,
  ]) {
    try {
      const objectClass = runtime.objects?.[typeName];
      if (!objectClass?.getAllInstances) continue;
      for (const inst of objectClass.getAllInstances()) {
        inst.isVisible = false;
      }
    } catch {
      // object type ausente neste layout — ok
    }
  }
}

function switchLayout(runtime, bus, mapId, layoutName) {
  const current = tryGetLayout(runtime);
  if (current && sameLayoutName(current.name, layoutName)) {
    hideGameplayMarkers(runtime);
    bus.postMessage({ type: 'construct:layout-ready', mapId });
    return;
  }

  try {
    runtime.getLayout(layoutName);
  } catch (error) {
    bus.postMessage({
      type: 'construct:error',
      message: `Layout "${layoutName}" ausente: ${error?.message ?? error}`,
    });
    return;
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    runtime.removeEventListener('tick', onTick);
    hideGameplayMarkers(runtime);
    bus.postMessage({ type: 'construct:layout-ready', mapId });
  };

  const onTick = () => {
    const layout = tryGetLayout(runtime);
    if (layout && sameLayoutName(layout.name, layoutName)) finish();
  };

  try {
    runtime.addEventListener('tick', onTick);
    runtime.goToLayout(layoutName);
  } catch (error) {
    runtime.removeEventListener('tick', onTick);
    bus.postMessage({
      type: 'construct:error',
      message: `goToLayout(${layoutName}): ${error?.message ?? error}`,
    });
  }
}

/**
 * C3 ILayout.scrollX/Y = centro do viewport em coords do layout.
 * Altercadia cameraX/Y = canto superior-esquerdo do viewport.
 */
function applyScroll(runtime, cameraX, cameraY) {
  const layout = tryGetLayout(runtime);
  if (!layout) return;
  const x = Number(cameraX);
  const y = Number(cameraY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  layout.scrollX = x + VIEW_W * 0.5;
  layout.scrollY = y + VIEW_H * 0.5;
}

self.runOnStartup((runtime) => {
  const bus = new BroadcastChannel(CHANNEL);
  let lastScrollX = NaN;
  let lastScrollY = NaN;

  runtime.addEventListener('afterprojectstart', () => {
    bus.postMessage({ type: 'construct:ready' });
  });

  bus.onmessage = (event) => {
    const msg = event.data;
    if (!isAltercadiaInbound(msg)) return;

    if (msg.type === 'altercadia:load-map') {
      lastScrollX = NaN;
      lastScrollY = NaN;
      switchLayout(
        runtime,
        bus,
        msg.mapId,
        resolveLayoutName(msg.mapId, msg.layoutId),
      );
      return;
    }

    if (msg.type === 'altercadia:exploration-frame') {
      const mirror = msg.mirror;
      if (!mirror) return;
      const cx = Number(mirror.cameraX);
      const cy = Number(mirror.cameraY);
      // Evita post→scroll a cada frame idêntico (menos trabalho no worker).
      if (cx === lastScrollX && cy === lastScrollY) return;
      lastScrollX = cx;
      lastScrollY = cy;
      applyScroll(runtime, cx, cy);
      return;
    }

    if (msg.type === 'altercadia:set-mode' && msg.mode === 'battle') {
      bus.postMessage({ type: 'construct:battle-ready' });
    }
  };
});
