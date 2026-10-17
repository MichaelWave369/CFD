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
7. **Adapters (future):** optional read-only bridges may translate externally provided, instrumented events into the signal contract. They will require explicit opt-in and visible source attribution.

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
