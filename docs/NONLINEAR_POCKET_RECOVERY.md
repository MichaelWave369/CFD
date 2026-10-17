# CFD v0.6 · Nonlinear Pocket Recovery

**Research status:** simulated, finite, intentionally encoded optical data. No model-thought, brain, dimensional, or physical-law inference.

## Scientific progression

- v0.3: known analytic elastic coordinate transform, logical address reconstruction, **not pixels**.
- v0.4: decode actual raster pixels, but require exact unwarped image dimensions and orientation.
- v0.5: estimate a **global affine** mapping from four colored anchor centroids, then decode pixels.
- **v0.6: estimate a smooth, spatially varying nonlinear mapping** from twelve colored markers; the decoder gets neither the source bytes nor the generator's distortion coefficients.

This is closer to the creator's observed elastic/ring-column appearance, but the artwork and the data carrier are still separate demonstrations.

## Explicit forward model

A 700×700 source image holds the same v0.4 492×492, 1,024-byte maximum triply replicated raster within a data square from source 104..596. Twelve uniquely colored circular fiducials sit in the outer empty gutter, not over the encoded bytes. A bounded transformation sends it into a 900×900 RGBA frame. The nonlinear displacement is a sum of affine and sinusoidal terms:

```
u = x/350 - 1
v = y/350 - 1

X = a*u + b*v + tx + h*sin(2*pi*y/700)
    + cross*sin(2*pi*x/700)*cos(2*pi*y/700)

Y = d*u + e*v + ty + vertical*sin(2*pi*x/700)
    + twist*sin(2*pi*y/700)*cos(2*pi*x/700)
```

The controls have bounded rotation (±12°), affine shear (±0.12), scale (0.88–1.0), and four nonlinear displacement coefficients (±22 pixel amplitude). Every pixel is mapped by numerical inverse iteration to avoid forward-splat holes.

## Decoder contract and evidence

**Only** the independently supplied 900×900 RGBA pixels enter `decodeNonlinearImage(frame)`. The decoder:
1. Scans for twelve distinct marker colors, computing each marker centroid.
2. Solves two 5×5 least-squares problems for the ten coefficients in this **declared basis family**.
3. Checks maximum marker-fit residual (≤2.5 px) and orientation.
4. Projects expected raster module centers into the measured warped image and samples nearby pixels, reconstructing a binary module image.
5. Delegates to the v0.4 triplicate-bit voting decoder and FNV-1a checksum. A corrupt header, missing marker, dimension mismatch, or checksum mismatch results in a visible **FAIL**, never fabricated recovered data.
6. Supports user-initiated PNG download/reimport and local JSON test receipt. No telemetry or external storage.

**Important:** Known sine *basis family* is part of the decode protocol, but the actual coefficients and generator slider settings are **not**. The markers need to survive, and the source must follow this particular format.

## Reproduce

```sh
npm install
npm test
npm run build
```

In the **Nonlinear Pocket Recovery** panel, click **ENCODE 1 KiB** then **LOCATE ANCHORS + RECOVER BYTES**. Vary horizontal sine flow, vertical flow, cross-wave pull and corner twist; repeat recovery. Save the pixel image, upload it again, and independently decode. The receipt reports payload hash, marker count, fit residual, and provenance. Automated tests cover a no-warp control, multiple nonlinear transforms, several payload sizes, and destroyed markers.

## Limits and future falsification

- Not arbitrary rubber-sheet warping, topology changes, folds, perspective correction, camera scans, unknown marker patterns, or computationally unlimited data.
- Printed or screenshot-compressed images, JPEG, blur, scaling, clipping, erasures and adversarial color changes may fail. No universal robustness is claimed.
- Uniquely colored fiducials and exact image dimensions are required; brightness voting is not cryptographic.
- Visual resemblance to a 4D/6D projection is not evidence for those physical dimensions, and the Altermath-style coarse-state toy test is not a theory validation.
- Next experiment: derive a deformation-tolerant decoder with *nonparametric* calibration mesh and holdout landmarks, compare against explicit rigid/affine baselines, quantify bit error rates on noisy and resampled images.

**Ledger Above Ego: the checksum decides, not the vibes.**
