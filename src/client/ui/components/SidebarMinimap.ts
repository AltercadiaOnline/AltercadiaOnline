import { getDataStore } from '../../economy/economyLayer.js';

import { buildMinimapTerrain } from '../../world/minimap/buildMinimapTerrain.js';

import { minimapClientClickToWorldTarget } from '../../world/minimap/minimapClickCoords.js';

import { dispatchMinimapNavigate } from '../../world/minimap/minimapNavigation.js';

import { MinimapRenderer } from '../../world/minimap/MinimapRenderer.js';

import type { MinimapSnapshot } from '../../world/minimap/minimapTypes.js';

import {

  getMinimapSnapshot,

  subscribeMinimapSnapshot,

} from '../../world/minimap/minimapState.js';

import type { MapId } from '../../../shared/world/mapRegistry.js';



/**

 * HUD do minimapa na barra lateral — espelha posições publicadas pela cena

 * e aceita click-to-move (pathfinding no mundo).

 */

export class SidebarMinimap {

  private readonly host: HTMLElement;

  private readonly canvas: HTMLCanvasElement;

  private readonly renderer: MinimapRenderer;

  private readonly unsubscribers: Array<() => void> = [];

  private readonly onMinimapClick: (event: MouseEvent) => void;

  private activeMapId: MapId | null = null;

  private lastSnapshot: MinimapSnapshot | null = null;



  private constructor(host: HTMLElement, canvas: HTMLCanvasElement) {

    this.host = host;

    this.canvas = canvas;

    this.renderer = new MinimapRenderer(canvas);

    this.onMinimapClick = (event) => this.handleMinimapClick(event);

  }



  static mount(host: HTMLElement): SidebarMinimap {

    host.innerHTML = `

      <canvas

        class="sidebar-minimap__canvas"

        aria-label="Minimapa do mundo — clique para mover"

        role="img"

      ></canvas>

    `;



    const canvas = host.querySelector('canvas');

    if (!(canvas instanceof HTMLCanvasElement)) {

      throw new Error('[SidebarMinimap] Canvas não encontrado após mount.');

    }



    return new SidebarMinimap(host, canvas);

  }



  attach(): void {

    const dataStore = getDataStore();



    this.canvas.addEventListener('click', this.onMinimapClick);



    this.unsubscribers.push(

      subscribeMinimapSnapshot((snapshot) => {

        this.onSnapshot(snapshot);

      }),

    );



    this.unsubscribers.push(

      dataStore.subscribe('marcosState', () => {

        this.redrawLastSnapshot();

      }),

    );



    this.unsubscribers.push(

      dataStore.subscribe('wallet', () => {

        this.redrawLastSnapshot();

      }),

    );



    const existing = getMinimapSnapshot();

    if (existing) {

      this.onSnapshot(existing);

    }

  }



  detach(): void {

    for (const off of this.unsubscribers) {

      off();

    }

    this.unsubscribers.length = 0;

    this.canvas.removeEventListener('click', this.onMinimapClick);

    this.host.replaceChildren();

    this.activeMapId = null;

    this.lastSnapshot = null;

  }



  private handleMinimapClick(event: MouseEvent): void {

    event.preventDefault();

    event.stopPropagation();



    const snapshot = this.lastSnapshot ?? getMinimapSnapshot();

    if (!snapshot) return;



    const target = minimapClientClickToWorldTarget(

      event.clientX,

      event.clientY,

      this.canvas,

      snapshot.tilesWide,

      snapshot.tilesHigh,

    );

    if (!target) return;



    dispatchMinimapNavigate(target);

  }



  private onSnapshot(snapshot: MinimapSnapshot): void {

    this.lastSnapshot = snapshot;



    if (this.activeMapId !== snapshot.mapId) {

      this.activeMapId = snapshot.mapId;

      this.renderer.setTerrain(buildMinimapTerrain(snapshot.mapId));

    }



    this.renderer.render(snapshot);

  }



  private redrawLastSnapshot(): void {

    if (!this.lastSnapshot) return;

    this.renderer.render(this.lastSnapshot);

  }

}



let activeMinimap: SidebarMinimap | null = null;



export function initSidebarMinimap(): SidebarMinimap {

  const host = document.getElementById('sidebar-minimap');

  if (!host) {

    throw new Error('[UI] #sidebar-minimap não encontrado.');

  }



  if (!activeMinimap) {

    activeMinimap = SidebarMinimap.mount(host);

    activeMinimap.attach();

  }



  return activeMinimap;

}



export function getSidebarMinimap(): SidebarMinimap | null {

  return activeMinimap;

}



export function destroySidebarMinimap(): void {

  activeMinimap?.detach();

  activeMinimap = null;

}


