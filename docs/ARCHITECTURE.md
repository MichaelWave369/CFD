# CFD architecture · v0.1

## Mission

CFD is an open-ended visual interface for **observable** data about computational systems. Inspiration comes from personal closed-eye visual imagery ('Fuzzy Dots'), not from a claim that computers or brains inherently use nested gears.

## Layers

1. **Signal contract:** typed and validated records in `src/lib/signals.mjs`. Every event carries provenance. The prototype currently generates only `SIMULATED` records.
2. **Geometry:** pure deterministic sampling and motion in `src/lib/field.mjs`. Five visualization modes are artistic encodings, not measured physical geometry.
3. **Renderer:** `src/components/DenseFieldCanvas.jsx` runs an original procedural WebGL2 shader over one world-space field; `src/components/FieldCanvas.jsx` remains a lower-density Canvas 2D fallback. The initial reduced-motion preference is preserved.
4. **Interface:** `src/App.jsx` provides accessible controls, sample event ledger, exported still frames, and explicit provenance labels.
5. **Pocket Field Lab (v0.3):** the separate `PocketFieldLab.jsx` Canvas 2D view renders simulated higher-parameter patterns and finite recursive pocket addresses from `src/lib/pocketField.mjs`. Its transform has an analytic inverse and its codec checks exact byte reconstruction; it is not integrated with the v0.2 WebGL shader's pixels. A deliberately corrupted byte fails the integrity checksum. [Protocol](POCKET_FIELD_LAB.md).
6. **Raster Pocket Reader (v0.4):** `RasterPocketLab.jsx` exports an actual 492x492 RGBA bit-grid image to PNG and decodes `getImageData` from the displayed canvas without original bytes. `rasterPocket.mjs` handles 3x modular repetition, finite header, majority votes, and noncryptographic integrity. The design has exact-size/orientation preconditions, no camera calibration, and no deformation recovery. [Format and test protocol](RASTER_POCKET_READER.md).
7. **Optical affine recovery (v0.5):** `opticalPocket.mjs` creates a carrier with four color-coded fiducials, applies a global invertible affine warp, and independently detects marker centroids from transformed pixels to reconstruct a raster without source bytes or transform settings. `OpticalPocketLab.jsx` visualizes and exports/imports the frame. Nonlinear deformations remain unsupported. [Protocol](OPTICAL_POCKET_RECOVERY.md).
8. **Nonlinear optical recovery (v0.6):** `nonlinearPocket.mjs` uses a bounded sinusoidal warp of a 700×700 carrier, twelve independent marker colors outside the bit-grid area, a least-squares estimator of two five-term output-coordinate models, and the previous majority-vote pixel decoder. `NonlinearPocketLab.jsx` exposes reversible experiments and evidence receipts. No source byte or slider value is fed into the decoder, but the sine basis family and marker protocol are known. [Research protocol](NONLINEAR_POCKET_RECOVERY.md).
9. **Elastic mesh reader (v0.7):** `meshPocket.mjs` repacks the finite raster into sixteen tiles with 25 unique colored fiducials in reserved gutters. A piecewise-bilinear warped carrier can be decoded using the *measured* pixel positions of those fiducials and no generation coefficients. Existing bit-repetition and checksum gates remain in force. The UI is `MeshPocketLab.jsx`; [experiment protocol](MESH_POCKET_RECOVERY.md). Exact-size images, intact markers, nonfolding cells, and a known tile layout remain requirements.
10. **Fullscreen original field (v0.8):** `FieldViewportFrame.jsx` wraps the existing `DenseFieldCanvas` instance, using the native browser Fullscreen API where available and a fixed-position fallback otherwise. The original renderer is never re-mounted on entering/exiting fullscreen; the canvas ResizeObserver recomputes its square pixel size and the fullscreen toolbar reuses the existing pause, zoom, and PNG handlers. [Presentation protocol](FULLSCREEN_FIELD.md).
11. **Adapters (future):** optional read-only bridges may translate externally provided, instrumented events into the signal contract. They will require explicit opt-in and visible source attribution.

## Separation of claims

- Visualization ≠ model's literal thoughts.
- Predicted or derived values ≠ direct instrument readings.
- Personal visual experiences ≠ independently validated physical mechanisms.
- Future biohybrid / volumetric / mycelium experiments are speculative hardware tracks, not functionality offered in v0.1.
- No access to PocketBrain, Vessie, NBG, Phi5, or PhiPortal is implemented yet. These are possible future independent adapters.

## Privacy, security and governance

No accounts, analytics, tracking pixels, browser persistence, model downloads, network requests, or hidden telemetry. Demo events are generated locally. A future adapter must require explicit user action, display data provenance, and never execute model-supplied code from event payloads.

## Performance

WebGL2 uses full-screen procedural sampling, a capped device-pixel ratio, and a ~30 FPS redraw target. Virtual dot counts refer to a possible deterministic lattice, not allocated or independently rendered points. A Canvas 2D fallback caps actual JS particles at 2,000. Layout uses a resize observer and provides motion pause and reduced-motion initial state. There is no WebGPU, model-adapter, or biological hardware dependency.

## Development constraints

- No third-party UI component kits or copied reference implementations.
- Tests cover deterministic geometry, finite pocket/address recovery, corruption rejection, coarse-state toy nonclosure, and signal schema integrity.
- Verify production build and Pages routing before calling a release complete.
