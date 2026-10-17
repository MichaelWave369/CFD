// CFD Raster Pocket v0.4: self-contained, finite image-to-byte experiment.
// Decoding receives pixel RGBA only. No side-channel addresses, payload or
// known elastic transform are passed into the reader.
import { checksum32, MAX_PAYLOAD_BYTES } from "./pocketField.mjs";

export const RASTER_GRID = 164;
export const RASTER_SCALE = 3;
export const RASTER_SIZE = RASTER_GRID * RASTER_SCALE; // 492 px
export const RASTER_MARGIN = 2;
export const RASTER_INTERIOR = RASTER_GRID - RASTER_MARGIN * 2; // 160 x 160
export const RASTER_MAX_BYTES = MAX_PAYLOAD_BYTES; // 1024 bytes
export const RASTER_HEADER_BYTES = 11; // magic(4), version(1), length(2), hash(4)
export const RASTER_BITS_PER_COPY = (RASTER_HEADER_BYTES + RASTER_MAX_BYTES) * 8; // 8280
export const RASTER_COPIES = 3;
const BRIGHT = [136, 241, 219];
const DARK = [18, 28, 47];
const MAGIC = [0x43, 0x46, 0x44, 0x50]; // CFDP
const VERSION = 1;
const FIDUCIALS = [
  [0, 0], [RASTER_GRID - 1, 0], [0, RASTER_GRID - 1], [RASTER_GRID - 1, RASTER_GRID - 1]
];
if (RASTER_BITS_PER_COPY * RASTER_COPIES > RASTER_INTERIOR ** 2) {
  throw new Error("Raster format exceeds its bounded module capacity");
}

function checkBytes(input) {
  if (!(input instanceof Uint8Array)) throw new TypeError("Expected Uint8Array payload");
  if (input.length > RASTER_MAX_BYTES) throw new RangeError("Raster payload exceeds 1,024 bytes");
  return input;
}

function getSlotPosition(slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= RASTER_INTERIOR ** 2) {
    throw new RangeError("Out-of-range raster slot");
  }
  return { mx: RASTER_MARGIN + slot % RASTER_INTERIOR,
    my: RASTER_MARGIN + Math.floor(slot / RASTER_INTERIOR) };
}

function setModule(frame, mx, my, isBright) {
  const color = isBright ? BRIGHT : DARK;
  const { data, width } = frame;
  for (let py = 0; py < RASTER_SCALE; py++) {
    for (let px = 0; px < RASTER_SCALE; px++) {
      const index = ((my * RASTER_SCALE + py) * width + mx * RASTER_SCALE + px) * 4;
      data[index] = color[0]; data[index + 1] = color[1]; data[index + 2] = color[2]; data[index + 3] = 255;
    }
  }
}

function getModule(frame, mx, my) {
  // Vote nine sampled pixels per cell; screenshot-friendly solid modules.
  let vote = 0;
  for (let py = 0; py < RASTER_SCALE; py++) {
    for (let px = 0; px < RASTER_SCALE; px++) {
      const at = ((my * RASTER_SCALE + py) * frame.width + mx * RASTER_SCALE + px) * 4;
      const lum = (frame.data[at] + frame.data[at + 1] + frame.data[at + 2]) / 3;
      vote += lum > 117 ? 1 : -1;
    }
  }
  return vote > 0 ? 1 : 0;
}

function packetBytes(payload) {
  const frame = new Uint8Array(RASTER_HEADER_BYTES + payload.length);
  frame.set(MAGIC, 0);
  frame[4] = VERSION;
  frame[5] = payload.length >>> 8;
  frame[6] = payload.length & 255;
  const digest = Number.parseInt(checksum32(payload), 16);
  for (let i = 0; i < 4; i++) frame[7 + i] = (digest >>> ((3 - i) * 8)) & 255;
  frame.set(payload, RASTER_HEADER_BYTES);
  return frame;
}

export function makeRasterPocketImage(payload) {
  checkBytes(payload);
  const frame = { width: RASTER_SIZE, height: RASTER_SIZE,
    data: new Uint8ClampedArray(RASTER_SIZE * RASTER_SIZE * 4) };
  // Default every module to DARK, including unused module slots.
  for (let my = 0; my < RASTER_GRID; my++) {
    for (let mx = 0; mx < RASTER_GRID; mx++) setModule(frame, mx, my, false);
  }
  // Four orientation markers. These detect obvious mirroring/rotation but
  // do not perform camera perspective correction.
  FIDUCIALS.forEach(([mx, my], i) => setModule(frame, mx, my, i !== 2));
  const packet = packetBytes(payload);
  const totalBits = packet.length * 8;
  for (let bit = 0; bit < totalBits; bit++) {
    const isBright = !!(packet[bit >>> 3] & (128 >>> (bit & 7)));
    for (let copy = 0; copy < RASTER_COPIES; copy++) {
      const { mx, my } = getSlotPosition(copy * RASTER_BITS_PER_COPY + bit);
      setModule(frame, mx, my, isBright);
    }
  }
  return frame;
}

