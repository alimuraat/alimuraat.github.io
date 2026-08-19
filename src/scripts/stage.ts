/**
 * Shared harness for every backdrop scene.
 *
 * A scene is a setup function that receives the drawing context and returns a
 * frame function. The harness owns everything a scene should not have to think
 * about: device pixel ratio, resize, pausing while the tab is hidden, reduced
 * motion, and pointer tracking.
 *
 * The setup function is re-run on resize, so scenes can lay themselves out
 * against W and H once instead of recomputing every frame.
 */
export type Ptr = {
  x: number;
  y: number;
  /** False until the visitor actually moves a pointer — scenes fall back to
   *  driving themselves so nothing looks dead on a phone. */
  seen: boolean;
  /** Frames since the last pointer movement. */
  idle: number;
  rings: { x: number; y: number; t: number }[];
};

export type Kit = {
  c: CanvasRenderingContext2D;
  W: number;
  H: number;
  /** False under prefers-reduced-motion: draw one composed frame, never move. */
  anim: boolean;
  ptr: Ptr;
  rand: (a: number, b: number) => number;
  /** 'r,g,b' for the signal red, ready for rgba(). */
  RED: string;
  mono: (px: number) => string;
};

const RED = '255,51,68';
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const mono = (px: number) => `${px}px "JetBrains Mono", ui-monospace, monospace`;

export function stage(setup: (kit: Kit) => () => void): void {
  const canvas = document.getElementById('net') as HTMLCanvasElement | null;
  const c = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !c) return;

  const anim = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ptr: Ptr = { x: 0, y: 0, seen: false, idle: 0, rings: [] };
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
    frame = setup({ c, W, H, anim, ptr, rand, RED, mono });
  };

  const paint = () => {
    c.clearRect(0, 0, W, H);
    frame();
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

/** Expanding rings from clicks, shared by the scenes that want them. */
export function drawClickRings(k: Kit): void {
  const { c, ptr, anim, RED: R } = k;
  c.lineWidth = 1;
  for (let i = ptr.rings.length - 1; i >= 0; i--) {
    const r = ptr.rings[i];
    if (anim) r.t += 0.02;
    if (r.t >= 1) {
      ptr.rings.splice(i, 1);
      continue;
    }
    c.strokeStyle = `rgba(${R},${((1 - r.t) * 0.45).toFixed(3)})`;
    c.beginPath();
    c.arc(r.x, r.y, r.t * 260, 0, 6.2832);
    c.stroke();
  }
}
