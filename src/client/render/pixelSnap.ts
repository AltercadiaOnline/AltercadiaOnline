/**
 * Integer snap — evita subpixels que geram blur em pixel art.
 * Integer snap para drawImage 1:1 (minimapa, painéis React, texturas Phaser offscreen).
 */
export function snapToPixel(value: number): number {
  return Math.floor(value);
}

export function snapDrawImageDest(
  x: number,
  y: number,
  width: number,
  height: number,
): { readonly dx: number; readonly dy: number; readonly dWidth: number; readonly dHeight: number } {
  return {
    dx: snapToPixel(x),
    dy: snapToPixel(y),
    dWidth: snapToPixel(width),
    dHeight: snapToPixel(height),
  };
}

type DrawImageArgs =
  | [image: CanvasImageSource, dx: number, dy: number]
  | [image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number]
  | [
      image: CanvasImageSource,
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      dx: number,
      dy: number,
      dw: number,
      dh: number,
    ];

function snapDrawImageArgs(args: DrawImageArgs): DrawImageArgs {
  if (args.length === 3) {
    const [image, dx, dy] = args;
    return [image, snapToPixel(dx), snapToPixel(dy)];
  }
  if (args.length === 5) {
    const [image, dx, dy, dw, dh] = args;
    return [image, snapToPixel(dx), snapToPixel(dy), snapToPixel(dw), snapToPixel(dh)];
  }
  const [image, sx, sy, sw, sh, dx, dy, dw, dh] = args;
  return [
    image,
    snapToPixel(sx),
    snapToPixel(sy),
    snapToPixel(sw),
    snapToPixel(sh),
    snapToPixel(dx),
    snapToPixel(dy),
    snapToPixel(dw),
    snapToPixel(dh),
  ];
}

/** Contexto com snap em drawImage/fillRect/strokeRect — legado offscreen canvas. */
export function wrapPixelSnappedContext(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
  return new Proxy(ctx, {
    get(target, prop, receiver) {
      if (prop === 'drawImage') {
        return (...args: DrawImageArgs) => {
          const snapped = snapDrawImageArgs(args);
          return (target.drawImage as (...a: DrawImageArgs) => void)(...snapped);
        };
      }
      if (prop === 'fillRect') {
        return (x: number, y: number, w: number, h: number) =>
          target.fillRect(snapToPixel(x), snapToPixel(y), snapToPixel(w), snapToPixel(h));
      }
      if (prop === 'strokeRect') {
        return (x: number, y: number, w: number, h: number) =>
          target.strokeRect(snapToPixel(x), snapToPixel(y), snapToPixel(w), snapToPixel(h));
      }
      if (prop === 'clearRect') {
        return (x: number, y: number, w: number, h: number) =>
          target.clearRect(snapToPixel(x), snapToPixel(y), snapToPixel(w), snapToPixel(h));
      }
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    },
    set(target, prop, value) {
      // Setters nativos do CanvasRenderingContext2D exigem `this` === ctx real.
      return Reflect.set(target, prop, value, target);
    },
  });
}
