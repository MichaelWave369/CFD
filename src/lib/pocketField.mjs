// CFD Pocket Field Lab · deterministic, explicitly synthetic research primitives.
// Logical pockets are finite quadtree addresses, not physically infinite storage.
export const POCKET_DEPTH = 6;
export const MAX_PAYLOAD_BYTES = 1024;
export const PATTERN_FAMILIES = Object.freeze(["hybrid", "rings", "columns", "mandelbrot"]);
export const POCKET_PROVENANCE = "SIMULATED";

export function depthCapacity(depth) {
  if (!Number.isInteger(depth) || depth < 1 || depth > 10) throw new RangeError("Depth must be an integer from 1 to 10");
  return 4 ** depth;
}

export function addressForIndex(index, depth = POCKET_DEPTH) {
  if (!Number.isInteger(index) || index < 0 || index >= depthCapacity(depth)) throw new RangeError("Index out of bounds");
  return index.toString(4).padStart(depth, "0");
}

export function boundsForAddress(address = "") {
  if (typeof address !== "string" || !/^[0123]*$/.test(address) || address.length > 10) {
    throw new RangeError("Invalid pocket address");
  }
  let x = 0, y = 0, size = 1;
  for (const digit of address) {
    size /= 2;
    const q = Number(digit);
    if (q & 1) x += size;
    if (q & 2) y += size;
  }
  return { x, y, size };
}

export function centerForAddress(address) {
  const { x, y, size } = boundsForAddress(address);
  return { x: x + size / 2, y: y + size / 2 };
}

export function addressForPoint(x, y, depth = POCKET_DEPTH) {
  depthCapacity(depth);
  if (![x, y].every(Number.isFinite) || x < 0 || y < 0 || x >= 1 || y >= 1) {
    throw new RangeError("Point outside unit square");
  }
  let address = "";
  for (let i = 0; i < depth; i++) {
    x *= 2; y *= 2;
    const right = x >= 1 ? 1 : 0, down = y >= 1 ? 1 : 0;
    address += String(right + 2 * down);
    x -= right; y -= down;
  }
  return address;
}

export function addressForLocalPoint(x, y, parent = "") {
  if (parent.length >= 10) throw new RangeError("Maximum nesting depth");
  return parent + addressForPoint(x, y, 1);
}

function finiteStrength(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
const TAU = Math.PI * 2;

// Two sequential analytic shears plus a rotation. The inverse recovers the
// original point without raster sampling, even when displayed outside the square.
export function warpPoint(x, y, elasticity = 0, diamond = 0) {
  const angle = finiteStrength(diamond) * Math.PI / 4;
  const c = Math.cos(angle), s = Math.sin(angle);
  const dx = x - 0.5, dy = y - 0.5;
  const rx = 0.5 + dx * c - dy * s;
  const ry = 0.5 + dx * s + dy * c;
  const a = finiteStrength(elasticity) * 0.15;
  const u = rx + a * Math.sin(TAU * ry);
  return { x: u, y: ry + a * Math.sin(TAU * u) };
}

export function unwarpPoint(x, y, elasticity = 0, diamond = 0) {
  const a = finiteStrength(elasticity) * 0.15;
  const ry = y - a * Math.sin(TAU * x);
  const rx = x - a * Math.sin(TAU * ry);
  const angle = finiteStrength(diamond) * Math.PI / 4;
  const c = Math.cos(angle), s = Math.sin(angle);
  const dx = rx - 0.5, dy = ry - 0.5;
  return { x: 0.5 + dx * c + dy * s, y: 0.5 - dx * s + dy * c };
}

// FNV-1a32 detects accidental corruption; it is not cryptographic evidence.
export function checksum32(bytes) {
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function encodePocketBytes(source, depth = POCKET_DEPTH) {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  if (bytes.length > MAX_PAYLOAD_BYTES || bytes.length > depthCapacity(depth)) {
    throw new RangeError("Payload exceeds 1,024 bytes or current address capacity");
  }
  return {
    depth, length: bytes.length, checksum: checksum32(bytes),
    cells: Array.from(bytes, (byte, index) => ({ address: addressForIndex(index, depth), byte }))
  };
}

// Genuine address recovery after a reversible continuous geometric transform.
// Not optical decoding: center coordinates and transform parameters are known.
export function recoverPocketBytes(packet, elasticity = 0, diamond = 0) {
  if (!packet || !Array.isArray(packet.cells)) throw new TypeError("Invalid packet");
  depthCapacity(packet.depth);
  if (!Number.isInteger(packet.length) || packet.length < 0 || packet.length > MAX_PAYLOAD_BYTES ||
      packet.length > depthCapacity(packet.depth) || packet.cells.length !== packet.length) {
    throw new RangeError("Invalid packet length");
  }
  const recovered = new Map();
  for (const cell of packet.cells) {
    if (!Number.isInteger(cell.byte) || cell.byte < 0 || cell.byte > 255) throw new RangeError("Invalid byte");
    const original = centerForAddress(cell.address);
    const projected = warpPoint(original.x, original.y, elasticity, diamond);
    const restored = unwarpPoint(projected.x, projected.y, elasticity, diamond);
    const address = addressForPoint(restored.x, restored.y, packet.depth);
    if (recovered.has(address)) throw new Error("Pocket address collision");
    recovered.set(address, cell.byte);
  }
  const result = new Uint8Array(packet.length);
  for (let i = 0; i < packet.length; i++) {
    const address = addressForIndex(i, packet.depth);
    if (!recovered.has(address)) return { passed: false, recovered: i, total: packet.length, checksum: null, bytes: result };
    result[i] = recovered.get(address);
  }
  const digest = checksum32(result);
  return { passed: digest === packet.checksum, recovered: result.length, total: packet.length, checksum: digest, bytes: result };
}

// Same coarse sum, different interaction under a declared nonuniform probe.
// This is a toy example illustrating nonclosure, not an empirical Altermath result.
export function hiddenStateProbe() {
  const a = [1, -1, 1, -1], b = [1, 1, -1, -1];
  const weights = [1, 0.5, -0.5, -1];
  const sum = values => values.reduce((s, v) => s + v, 0);
  const probe = values => values.reduce((s, v, i) => s + v * weights[i], 0);
  return { coarseA: sum(a), coarseB: sum(b), responseA: probe(a), responseB: probe(b),
    indistinguishableCoarse: sum(a) === sum(b), distinctResponse: probe(a) !== probe(b) };
}

// Mandelbrot escape-time, sampled only on a bounded finite grid.
export function mandelbrotEscape(cx, cy, limit = 35) {
  let zx = 0, zy = 0;
  for (let n = 0; n < limit; n++) {
    const xx = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = xx;
    if (zx * zx + zy * zy > 4) return n;
  }
  return limit;
}
