import test from "node:test";
import assert from "node:assert/strict";
import {
  clampZoom, virtualDotCount, viewportToWorld,
  worldToViewport, MODE_IDS, modeIndex
} from "../src/lib/fieldViewport.mjs";

test("square viewport coordinates round-trip at all supported zoom levels", () => {
  for (const zoom of [0.25, 0.5, 1, 2, 4, 16]) {
    for (const pos of [[0, 0], [0.25, 0.75], [0.5, 0.5], [1, 1]]) {
      const world = viewportToWorld(...pos, zoom);
      const viewport = worldToViewport(world.x, world.y, zoom);
      assert.ok(Math.abs(viewport.x - pos[0]) < 1e-12);
      assert.ok(Math.abs(viewport.y - pos[1]) < 1e-12);
    }
  }
});

test("camera zoom preserves center coordinate", () => {
  for (const zoom of [0.25, 1, 6, 16]) {
    assert.deepEqual(viewportToWorld(0.5, 0.5, zoom), { x: 0, y: 0 });
  }
});

test("virtual density is bounded and not allocated", () => {
  assert.equal(virtualDotCount(1024), 1048576);
  assert.equal(virtualDotCount(1536), 2359296);
  assert.equal(virtualDotCount(99999), 2359296);
  assert.equal(virtualDotCount(-10), 65536);
});

test("mode labels map to unique shader indices", () => {
  assert.deepEqual(MODE_IDS.map(modeIndex), [0, 1, 2, 3, 4]);
  assert.equal(modeIndex("unknown"), 0);
  assert.equal(clampZoom(Infinity), 1);
  assert.equal(clampZoom(0.01), 0.25);
  assert.equal(clampZoom(99), 16);
});
