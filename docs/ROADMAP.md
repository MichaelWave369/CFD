# CFD research and product roadmap

## v0.1 · Fuzzy Field foundation (this PR)

- [x] Original React/Vite UI + canvas visual field
- [x] Four synthetic geometric modes
- [x] Controls: density, speed, zoom, pause, reset, PNG snapshot
- [x] Provenance-marked synthetic event ledger
- [x] Pure geometry and event contract tests
- [x] CI and GitHub Pages publishing workflow
- [ ] Verify public Pages deployment after merge and configuration

## v0.2 · The Square Motion Field (this PR)

- [x] Record source description of Fuzzy Dots separately from hypotheses
- [x] Present a square field as a stable viewport
- [x] Procedural WebGL2 microdots with hundreds of thousands to millions of *virtual* lattice cells
- [x] Smooth mode transitions within the same field coordinates
- [x] Continuous camera zoom spanning 0.25×–16×
- [x] Retain a Canvas 2D fallback and a reduced-motion start preference
- [x] Extend deterministic viewport tests
- [ ] Verify WebGL2 visuals, GPU usage, pause, fallback, snapshots and mobile in a real browser

## v0.3 · Infinite Pocket Field Lab (this PR)

- [x] Finite recursive quadtree address math and navigable canvas lab
- [x] Ring/column/corner procedural modes, cross-to-diamond and elastic transforms
- [x] 2/4/6-parameter procedural projections and bounded Mandelbrot escape view
- [x] One KiB payload encoding with exact known-transform address recovery
- [x] Deliberate corruption producing integrity FAIL
- [x] Equal-coarse / unequal-response constructed Altermath toy case
- [x] Local JSON verification receipts and deterministic tests
- [ ] Verify app visually and interactively in desktop/mobile browser
- [ ] Independently decode noisy rasterized pocket pixels (not part of v0.3)

## v0.4 · Raster Pocket Reader (this PR)

- [x] Independent RGBA pixel-to-byte decoder requiring no original message side channel
- [x] Self-describing 492×492 finite 1 KiB module format, 3 replicated bit copies
- [x] PNG download/reload for an external file round-trip
- [x] Pixel-noise and deliberate 1/2 replica corruption controls
- [x] Independent decoder test suite, size/orientation/corruption rejection
- [x] Research protocol and checksums with explicit limitations
- [ ] Browser visual/device/accessibility QA and PNG reload hands-on checks
- [ ] Test independent geometric rotation, scale, shear and camera-image decoding (future)

## v0.5 · Optical-affine recovery (this PR)

- [x] Embed the v0.4 pixel code in a carrier with four distinct optical fiducials
- [x] Render unknown (to decoder) rotation, shear, scale, and translation
- [x] Estimate affine mapping from independently detected marker centroids
- [x] Reconstruct raster from sampled pixels and verify original bytes
- [x] PNG export/reimport, checksum and calibration-residual receipts
- [x] Deterministic affine-recovery and damaged-marker tests
- [ ] Verify distorted import/export and controls in a real browser
- [ ] Independently recover nonlinear warps/perspective changes (future)

## v0.6 · Nonlinear optical pocket recovery (this PR)

- [x] Smooth, spatially varying 2D sine/cross-wave deformation
- [x] Twelve distinct fiducial colors in a separate gutter
- [x] Fit ten unknown forward-model coefficients from image pixels only
- [x] Sample warped pixel modules and reconstruct finite 1 KiB carrier
- [x] Browser sliders, PNG save/load and local JSON evidence receipt
- [x] Tests for exact byte recovery and malformed/missing marker failures
- [ ] Browser/device and exported-PNG verification by human
- [ ] Nonparametric mesh and unsupported-warp negative controls (future)

## v0.7 · Piecewise-bilinear mesh optical recovery (this PR)

- [x] Reserve 25 uniquely colored fiducial points in inter-tile gutters
- [x] Tile the intact finite 1 KiB raster across 16 cells
- [x] Warp different cells through a measured 5×5 node mesh
- [x] Independently locate fiducials using transformed RGBA pixels only
- [x] Reconstruct bit raster via piecewise-bilinear sampling and checksum
- [x] PNG save/reload, corrupted-marker and scrambled-data negative controls
- [x] Regression tests and explicit limits documented
- [ ] Human desktop/mobile browser and export/import QA
- [ ] Nonparametric out-of-family, noise and resampling benchmarks (future)

## v0.8 · Original square viewport fullscreen (this PR)

- [x] Native element fullscreen with a visible in-field exit control
- [x] Immersive viewport fallback where native Fullscreen API is unavailable
- [x] Preserve the 1:1 square and centered field on wide/tall displays
- [x] Pause, bounded octave zoom and PNG capture inside fullscreen
- [x] Escape handling, keyboard operability, focus restore and scroll lock
- [x] Preserve original renderer/seed/state and WebGL2/Canvas fallback
- [x] Pure zoom/viewport geometry regression tests
- [ ] Manual browser QA: native fullscreen, fallback, resize, reduced motion, WebGL2 fallback, mobile

## v0.9 · Observable signals

- [ ] Read-only opt-in adapter for a local process or exported trace
- [ ] Separate OBSERVED, INFERRED, VERIFIED, and SIMULATED channels
- [ ] Pause, inspect, and replay actual events
- [ ] Evidence receipts documenting source, timestamp, transform, and limitations

## v0.10 · Spatial interpretation

- [ ] Optional 3D or volumetric renderer, accessible 2D fallback
- [ ] Graph constraints for faithful relation mapping
- [ ] Interactions to trace a visual mark back to its instrumented source

## Experimental tracks (not promises)

- Phi5 / PhiPortal as transport/presentation options
- PocketBrain / Vessie read-only, consent-based event adapters
- Biohybrid material research, mycelium sensing, haptic and spatial displays

## Non-goals

No assertion of machine consciousness, direct reading of hidden model reasoning, neurological diagnosis, paranormal interpretation, or proofs of physical laws from visual resemblance.
