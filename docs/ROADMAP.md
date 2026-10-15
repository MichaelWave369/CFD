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

## v0.3 · Observable signals

- [ ] Read-only opt-in adapter for a local process or exported trace
- [ ] Separate OBSERVED, INFERRED, VERIFIED, and SIMULATED channels
- [ ] Pause, inspect, and replay actual events
- [ ] Evidence receipts documenting source, timestamp, transform, and limitations

## v0.4 · Spatial interpretation

- [ ] Optional 3D or volumetric renderer, accessible 2D fallback
- [ ] Graph constraints for faithful relation mapping
- [ ] Interactions to trace a visual mark back to its instrumented source

## Experimental tracks (not promises)

- Phi5 / PhiPortal as transport/presentation options
- PocketBrain / Vessie read-only, consent-based event adapters
- Biohybrid material research, mycelium sensing, haptic and spatial displays

## Non-goals

No assertion of machine consciousness, direct reading of hidden model reasoning, neurological diagnosis, paranormal interpretation, or proofs of physical laws from visual resemblance.
