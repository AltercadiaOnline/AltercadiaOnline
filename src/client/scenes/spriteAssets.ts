/** Troque o arquivo em public/assets/ — o caminho URL permanece o mesmo. */
export const PLAYER_WALK_SPRITE_SRC = '/assets/personagem_caminhando.png';

export function loadImageSprite(src: string): HTMLImageElement {
  const image = new Image();
  image.src = src;
  return image;
}
