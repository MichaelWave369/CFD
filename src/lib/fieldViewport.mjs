// Pure viewport math. A zoom changes which part of one persistent coordinate field is sampled.
// A mode alters motion, not the identity of an independently created scene.
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 16;
export const MAX_DOT_RESOLUTION = 1536;
export const MIN_DOT_RESOLUTION = 256;

export const MODE_IDS = Object.freeze(["origin", "drift", "lattice", "vortex", "nested"]);

export function clampZoom(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

// The density is a *virtual sampling lattice* per field axis, not a literal GPU buffer.
export function virtualDotCount(resolution) {
  const r = Math.max(MIN_DOT_RESOLUTION, Math.min(MAX_DOT_RESOLUTION, Math.round(Number(resolution) || MIN_DOT_RESOLUTION)));
  return r * r;
}

export function viewportToWorld(x, y, zoom) {
  const z = clampZoom(zoom);
  return { x: (x * 2 - 1) / z, y: (y * 2 - 1) / z };
}

export function worldToViewport(x, y, zoom) {
  const z = clampZoom(zoom);
  return { x: (x * z + 1) / 2, y: (y * z + 1) / 2 };
}

export function modeIndex(id) {
  return Math.max(0, MODE_IDS.indexOf(id));
}

/**
 * Fullscreen control's discrete magnification step (one octave).
 * This deliberately changes only the camera zoom, never particle addresses,
 * density, seed, or logical field-space identity.
 */
export function stepFieldZoom(current, direction) {
  if (direction !== 1 && direction !== -1) {
    throw new RangeError("Zoom direction must be +1 or -1");
  }
  const safe = clampZoom(current);
  return clampZoom(safe * (direction > 0 ? 2 : 0.5));
}
