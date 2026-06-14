import {
  NpcHumanoidAccessory,
  resolveNpcHumanoidAppearance,
} from '../../shared/world/npcHumanoidAppearance.js';

export type NpcHumanoidElementOptions = {
  readonly sprite: string;
  readonly featured?: boolean;
  readonly scale?: number;
};

/**
 * Silhueta humanóide em DOM/CSS — mesma hierarquia visual do renderer canvas.
 * Agrupa cabeça, tronco, membros e adereços em um único container pai.
 */
export function createNpcHumanoidElement(options: NpcHumanoidElementOptions): HTMLElement {
  const palette = resolveNpcHumanoidAppearance(options.sprite);
  const scale = options.scale ?? 1;

  const root = document.createElement('div');
  root.className = 'npc-humanoid';
  root.style.setProperty('--npc-body', palette.body);
  root.style.setProperty('--npc-face', palette.face);
  root.style.setProperty('--npc-accent', palette.accent);
  root.style.setProperty('--npc-limb', palette.limb);
  if (scale !== 1) {
    root.style.setProperty('--npc-scale', String(scale));
  }

  const figure = document.createElement('div');
  figure.className = 'npc-humanoid__figure';
  figure.setAttribute('aria-hidden', 'true');

  const shadow = document.createElement('div');
  shadow.className = 'npc-humanoid__shadow';

  const head = document.createElement('div');
  head.className = 'npc-humanoid__head';

  const face = document.createElement('div');
  face.className = 'npc-humanoid__face';
  head.append(face);

  for (const accessory of palette.accessories) {
    head.append(createAccessoryElement(accessory));
  }

  const torso = document.createElement('div');
  torso.className = 'npc-humanoid__torso';

  if (palette.accessories.includes(NpcHumanoidAccessory.APRON)) {
    torso.append(createAccessoryElement(NpcHumanoidAccessory.APRON));
  }

  const armLeft = document.createElement('div');
  armLeft.className = 'npc-humanoid__arm npc-humanoid__arm--left';

  const armRight = document.createElement('div');
  armRight.className = 'npc-humanoid__arm npc-humanoid__arm--right';

  const legLeft = document.createElement('div');
  legLeft.className = 'npc-humanoid__leg npc-humanoid__leg--left';

  const legRight = document.createElement('div');
  legRight.className = 'npc-humanoid__leg npc-humanoid__leg--right';

  figure.append(legLeft, legRight, armLeft, armRight, torso, head);
  root.append(shadow, figure);

  if (options.featured) {
    const star = document.createElement('span');
    star.className = 'npc-humanoid__star';
    star.textContent = '★';
    star.setAttribute('aria-hidden', 'true');
    root.append(star);
  }

  return root;
}

function createAccessoryElement(accessory: NpcHumanoidAccessory): HTMLElement {
  const el = document.createElement('div');
  switch (accessory) {
    case NpcHumanoidAccessory.GLASSES:
      el.className = 'npc-humanoid__glasses';
      break;
    case NpcHumanoidAccessory.HAT:
      el.className = 'npc-humanoid__hat';
      el.innerHTML = '<span class="npc-humanoid__hat-brim"></span><span class="npc-humanoid__hat-crown"></span>';
      break;
    case NpcHumanoidAccessory.HOOD:
      el.className = 'npc-humanoid__hood';
      break;
    case NpcHumanoidAccessory.APRON:
      el.className = 'npc-humanoid__apron';
      break;
    case NpcHumanoidAccessory.BANDANA:
      el.className = 'npc-humanoid__bandana';
      break;
    case NpcHumanoidAccessory.VISOR:
      el.className = 'npc-humanoid__visor';
      break;
    default:
      el.className = 'npc-humanoid__accessory';
      break;
  }
  return el;
}
