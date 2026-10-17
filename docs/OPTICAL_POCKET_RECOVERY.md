# CFD v0.5 · Affine Optical Recovery

**Status:** original, simulated, finite browser experiment; not biological or model-activity telemetry.

## Question
Can a decoder given *only transformed RGBA pixels* reconstruct real data after a modest unknown rotation, shear, scale, and translation?

## Format and experimental boundary
- Uses the v0.4 triple-replica `Raster Pocket Reader` payload format: a 492x492 raster containing at most 1,024 bytes, an 11-byte identifying header, and a 32-bit non-cryptographic checksum.
- Inserts it into a 700x700 carrier at 104,104, with four separated, uniquely colored registration markers at predefined corners.
- Applies **one global 2D affine transform** to the entire carrier, displaying the result in a 900x900 canvas. The UI supports ±15° rotation, ±0.16 horizontal shear, 0.85–1.00 scale, and up to ±12px translation.
- The reader receives **only a 900x900 pixel frame**. It classifies unique marker colors, computes their pixel centroids, infers an affine mapping from three markers, and checks the residual for the fourth. No source bytes, slider values or transform coefficients are passed to the decoder.
- It maps expected *module center locations* through the estimated affine transform into the displayed pixels, uses 9 projected local pixel samples per module, rebuilds a clean pixel raster, and passes that raster to the independent v0.4 bit decoder with triple-bit majority voting and checksum verification.
- PNG export and re-import allow a separate image-file round-trip; the uploaded PNG must have exact frame dimensions and maintain marker colors.

## Demonstration recipe
1. `npm install && npm test && npm run build`.
2. On the site, in **Elastic Optical Recovery**, choose **ENCODE 1 KiB** and click **DETECT MARKERS + RECOVER BYTES**. Verify exactly recovered bytes and inspect the measured four-marker residual.
3. Move rotation, shear, scale or translation sliders and decode again. Transform metadata is never supplied to the decoder.
4. Save the distorted 900x900 PNG, reimport it, and run decode.
5. Use a separately edited PNG with an obscured marker. Expect an explicit marker failure.
6. Inspect tests for several independently generated affine transforms and malformed-image rejection.

## What it demonstrates
A *particular purpose-built finite raster format* can recover an original payload after a limited class of global affine distortions, provided four calibration marks remain detectable, the input frame is unscaled and unrotated **relative to its canvas bounds**, and spatial resolution remains sufficient.

## What it does not demonstrate
- No **arbitrary nonlinear elasticity**, curled sheets, lenses, 3D reconstruction, or perspective warp recovery.
- No automatic recovery of *unknown* dimensions, unknown markers, resampled screenshots, JPEG artifacts, severe occlusion, or arbitrary image crop.
- No direct interpretation of the original glowing ring-column patterns as data; this is a separate deliberate **information-bearing encoding**, not evidence those visuals store information.
- No compression, infinite storage, evidence for physical 4D/6D structures, neurological model, or Altermath scientific proof.
- No cryptographic authenticity: FNV checksum is suitable for test-error indication only.
- No server or tracking. Uploaded image bytes remain local.

## Next falsification gates
Test independent perspective projection and nonlinear sinusoidal displacement with either a known calibration grid or learnable features, quantitatively characterize failure under blur, cropping, downsampling, JPEG, noise, and marker loss. Preserve failing frames and measured byte error rates rather than claiming universal robustness.

**Ledger Above Ego. Read pixels, verify bytes, quantify failure.**
