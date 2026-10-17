// CFD v0.5 optical recovery from an unknown affine raster transformation.
// Decoder sees ONLY a 900x900 RGBA image, not the payload, transform or original.
// Colored positional fiducials form an independently detectable carrier.
// This tests rotation/shear/scale/translation, NOT nonlinear elastic distortion.
import { RASTER_SIZE, makeRasterPocketImage, decodeRasterPocketImage } from "./rasterPocket.mjs";

export const CARRIER_SIZE = 700;
export const OPTICAL_SIZE = 900;
export const IMAGE_OFFSET = (CARRIER_SIZE - RASTER_SIZE) / 2; // 104 px
export const MARKER_RADIUS = 14;
export const MARKERS = Object.freeze([
  { id: "TL", x: 52, y: 52, color: [255, 34, 50] },
  { id: "TR", x: 648, y: 52, color: [30, 255, 55] },
  { id: "BL", x: 52, y: 648, color: [255, 232, 28] },
  { id: "BR", x: 648, y: 648, color: [226, 38, 255] }
]);
const BACK = [6, 12, 24];
const BRIGHT = [136, 241, 219];
const DARK = [18, 28, 47];
const CHANNELS = 4;

function createFrame(size, fill = BACK) {
  if (!Number.isInteger(size) || size < 1) throw new RangeError("Invalid frame size");
  const data = new Uint8ClampedArray(size * size * CHANNELS);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = 255;
  }
  return { width: size, height: size, data };
}
function setColor(frame, x, y, color) {
  if (x < 0 || x >= frame.width || y < 0 || y >= frame.height) return;
  const index = (y * frame.width + x) * 4;
  frame.data[index] = color[0]; frame.data[index + 1] = color[1]; frame.data[index + 2] = color[2]; frame.data[index + 3] = 255;
}
function getColor(frame, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= frame.width || y < 0 || y >= frame.height) return BACK;
  const index = (y * frame.width + x) * 4;
  return [frame.data[index], frame.data[index + 1], frame.data[index + 2]];
}
function checkFrame(frame, size) {
  return !!frame && frame.width === size && frame.height === size &&
    frame.data && frame.data.length === size * size * 4;
}

export function makeOpticalCarrier(payload) {
  const raster = makeRasterPocketImage(payload);
  const carrier = createFrame(CARRIER_SIZE);
  for (let y = 0; y < RASTER_SIZE; y++) {
    for (let x = 0; x < RASTER_SIZE; x++) {
      const i = (y * RASTER_SIZE + x) * 4;
      setColor(carrier, IMAGE_OFFSET + x, IMAGE_OFFSET + y,
        [raster.data[i], raster.data[i + 1], raster.data[i + 2]]);
    }
  }
  for (const marker of MARKERS) {
    for (let dy = -MARKER_RADIUS; dy <= MARKER_RADIUS; dy++) {
      for (let dx = -MARKER_RADIUS; dx <= MARKER_RADIUS; dx++) {
        if (dx * dx + dy * dy <= MARKER_RADIUS ** 2) {
          setColor(carrier, marker.x + dx, marker.y + dy, marker.color);
        }
      }
    }
  }
  return carrier;
}

function finiteRange(value, min, max, name) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(name + " outside safe range");
  return value;
}
export function affineParameters({ angle = 0, shear = 0, scale = 0.93, offsetX = 0, offsetY = 0 } = {}) {
  finiteRange(angle, -15, 15, "angle");
  finiteRange(shear, -0.16, 0.16, "shear");
  finiteRange(scale, 0.85, 1.0, "scale");
  finiteRange(offsetX, -12, 12, "offsetX");
  finiteRange(offsetY, -12, 12, "offsetY");
  const theta = angle * Math.PI / 180, c = Math.cos(theta), s = Math.sin(theta);
  // Rotate after a horizontal shear, both uniformly scaled.
  const a = scale * c, b = scale * (c * shear - s);
  const d = scale * s, e = scale * (s * shear + c);
  return { a, b, d, e, tx: 450 + offsetX - 350 * (a + b),
    ty: 450 + offsetY - 350 * (d + e) };
}
function projected(affine, x, y) {
  return { x: affine.a * x + affine.b * y + affine.tx,
    y: affine.d * x + affine.e * y + affine.ty };
}
export function warpOpticalCarrier(carrier, settings = {}) {
  if (!checkFrame(carrier, CARRIER_SIZE)) throw new RangeError("Expected 700x700 carrier");
  const m = affineParameters(settings);
  const det = m.a * m.e - m.b * m.d;
  if (Math.abs(det) < 1e-9) throw new RangeError("Singular affine transform");
  const output = createFrame(OPTICAL_SIZE);
  // Inverse sample: no holes caused by forward scattered pixels.
  for (let y = 0; y < OPTICAL_SIZE; y++) {
    for (let x = 0; x < OPTICAL_SIZE; x++) {
      const dx = x - m.tx, dy = y - m.ty;
      const sx = (m.e * dx - m.b * dy) / det;
      const sy = (-m.d * dx + m.a * dy) / det;
      const sourceX = Math.round(sx), sourceY = Math.round(sy);
      if (sourceX < 0 || sourceY < 0 || sourceX >= CARRIER_SIZE || sourceY >= CARRIER_SIZE) continue;
      const source = (sourceY * CARRIER_SIZE + sourceX) * 4;
      const target = (y * OPTICAL_SIZE + x) * 4;
      output.data[target] = carrier.data[source];
      output.data[target + 1] = carrier.data[source + 1];
      output.data[target + 2] = carrier.data[source + 2];
    }
  }
  return output;
}

