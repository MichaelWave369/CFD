import test from "node:test";
import assert from "node:assert/strict";
import {
  POCKET_DEPTH, MAX_PAYLOAD_BYTES, depthCapacity, addressForIndex,
  boundsForAddress, centerForAddress, addressForPoint,
  addressForLocalPoint, warpPoint, unwarpPoint, checksum32,
  encodePocketBytes, recoverPocketBytes, hiddenStateProbe, mandelbrotEscape
} from "../src/lib/pocketField.mjs";

test("four-way recursive addresses are unique, bounded, and round-trip through cell centers", () => {
  assert.equal(depthCapacity(6), 4096);
  const found = new Set();
  for (let i = 0; i < depthCapacity(6); i++) {
    const address = addressForIndex(i, 6);
    assert.equal(address.length, 6);
    assert.equal(addressForPoint(...Object.values(centerForAddress(address)), 6), address);
    found.add(address);
  }
  assert.equal(found.size, 4096);
  assert.deepEqual(boundsForAddress(""), { x: 0, y: 0, size: 1 });
  assert.deepEqual(boundsForAddress("3"), { x: 0.5, y: 0.5, size: 0.5 });
  assert.equal(addressForLocalPoint(0.8, 0.8, "0"), "03");
  assert.throws(() => addressForIndex(4096, 6), RangeError);
  assert.throws(() => addressForPoint(1, 0.5, 6), RangeError);
  assert.throws(() => boundsForAddress("8"), RangeError);
  assert.throws(() => depthCapacity(11), RangeError);
});

test("elastic shear and diamond orientation preserve continuous logical coordinates", () => {
  for (const elasticity of [0, 0.35, 0.68, 1]) {
    for (const diamond of [0, 0.25, 0.6, 1]) {
      for (const [x, y] of [[0, 0], [0.125, 0.75], [0.5, 0.5], [0.999, 0.001], [1, 1]]) {
        const warped = warpPoint(x, y, elasticity, diamond);
        const recovered = unwarpPoint(warped.x, warped.y, elasticity, diamond);
        assert.ok(Math.abs(recovered.x - x) < 1e-12, JSON.stringify({ x, y, elasticity, diamond }));
        assert.ok(Math.abs(recovered.y - y) < 1e-12);
      }
    }
  }
});

test("1 KiB is recovered byte-for-byte after known reversible transforms", () => {
  const data = Uint8Array.from({ length: MAX_PAYLOAD_BYTES }, (_, i) => (i * 97 + (i >> 2)) % 256);
  const packet = encodePocketBytes(data);
  assert.equal(packet.depth, POCKET_DEPTH);
  assert.equal(packet.cells.length, 1024);
  assert.equal(packet.checksum, checksum32(data));
  for (const elasticity of [0, 0.5, 1]) {
    for (const diamond of [0, 0.5, 1]) {
      const result = recoverPocketBytes(packet, elasticity, diamond);
      assert.equal(result.passed, true);
      assert.equal(result.total, 1024);
      assert.deepEqual(result.bytes, data);
    }
  }
});

test("empty payloads and non-power-of-four sizes are recoverable", () => {
  for (const n of [0, 1, 17, 255, 1001]) {
    const bytes = Uint8Array.from({ length: n }, (_, i) => i % 256);
    assert.deepEqual(recoverPocketBytes(encodePocketBytes(bytes), 0.9, 0.9).bytes, bytes);
  }
  assert.throws(() => encodePocketBytes(new Uint8Array(1025)), RangeError);
  assert.throws(() => encodePocketBytes(new Uint8Array(20), 2), RangeError);
});

test("a single flipped byte fails integrity without being silently corrected", () => {
  const packet = encodePocketBytes(new TextEncoder().encode("Ledger above ego"));
  packet.cells[5].byte ^= 1;
  const result = recoverPocketBytes(packet, 0.83, 0.72);
  assert.equal(result.passed, false);
  assert.notEqual(result.checksum, packet.checksum);
  assert.throws(() => recoverPocketBytes({ ...packet, length: -1 }), RangeError);
});

test("coarse-equal hidden configurations yield distinct declared weighted responses", () => {
  const probe = hiddenStateProbe();
  assert.equal(probe.indistinguishableCoarse, true);
  assert.equal(probe.coarseA, 0);
  assert.equal(probe.coarseB, 0);
  assert.equal(probe.distinctResponse, true);
  assert.notEqual(probe.responseA, probe.responseB);
});

test("finite Mandelbrot escape is deterministic and bounded", () => {
  assert.equal(mandelbrotEscape(0, 0, 35), 35);
  assert.equal(mandelbrotEscape(2, 2, 35), 0);
  assert.equal(mandelbrotEscape(-1, 0, 35), 35);
});
