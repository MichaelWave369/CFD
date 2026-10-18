import test from "node:test";
import assert from "node:assert/strict";
import {
  MIN_ZOOM, MAX_ZOOM, clampZoom, stepFieldZoom,
  viewportToWorld, worldToViewport
} from "../src/lib/fieldViewport.mjs";

test("fullscreen zoom uses predictable 2x steps without exceeding world-camera bounds", () => {
  const sequence = [0.25, 0.5, 1, 2, 4, 8, 16];
  for (let i = 1; i < sequence.length; i++) {
    assert.equal(stepFieldZoom(sequence[i - 1], 1), sequence[i]);
    assert.equal(stepFieldZoom(sequence[i], -1), sequence[i - 1]);
  }
  assert.equal(stepFieldZoom(MIN_ZOOM, -1), MIN_ZOOM);
  assert.equal(stepFieldZoom(MAX_ZOOM, 1), MAX_ZOOM);
  assert.equal(stepFieldZoom(0.75, 1), 1.5);
  assert.equal(stepFieldZoom(1.5, -1), 0.75);
  assert.throws(() => stepFieldZoom(1, 0), RangeError);
  assert.throws(() => stepFieldZoom(1, "in"), RangeError);
  assert.equal(stepFieldZoom(NaN, 1), 2);
});

test("fullscreen zoom preserves the same logical square world and viewport point mapping", () => {
  for (const zoom of [0.25, 0.5, 1, 1.5, 2, 4, 8, 16]) {
    for (const [x, y] of [[0, 0], [0.5, 0.5], [1, 1], [0.19, 0.81]]) {
      const world = viewportToWorld(x, y, zoom);
      const back = worldToViewport(world.x, world.y, zoom);
      assert.ok(Math.abs(back.x - x) <= 1e-12);
      assert.ok(Math.abs(back.y - y) <= 1e-12);
    }
  }
  assert.equal(clampZoom(99), MAX_ZOOM);
});