function validFrame(frame) {
  return !!frame && frame.width === RASTER_SIZE && frame.height === RASTER_SIZE &&
    frame.data && frame.data.length === RASTER_SIZE * RASTER_SIZE * 4;
}

function decodeFailure(reason, disagreements = 0) {
  return { passed: false, reason, bytes: null, length: 0, checksum: null, disagreements };
}

export function decodeRasterPocketImage(frame) {
  if (!validFrame(frame)) return decodeFailure("DIMENSION_ERROR: expected 492x492 RGBA frame");
  const markers = FIDUCIALS.map(([mx, my]) => getModule(frame, mx, my));
  if (markers.some((value, i) => value !== (i === 2 ? 0 : 1))) {
    return decodeFailure("FRAME_ERROR: finder orientation differs");
  }
  let disagreements = 0;
  function readBit(bitIndex) {
    let votes = 0;
    for (let copy = 0; copy < RASTER_COPIES; copy++) {
      const { mx, my } = getSlotPosition(copy * RASTER_BITS_PER_COPY + bitIndex);
      votes += getModule(frame, mx, my);
    }
    if (votes !== 0 && votes !== RASTER_COPIES) disagreements++;
    return votes >= 2 ? 1 : 0;
  }
  function readBytes(count) {
    const bytes = new Uint8Array(count);
    for (let i = 0; i < count * 8; i++) bytes[i >>> 3] |= readBit(i) << (7 - (i & 7));
    return bytes;
  }
  const header = readBytes(RASTER_HEADER_BYTES);
  if (MAGIC.some((byte, i) => header[i] !== byte) || header[4] !== VERSION) {
    return decodeFailure("HEADER_ERROR: signature or version mismatch", disagreements);
  }
  const length = header[5] * 256 + header[6];
  if (length > RASTER_MAX_BYTES) return decodeFailure("LENGTH_ERROR: exceeds finite frame", disagreements);
  const all = readBytes(RASTER_HEADER_BYTES + length);
  const bytes = all.slice(RASTER_HEADER_BYTES);
  const expected = Array.from(header.slice(7, 11), byte => byte.toString(16).padStart(2, "0")).join("");
  const found = checksum32(bytes);
  if (found !== expected) return { ...decodeFailure("CHECKSUM_MISMATCH: recovered bytes differ", disagreements),
    length, checksum: found, expected };
  return { passed: true, reason: "EXACT_RASTER_RECOVERY", bytes,
    length, checksum: found, expected, disagreements, provenance: "SIMULATED_OR_USER_SUPPLIED" };
}

export function damageRasterPixels(frame, probability = 0.12, seed = 369) {
  if (!validFrame(frame)) throw new RangeError("Invalid frame");
  if (!(Number.isFinite(probability) && probability >= 0 && probability <= 1)) {
    throw new RangeError("Probability must be 0..1");
  }
  const result = { width: frame.width, height: frame.height, data: new Uint8ClampedArray(frame.data) };
  let s = seed >>> 0;
  // Salt-and-pepper RGB pixel flips, deterministic and reproducible.
  for (let i = 0; i < result.data.length; i += 4) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    if (s / 4294967296 < probability) {
      const bright = (result.data[i] + result.data[i + 1] + result.data[i + 2]) / 3 > 117;
      const color = bright ? DARK : BRIGHT;
      result.data[i] = color[0]; result.data[i + 1] = color[1]; result.data[i + 2] = color[2];
    }
  }
  return result;
}

export function damageRasterReplicas(frame, copies = 1) {
  if (!validFrame(frame)) throw new RangeError("Invalid frame");
  if (![1, 2].includes(copies)) throw new RangeError("Must damage one or two replica bands");
  const result = { width: frame.width, height: frame.height, data: new Uint8ClampedArray(frame.data) };
  for (let copy = 0; copy < copies; copy++) {
    for (let bit = 0; bit < RASTER_BITS_PER_COPY; bit++) {
      const { mx, my } = getSlotPosition(copy * RASTER_BITS_PER_COPY + bit);
      setModule(result, mx, my, !getModule(result, mx, my));
    }
  }
  return result;
}
