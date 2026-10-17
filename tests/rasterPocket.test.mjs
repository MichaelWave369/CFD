import test from "node:test";
import assert from "node:assert/strict";
import {
  RASTER_SIZE, RASTER_MAX_BYTES, RASTER_BITS_PER_COPY,
  RASTER_COPIES, makeRasterPocketImage, decodeRasterPocketImage,
  damageRasterPixels, damageRasterReplicas
} from "../src/lib/rasterPocket.mjs";

const data = n => Uint8Array.from({ length: n }, (_, i) => (i * 83 + (i >> 2) + 9) & 255);

test("pixel frame is finite and fits three complete 1 KiB copies", () => {
  assert.equal(RASTER_SIZE, 492);
  assert.equal(RASTER_BITS_PER_COPY, 8280);
  assert.equal(RASTER_COPIES, 3);
  assert.equal(RASTER_MAX_BYTES, 1024);
  assert.throws(() => makeRasterPocketImage(data(1025)), RangeError);
});

test("independent raster decoder reads only RGBA pixels at varied lengths", () => {
  for (const size of [0, 1, 17, 251, 777, 1024]) {
    const bytes = data(size);
    const image = makeRasterPocketImage(bytes);
    // JSON-serializable fixture simulates an external image with no payload metadata.
    const detached = { width: image.width, height: image.height,
      data: new Uint8ClampedArray(image.data) };
    const result = decodeRasterPocketImage(detached);
    assert.equal(result.passed, true, `size ${size}: ${result.reason}`);
    assert.equal(result.length, size);
    assert.deepEqual(result.bytes, bytes);
    assert.equal(result.disagreements, 0);
  }
});

test("one fully destroyed bit-replica band still produces exact pixels->bytes recovery", () => {
  const bytes = data(1024);
  const frame = damageRasterReplicas(makeRasterPocketImage(bytes), 1);
  const result = decodeRasterPocketImage(frame);
  assert.equal(result.passed, true, result.reason);
  assert.deepEqual(result.bytes, bytes);
  assert.ok(result.disagreements >= 8280);
});

test("two destroyed replica bands fail closed, rather than misreport successful data", () => {
  const frame = damageRasterReplicas(makeRasterPocketImage(data(1024)), 2);
  const result = decodeRasterPocketImage(frame);
  assert.equal(result.passed, false);
  assert.match(result.reason, /HEADER_ERROR|CHECKSUM_MISMATCH/);
});

test("seeded pixel noise is reproducible; moderate noise is correctable", () => {
  const bytes = data(1024);
  const original = makeRasterPocketImage(bytes);
  const noisy = damageRasterPixels(original, 0.08, 369);
  assert.deepEqual(damageRasterPixels(original, 0.08, 369).data, noisy.data);
  const result = decodeRasterPocketImage(noisy);
  assert.equal(result.passed, true, result.reason);
  assert.deepEqual(result.bytes, bytes);
});

test("severe random noise fails integrity and invalid images are rejected", () => {
  const image = makeRasterPocketImage(data(1024));
  const extreme = damageRasterPixels(image, 0.5, 369);
  assert.equal(decodeRasterPocketImage(extreme).passed, false);
  assert.match(decodeRasterPocketImage({ ...image, width: 200 }).reason, /DIMENSION_ERROR/);
  assert.throws(() => damageRasterPixels(image, 2), RangeError);
  assert.throws(() => damageRasterReplicas(image, 3), RangeError);
});

test("orientation markers reject gross frame corruption", () => {
  const frame = makeRasterPocketImage(data(2));
  // Wipe top left fiducial 3x3 module by forcing it dark.
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    const at = (y * RASTER_SIZE + x) * 4;
    frame.data[at] = 0; frame.data[at + 1] = 0; frame.data[at + 2] = 0;
  }
  const result = decodeRasterPocketImage(frame);
  assert.equal(result.passed, false);
  assert.match(result.reason, /FRAME_ERROR/);
});

test("single data-module alteration is caught by checksum when redundant copies agree on wrong value", () => {
  const bytes = data(57);
  const frame = makeRasterPocketImage(bytes);
  // A 3-copy majority cannot correct identical corruption of all replicas.
  // Flip a single payload bit in each of the three module bands, leaving header intact.
  const index = (11 * 8) + 5;
  for (let copy = 0; copy < 3; copy++) {
    const slot = copy * RASTER_BITS_PER_COPY + index;
    const mx = 2 + slot % 160, my = 2 + Math.floor(slot / 160);
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      const at = ((my * 3 + y) * RASTER_SIZE + mx * 3 + x) * 4;
      const bright = frame.data[at] > 100;
      frame.data[at] = bright ? 18 : 136;
      frame.data[at + 1] = bright ? 28 : 241;
      frame.data[at + 2] = bright ? 47 : 219;
    }
  }
  const result = decodeRasterPocketImage(frame);
  assert.equal(result.passed, false);
  assert.match(result.reason, /CHECKSUM_MISMATCH/);
});
