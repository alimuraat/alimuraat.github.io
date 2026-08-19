/**
 * A small perspective camera, shared by the backdrop scenes.
 *
 * Scenes build their geometry once in world space and hand points to the
 * projector; what comes back carries the screen position, the distance, and
 * the scale factor at that distance, which is what lets a scene fade and thin
 * its line work with depth instead of drawing everything flat.
 */
export type Cam = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  /** Focal length in pixels: bigger is a longer lens, less perspective. */
  fov: number;
};

export type Pt = { x: number; y: number; z: number; s: number };

export function projector(W: number, H: number, ox = 0.5, oy = 0.5) {
  const cxp = W * ox;
  const cyp = H * oy;
  return (cam: Cam) => {
    const cy = Math.cos(cam.yaw);
    const sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch);
    const sp = Math.sin(cam.pitch);
    return (x: number, y: number, z: number): Pt | null => {
      const dx = x - cam.x;
      const dy = y - cam.y;
      const dz = z - cam.z;
      const X = dx * cy - dz * sy;
      let Z = dx * sy + dz * cy;
      const Y = dy * cp - Z * sp;
      Z = dy * sp + Z * cp;
      if (Z < 0.08) return null;
      const s = cam.fov / Z;
      return { x: cxp + X * s, y: cyp - Y * s, z: Z, s };
    };
  };
}

/** Rotate a world point about Y then X — for objects that spin in place. */
export function spin(
  x: number,
  y: number,
  z: number,
  ay: number,
  ax: number
): [number, number, number] {
  const c1 = Math.cos(ay);
  const s1 = Math.sin(ay);
  const x1 = x * c1 + z * s1;
  const z1 = -x * s1 + z * c1;
  const c2 = Math.cos(ax);
  const s2 = Math.sin(ax);
  return [x1, y * c2 - z1 * s2, y * s2 + z1 * c2];
}
