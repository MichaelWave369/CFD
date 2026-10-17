import test from "node:test";
import assert from "node:assert/strict";
import {
  CARRIER_SIZE, OPTICAL_SIZE, MARKERS, makeOpticalCarrier,
  warpOpticalCarrier, calibrateOpticalImage, decodeOpticalImage,
  locateOpticalMarkers
} from "../src/lib/opticalPocket.mjs";
import { checksum32 } from "../src/lib/pocketField.mjs";

const payload = size => Uint8Array.from({ length: size }, (_, i) => (i * 83 + (i >> 3) * 17 + 31) & 255);
const scenarios = [
  { angle: 0, shear: 0, scale: 1, offsetX: 0, offsetY: 0 },
  { angle: 10, shear: 0.12, scale: 0.93, offsetX: 6, offsetY: -7 },
  { angle: -13, shear: -0.14, scale: 0.89, offsetX: -11, offsetY: 9 },
  { angle: 15, shear: 0.16, scale: 0.9, offsetX: 10, offsetY: 12 },
  { angle: -8, shear: 0.1, scale: 1, offsetX: 3, offsetY: 3 }
];

test("finite carrier contains four unique fiducial colors and data frame", () => {
  assert.equal(CARRIER_SIZE, 700);
  assert.equal(OPTICAL_SIZE, 900);
  assert.equal(MARKERS.length, 4);
  assert.equal(new Set(MARKERS.map(m => m.id)).size, 4);
  const frame = makeOpticalCarrier(payload(1024));
  assert.equal(frame.data.length, 700 * 700 * 4);
});

test("reader independently calibrates geometric image distortion from pixels", () => {
  const frame = makeOpticalCarrier(payload(1024));
  for (const options of scenarios) {
    const image = warpOpticalCarrier(frame, options);
    // Optical decoder is not passed options or the original image or bytes.
    const recovered = decodeOpticalImage({ width: image.width, height: image.height,
      data: new Uint8ClampedArray(image.data) });
    assert.equal(recovered.passed, true,
      "scenario " + JSON.stringify(options) + " returned " + recovered.reason +
      " / markerError " + recovered.markerError);
    assert.deepEqual(recovered.bytes, payload(1024));
    assert.equal(recovered.checksum, checksum32(payload(1024)));
    assert.ok(recovered.markerError < 2.5);
  }
});

test("short UTF-8 data and empty payloads recover under rotation and shear", () => {
  for (const size of [0, 1, 17, 77]) {
    const image = warpOpticalCarrier(makeOpticalCarrier(payload(size)),
      { angle: 11, shear: -0.1, scale: 0.91 });
    const result = decodeOpticalImage(image);
    assert.equal(result.passed, true, "payload size " + size + ": " + result.reason);
    assert.deepEqual(result.bytes, payload(size));
  }
});

test("missing registration marker produces an explicit failure", () => {
  const image = warpOpticalCarrier(makeOpticalCarrier(payload(55)), { angle: 0, scale: 1 });
  for (let i = 0; i < image.data.length; i += 4) {
    // Remove only the red marker, preserve other markers and payload.
    if (image.data[i] > 210 && image.data[i + 1] < 100 && image.data[i + 2] < 120) {
      image.data[i] = 6; image.data[i + 1] = 12; image.data[i + 2] = 24;
    }
  }
  assert.match(decodeOpticalImage(image).reason, /MARKER_ERROR/);
});

test("wrong image sizes and transform bounds fail closed", () => {
  assert.match(decodeOpticalImage({ width: 900, height: 850, data: [] }).reason, /DIMENSION_ERROR/);
  assert.throws(() => warpOpticalCarrier(makeOpticalCarrier(payload(0)), { scale: 0.1 }), RangeError);
  assert.throws(() => warpOpticalCarrier(makeOpticalCarrier(payload(0)), { shear: 2 }), RangeError);
});

test("the fiducial geometry constraint rejects an implausibly moved marker", () => {
  const image = warpOpticalCarrier(makeOpticalCarrier(payload(11)), { scale: 0.95 });
  const detected = locateOpticalMarkers(image);
  assert.ok(detected.TL.count > 100);
  assert.ok(detected.BR.count > 100);
  assert.doesNotThrow(() => calibrateOpticalImage(image));
  // Shift the magenta marker ~25 px horizontally while keeping its identity.
  const rgba = image.data;
  const tx = Math.round(detected.BR.x), ty = Math.round(detected.BR.y);
  const moved = [];
  for (let y = ty - 20; y <= ty + 20; y++) {
    for (let x = tx - 20; x <= tx + 20; x++) {
      const at = (y * image.width + x) * 4;
      if (rgba[at] > 170 && rgba[at + 2] > 195 && rgba[at + 1] < 125) {
        moved.push([x,y,rgba[at],rgba[at + 1],rgba[at + 2]]);
        rgba[at] = 6; rgba[at + 1] = 12; rgba[at + 2] = 24;
      }
    }
  }
  for (const [x,y,r,g,b] of moved) {
    const at = (y * image.width + x + 25) * 4;
    rgba[at] = r; rgba[at + 1] = g; rgba[at + 2] = b;
  }
  assert.match(decodeOpticalImage(image).reason, /CALIBRATION_ERROR/);
});
