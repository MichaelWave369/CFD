import test from "node:test";
import assert from "node:assert/strict";
import { demoSignals, validateSignal } from "../src/lib/signals.mjs";

test("demo signals are valid and always marked simulated", () => {
  const signals = demoSignals();
  assert.equal(signals.length, 4);
  assert.ok(signals.every((x) => validateSignal(x) && x.provenance === "SIMULATED"));
});

test("rejects invalid provenance, kind, and intensity", () => {
  const good = demoSignals()[0];
  assert.equal(validateSignal({ ...good, provenance: "CLAIRVOYANT" }), false);
  assert.equal(validateSignal({ ...good, kind: "thought" }), false);
  assert.equal(validateSignal({ ...good, intensity: 99 }), false);
  assert.equal(validateSignal(null), false);
});
