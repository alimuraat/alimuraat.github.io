/**
 * Shared harness for every backdrop scene.
 *
 * A scene is a setup function that receives the drawing kit and returns a frame
 * function. The harness owns device pixel ratio, resize, pausing while the tab
 * is hidden, reduced motion, pointer tracking — and the two things that make
 * the scenes glow rather than just draw:
 *
 *   additive — every stroke adds light instead of covering what is under it,
 *              so overlapping strokes bloom into a bright core
 *   trail    — instead of clearing, the frame is faded toward transparent with
 *              a destination-out fill, which leaves motion trails while
 *              keeping the canvas transparent over the layers behind it
 */
export type Ptr = {
  x: number;
  y: number;
  /** False until the visitor moves a pointer — scenes drive themselves. */
  seen: boolean;
  idle: number;
  rings: { x: number; y: number; t: number }[];
  /** Set on pointerdown, cleared by whoever consumes it. */
  hit: { x: number; y: number } | null;
};

export type Kit = {
  c: CanvasRenderingContext2D;
  W: number;
  H: number;
  anim: boolean;
  ptr: Ptr;
  rand: (a: number, b: number) => number;
  RED: string;
  mono: (px: number) => string;
  /** Pre-rendered radial glow, blitted per particle — far cheaper than a
   *  gradient per draw and the only way to afford thousands of them. */
  glow: (px: number, rgb?: string, peak?: number) => HTMLCanvasElement;
};

type Opts = { trail?: number; additive?: boolean };

const RED = '255,51,68';
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const mono = (px: number) => `${px}px "JetBrains Mono", ui-monospace, monospace`;

const cache = new Map<string, HTMLCanvasElement>();
function glow(px: number, rgb = RED, peak = 1): HTMLCanvasElement {
  const key = `${px}|${rgb}|${peak}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = document.createElement('canvas');
  s.width = px * 2;
  s.height = px * 2;
  const g = s.getContext('2d')!;
  const grd = g.createRadialGradient(px, px, 0, px, px, px);
  grd.addColorStop(0, `rgba(${rgb},${peak})`);
  grd.addColorStop(0.25, `rgba(${rgb},${peak * 0.45})`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, px * 2, px * 2);
  cache.set(key, s);
  return s;
}

export function stage(setup: (kit: Kit) => () => void, opts: Opts = {}): void {
  const canvas = document.getElementById('net') as HTMLCanvasElement | null;
  const c = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !c) return;

  const anim = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const trail = anim ? (opts.trail ?? 0) : 0;
  const additive = opts.additive !== false;

  const ptr: Ptr = { x: 0, y: 0, seen: false, idle: 0, rings: [], hit: null };
  const track = (e: PointerEvent) => {
    ptr.x = e.clientX;
    ptr.y = e.clientY;
    ptr.seen = true;
    ptr.idle = 0;
  };
  addEventListener('pointermove', track, { passive: true });
  addEventListener(
    'pointerdown',
    (e) => {
      track(e);
      ptr.hit = { x: e.clientX, y: e.clientY };
      if (ptr.rings.length < 4) ptr.rings.push({ x: e.clientX, y: e.clientY, t: 0 });
    },
    { passive: true }
  );

  let W = 0;
  let H = 0;
  let frame: () => void = () => {};
  let raf: number | null = null;

  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const build = () => {
    frame = setup({ c, W, H, anim, ptr, rand, RED, mono, glow });
  };

  const paint = () => {
    if (trail) {
      /* Fade what is already there toward transparent rather than painting
         over it, so the glow layers behind the canvas keep showing through. */
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = `rgba(0,0,0,${trail})`;
      c.fillRect(0, 0, W, H);
    } else {
      c.clearRect(0, 0, W, H);
    }
    c.globalCompositeOperation = additive ? 'lighter' : 'source-over';
    frame();
    c.globalCompositeOperation = 'source-over';
  };

  const loop = () => {
    paint();
    raf = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };
  const start = () => {
    if (raf === null && anim) raf = requestAnimationFrame(loop);
  };

  size();
  build();
  if (anim) start();
  else paint();

  let t: ReturnType<typeof setTimeout>;
  addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      size();
      build();
      if (!anim) paint();
    }, 180);
  });

  /* A page that loads in a background tab can be measured at 0x0. Re-check the
     size on the way back to visible so the canvas is never left blank. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
      return;
    }
    if (W !== innerWidth || H !== innerHeight) {
      size();
      build();
      if (!anim) paint();
    }
    start();
  });
}
