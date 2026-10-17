# CFD v0.7 · Elastic Mesh Optical Recovery

**Status:** finite, simulated pixel-storage and decoding experiment; no neural or physical-dimensionality inference.

## Progression
- v0.3 recovered finite addresses after a *known analytic transform*.
- v0.4 decoded bytes from an actual unwarped raster.
- v0.5 calibrated an affine transform using four colored markers.
- v0.6 calibrated ten coefficients of a declared sine-wave deformation model using 12 markers.
- **v0.7** uses a **5×5 optical mesh, 25 colored fiducials, and 16 independently bilinearly deformable cells**. The reader never receives the warp's strength, phase, rotation, original vertex positions, or source message.

The 25 measured marker positions become the deforming grid directly. There is **no global sine basis to estimate**. This remains a deliberately known registration format using piecewise-bilinear interpolation. The generator is bounded to keep local cells nonfolding.

## Tiled physical layout
- Start with the existing 164×164 module code (492×492 pixels; up to 1,024 bytes with 3 replicas per bit and an 11-byte header).
- Divide the 164 modules into 4×4 tiles, each 41×41 modules = 123×123 pixels.
- Place tiles inside a **700×700 source field** bounded by 5 node coordinates `[28, 189, 350, 511, 672]` in X and Y. Every 161×161 cell reserves a 19-pixel gutter between node and tile on every side.
- Draw a unique eight-pixel-radius reference marker at each of the 25 grid intersections. The marker palette consists of distinct triples of `90,170,250`, each separately identifiable by color.
- This tiled image is an intact, reversible layout of all source modules: fiducials don't overwrite information cells.
- Generate a bounded piecewise-bilinear warped version in a **900×900 pixel output** by changing mesh vertex locations and inverse-rasterizing all 16 cells. Maximum displacement is bounded, with additional modest rotation and scaling.

## Actual decoder
`decodeMeshImage(image)` takes the **900×900 RGBA pixels only**. It:
1. Scans for all 25 unique RGB codes, computes their positions from pixel centroids, and rejects missing markers.
2. Reconstructs the measured 5×5 vertex mesh and rejects reversed / degenerate quadrilaterals using signed areas.
3. Projects each expected data module through the **measured bilinear map of its own cell**, with nine subpixel samples per module.
4. Reassembles the original 164×164 binary module grid, then calls the existing image-byte decoder for triple-replica voting and checksum validation.
5. Reports PASS only for a valid checksum; otherwise returns specific marker, layout, header, or checksum failures.

The decoder knows the **layout and bilinear interpolation rule** but not the generating deformation settings. A successful test validates this bounded format, not arbitrary unknown image decoding.

## Reproduction
```sh
npm install
npm test
npm run build
```

After merge, open the **Elastic Mesh Recovery** panel; try **ENCODE 1 KiB**, adjust elastic cell pull/rotation/scale/phase, and click **CALIBRATE MESH + DECODE PIXELS**. Verify `PASS` and exact 1024-byte checksum, then download and reload PNG and retry. Use **BREAK MARKER** or **SCRAMBLE DATA** for explicit negative controls. Export the local JSON receipt, which distinguishes simulated/generated inputs from user-uploaded images.

Automated tests cover several bounded nonuniform warps, full 1 KiB recovery, empty/short payloads, independent raster reconstruction, a missing marker, corrupted data, and invalid dimensions/parameter bounds.

## Honest limitations and next gates
- Mesh appearance can suggest curved/ring-column depth but does **not** establish extra physical dimensions.
- No actual infinite storage; the carrier's maximum is 1024 bytes, and redundancy costs capacity.
- No camera perspective, topology folds, arbitrary tearing, cropping, lossy codec, rescaling, blur or occlusion guarantee. Unregistered photographs are outside scope.
- No cryptographic authenticity: the 32-bit checksum is for accidental error detection, not adversarial protection.
- The original Fuzzy Dots art is still **not** a data code; this is a distinct intentionally encoded carrier.
- Synthetic deformations and a matching interpolation decoder share design assumptions, so test independently generated out-of-family distortions before making general robustness claims.
- UI/browser QA, imported PNG round-trips, and performance checks are still required.
- Later research should include holdout fiducials, measured spatial registration error, noise robustness and nonparametric warps not created by our own generator.

**Ledger Above Ego: measurable recoverability, not optical mythology.**
