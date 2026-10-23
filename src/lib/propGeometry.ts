import type {StagePoint, StagePropGeometry} from './types';

export const propScale = (kind: string) => kind === 'basket' ? 1.45 : 1.3;
const round: Record<string, readonly [number, number, number?]> = {
  ball: [41, 41], cookie: [40, 40], apple: [44, 42], strawberry: [42, 40],
  flower: [38, 38], seed: [28, 20, 18], heart: [43, 38], leaf: [43, 36],
};
const boxes: Record<string, readonly [number, number]> = {
  basket: [48, 40], parcel: [43, 38], glasses: [48, 17], crown: [45, 38],
  boat: [48, 38], castle: [43, 38], snowman: [30, 47], kite: [34, 42],
};

/** Intersect the actor-facing ray with the artwork footprint, in world pixels.
 * The prop center stays fixed; rotating a book/parcel rotates its contact too. */
export function propSurfaceContact(center: StagePoint, actor: StagePoint, object: StagePropGeometry): StagePoint {
  const size = Math.max(.05, object.size ?? propScale(object.kind));
  const ellipse = round[object.kind];
  const bounds = object.kind === 'book' ? [22 + 23 * Math.max(0, Math.min(1, object.openProgress ?? 1)), 38]
    : ellipse ?? boxes[object.kind] ?? [48, 36];
  const angle = (object.rotation ?? 0) * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  const offset = (ellipse?.[2] ?? 0) * size;
  const origin = {x:center.x - offset * s,y:center.y + offset * c};
  const dx = actor.x - origin.x, dy = actor.y - origin.y;
  let x = (dx * c + dy * s) || (dy === 0 ? -1 : 0), y = -dx * s + dy * c;
  const rx = bounds[0] * size, ry = bounds[1] * size;
  const distance = ellipse ? Math.hypot(x / rx, y / ry) : Math.max(Math.abs(x) / rx, Math.abs(y) / ry);
  x /= distance; y /= distance;
  return {x: origin.x + x * c - y * s, y: origin.y + x * s + y * c};
}
