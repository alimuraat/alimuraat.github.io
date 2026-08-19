/** Every backdrop scene, in the order they are offered in the lab. */
export const SCENES = [
  'corridor',
  'chords',
  'hyperbolic',
  'attractor',
  'harmonograph',
  'diffusion',
  'truchet',
  'guilloche',
  'geodesic',
  'chladni',
] as const;

export type Scene = (typeof SCENES)[number];
