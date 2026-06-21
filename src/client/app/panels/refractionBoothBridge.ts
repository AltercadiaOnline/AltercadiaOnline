import { tryOpenReactWorldPanel } from './initWorldPanelsBridge.js';

let pendingNpcStart = false;

export function requestReactRefractionNpcStart(): boolean {
  pendingNpcStart = true;
  return tryOpenReactWorldPanel('refractionBooth', {
    kind: 'refractionBooth',
    objectId: 'refraction_booth',
    label: 'Estande de Refração',
  });
}

export function consumeReactRefractionNpcStart(): boolean {
  if (!pendingNpcStart) return false;
  pendingNpcStart = false;
  return true;
}