function isMarkerPixel(color, id) {
  const [r,g,b] = color;
  if (id === "TL") return r > 210 && g < 100 && b < 120;
  if (id === "TR") return g > 200 && r < 100 && b < 130;
  if (id === "BL") return r > 200 && g > 170 && b < 100;
  return r > 170 && b > 195 && g < 125;
}

// Detect unique colored markers by scanning all pixels. No location, distortion,
// angle, affine matrix, or original-carrier pixels are sent to this function.
export function locateOpticalMarkers(frame) {
  if (!checkFrame(frame, OPTICAL_SIZE)) throw new RangeError("Expected 900x900 RGBA");
  const slots = Object.fromEntries(MARKERS.map(m => [m.id, { n: 0, x: 0, y: 0 }]));
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const i = (y * frame.width + x) * 4;
      const color = [frame.data[i], frame.data[i + 1], frame.data[i + 2]];
      for (const marker of MARKERS) {
        if (isMarkerPixel(color, marker.id)) {
          const slot = slots[marker.id]; slot.n++; slot.x += x; slot.y += y;
          break;
        }
      }
    }
  }
  if (Object.values(slots).some(slot => slot.n < 100 || slot.n > 1500)) {
    throw new Error("MARKER_ERROR: missing or implausible registration marker");
  }
  return Object.fromEntries(Object.entries(slots).map(([id, slot]) =>
    [id, { x: slot.x / slot.n, y: slot.y / slot.n, count: slot.n }]));
}

export function calibrateOpticalImage(frame) {
  const markers = locateOpticalMarkers(frame);
  const tl = markers.TL, tr = markers.TR, bl = markers.BL, br = markers.BR;
  const side = MARKERS[1].x - MARKERS[0].x; // 596 source pixels
  const a = (tr.x - tl.x) / side, d = (tr.y - tl.y) / side;
  const b = (bl.x - tl.x) / side, e = (bl.y - tl.y) / side;
  const tx = tl.x - (a * MARKERS[0].x + b * MARKERS[0].y);
  const ty = tl.y - (d * MARKERS[0].x + e * MARKERS[0].y);
  const estimated = { a, b, d, e, tx, ty };
  const predicted = projected(estimated, MARKERS[3].x, MARKERS[3].y);
  const markerError = Math.hypot(predicted.x - br.x, predicted.y - br.y);
  const determinant = a * e - b * d;
  if (!Number.isFinite(determinant) || determinant < 0.4 || determinant > 1.3 ||
      markerError > 2.5) {
    throw new Error("CALIBRATION_ERROR: fiducial geometry inconsistent");
  }
  return { transform: estimated, markerError, markers, determinant };
}

function sampleColor(frame, x, y) {
  return getColor(frame, Math.round(x), Math.round(y));
}
function isBright(color) {
  return (color[0] + color[1] + color[2]) / 3 > 117;
}

// Rebuild one crisp 3x3 module at a time using pixels of the distorted image.
// Eight sampling offsets vote around the projected source-module center.
function reconstructRaster(frame, transform) {
  const raster = createFrame(RASTER_SIZE, DARK);
  const sizeInModules = RASTER_SIZE / 3;
  const offsets = [[0,0],[-0.6,0],[0.6,0],[0,-0.6],[0,0.6],
    [-0.5,-0.5],[0.5,-0.5],[-0.5,0.5],[0.5,0.5]];
  for (let my = 0; my < sizeInModules; my++) {
    for (let mx = 0; mx < sizeInModules; mx++) {
      const x = IMAGE_OFFSET + mx * 3 + 1, y = IMAGE_OFFSET + my * 3 + 1;
      let count = 0;
      for (const [dx,dy] of offsets) {
        const p = projected(transform, x + dx, y + dy);
        count += isBright(sampleColor(frame, p.x, p.y)) ? 1 : 0;
      }
      const color = count >= 5 ? BRIGHT : DARK;
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
        setColor(raster, mx * 3 + i, my * 3 + j, color);
      }
    }
  }
  return raster;
}

export function decodeOpticalImage(frame) {
  if (!checkFrame(frame, OPTICAL_SIZE)) return {
    passed: false, reason: "DIMENSION_ERROR: expected 900x900 RGBA",
    bytes: null, markerError: null
  };
  try {
    const calibration = calibrateOpticalImage(frame);
    const reconstructed = reconstructRaster(frame, calibration.transform);
    const result = decodeRasterPocketImage(reconstructed);
    return { ...result, markerError: calibration.markerError,
      determinant: calibration.determinant, markerCounts: Object.fromEntries(
        Object.entries(calibration.markers).map(([id, point]) => [id, point.count])),
      method: "UNSUPERVISED_AFFINE_FIDUCIAL_ALIGNMENT" };
  } catch (error) {
    return { passed: false, reason: error.message, bytes: null, markerError: null };
  }
}
