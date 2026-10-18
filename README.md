# Cognitive Field Display (CFD)

**Beyond the screen. Into the field.**

CFD is an original, experimental interface for representing **observable computational signals** as geometric fields of particles, patterns, and motion. The first prototype is inspired by the creator's lifelong *Fuzzy Dots* visual imagery: a relaxed closed-eye field of colored points that seems to move into imagined diagrams and structures.

**This is a visualization tool, not a consciousness detector or a view into an AI's private thoughts.** The prototype uses entirely **synthetic demonstration data**. It does not connect to a model, make claims about subjective experience, or demonstrate new physical laws.

## Quick start

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. Use `npm test` for pure-function tests and `npm run build` for a production bundle.

## v0.2 · Square Fuzzy Dots Field

The visual field is now a **square viewport** into a persistent procedural color-point substrate. It behaves like a small motion picture: continuously moving, zoomable from 0.25× to 16×, and smoothly changing geometry *within* one coordinate system instead of swapping scenes. A WebGL2 fragment shader samples a **virtual lattice** of up to ~2.36 million points without allocating that many particles. This is **not** the same as rendering 2.36 million individually resolved dots; actual detail depends on display resolution and GPU capability. A lower-density Canvas 2D fallback remains available.

See [Fuzzy Dots Field specification](docs/FUZZY_DOTS_FIELD.md) for the user's first-person source description and proposed visual behaviors.

## v0.8 · Fullscreen Square Field

The original Fuzzy Dots **FIELD VIEWPORT** now offers **FULLSCREEN**. The field stays a centered 1:1 square and fills the maximum available screen area without stretching. A native browser fullscreen mode is attempted first; if unsupported, an in-page immersive view is used instead. The expanded viewport includes **Exit, Pause/Resume, 2× zoom controls, and PNG capture**. Exiting restores the page without resetting the original animation/seed/camera.

See the [fullscreen field behavior and browser test checklist](docs/FULLSCREEN_FIELD.md). This is a display feature; it does not change data capacity or the evidence boundaries of the Fuzzy Dots artwork.

## v0.7 · Elastic Mesh Recovery

The experimental progression now reaches a **5×5 pixel-registration mesh**. Twenty-five colored anchors surround sixteen independent byte-bearing tiles, allowing each tile to bend differently. The decoder locates all twenty-five anchors from the **900×900 RGBA image alone**, rebuilds a piecewise-bilinear map, and attempts to recover up to 1,024 actual bytes through the existing triplicate-bit codec.

The color markers have reserved gutters, so they do not overwrite payload pixels. An explicit **BREAK MARKER** and **SCRAMBLE DATA** button makes failure modes inspectable. No decoder is given the warp slider values or original message. See the [bounded v0.7 mesh experiment](docs/MESH_POCKET_RECOVERY.md).

This remains a finite, purpose-designed raster code, not an arbitrary moving-pattern decoder or limitless storage.

## v0.6 · Nonlinear Pocket Recovery

The newest local-only panel experiments with **smooth, nonuniform image deformation**: sine-wave columns, cross pulls and corner twists. A 12-color fiducial system lets a separate decoder estimate ten unknown coefficients of a **declared sinusoidal map** directly from a warped 900×900 pixel image. It then attempts to recover a real, deliberately encoded 1 KiB payload and records the marker-fit error and checksum. PNG import/export and test receipts are included.

This is not universal elastic reconstruction and does not prove extra physical dimensions, infinite memory, or new physics. See the [v0.6 protocol](docs/NONLINEAR_POCKET_RECOVERY.md).

## v0.5 · Elastic Optical Recovery (affine only)

A new optical experiment intentionally rotates, shears, scales, and translates a 1 KiB-bearing image. Four uniquely colored registration markers let the reader **estimate the geometric transformation from the warped RGBA pixels themselves**, reconstruct a finite raster, and decode the original bytes. This can be tested again after exporting/reimporting a 900×900 PNG. The decoder receives neither the source payload nor the UI slider values.

Here "elastic" refers to uniform **affine shear**, not nonlinear continuous rubber-sheet recovery. See [v0.5 optical experiment](docs/OPTICAL_POCKET_RECOVERY.md).

## v0.4 · Raster Pocket Reader

A second experimental panel now **encodes real byte values into pixels** and independently decodes them from the on-screen 492×492 image. Each bit has three pixel-module replicas with majority-vote recovery. Try 1 KiB, add controlled pixel noise, destroy one replica band to test redundancy, or destroy two to test failure. Save the PNG, reload it, and compare the decoded bytes against the stored noncryptographic checksum. Local-only, no backend.

This is a **finite and exact-size** image codec, not compression, unlimited memory, or proof that the animated Fuzzy Dots contain recoverable data. See the [Raster Pocket Reader protocol](docs/RASTER_POCKET_READER.md) for the bit layout, test gates and limitations.

## v0.3 · Infinite Pocket Field Lab

The original v0.2 **square Fuzzy Dots renderer stays intact**. A second, clearly simulated interactive laboratory adds ring columns, corner oscillators, cross-to-diamond phases, elastic shears, four-way recursive navigation, and an optional Mandelbrot escape-time view. The 2/4/6 parameter control changes a *2D procedural projection*, not physical spatial dimensionality.

The **PocketSquare byte test** addresses up to 1,024 UTF-8 or synthetic bytes through a finite depth-six quadtree. Verify a known, reversible geometric warp by exact address reconstruction and FNV-1a32 integrity checksum; deliberately corrupt a byte to get a FAIL. The separate Altermath-inspired coarse-equal/response-different probe is a toy control, not empirical theory validation. Export a local-only JSON receipt.

See [Pocket Field Lab protocol and limitations](docs/POCKET_FIELD_LAB.md). Neither the shader appearance nor the codec creates unlimited storage or recovers data directly from raster pixels.

## Explore

- **Origin:** dense, slowly flowing RGB microdot field

- **Drift:** a responsive, relaxed RGB point field
- **Lattice:** a square-like ordered particle array
- **Vortex:** a depth-projected spiral
- **Nested:** six-fold clusters and counter-rotating rings inspired by NBG
- Adjust virtual dot resolution, motion rate, and camera zoom (0.25×–16×)
- Pause/resume, regenerate a deterministic field, and save a PNG snapshot
- Observe a clearly labeled, **synthetic** signal/event ledger
- Respects reduced-motion preference on first load; controls are keyboard accessible

## Boundaries and provenance

- **SIMULATED:** generated demo data only. The prototype's visuals fall in this class.
- **OBSERVED:** a measured event from an instrumented adapter (future).
- **VERIFIED:** an event supported by an explicit verification process (future).
- **INFERRED:** a derived or interpreted value, not a direct observation (future).
- **UNKNOWN:** provenance was not established.

The geometry is an **encoding chosen by CFD**, never proof of the structure of a model's internal reasoning. See [architecture](docs/ARCHITECTURE.md) and [roadmap](docs/ROADMAP.md).

## Build and publish

CI tests and builds all PRs. After merge to `main`, the Pages workflow builds the static site with `/CFD/` as its base path. Enable **Settings → Pages → Build and deployment → GitHub Actions** for the repository if needed. No API keys, backend, telemetry harvesting, tracking, or external model downloads are used by the prototype.

## Values

**People Above Profit · Ledger Above Ego · Peace Above Drama · Laughter Before Hatred · Bounce First, Discuss Later.**

Original implementation. MIT licensed. Research and creative inspiration do not imply scientific validation.
