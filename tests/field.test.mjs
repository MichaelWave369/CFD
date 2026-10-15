import test from "node:test";
import assert from "node:assert/strict";
import { MODES, makeField, positionAt } from "../src/lib/field.mjs";

test("all modes are deterministic and produce finite coordinates", () => {
  for (const { id } of MODES) {
    const a = makeField(512, 42, id);
    assert.deepEqual(a, makeField(512, 42, id));
    assert.equal(a.length, 512);
    for (const p of a) {
      for (const t of [0, 1, 10, 100]) {
        const v = positionAt(p, t, id);
        assert.ok([v.x, v.y, v.z].every(Number.isFinite), id);
      }
    }
  }
});

test("count is clamped and zero time returns stable values", () => {
  assert.equal(makeField(99999).length, 2000);
  assert.equal(makeField(-1).length, 1);
  const p = makeField(1, 0, "nested")[0];
  assert.deepEqual(positionAt(p, 0, "nested"), positionAt(p, Number.NaN, "nested"));
});
