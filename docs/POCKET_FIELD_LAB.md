# Infinite Pocket Field · CFD v0.3 experimental protocol

**Status:** local, simulated, finite prototype. No model, neural, or external sensor connection. Original implementation.

## Why this experiment exists

The creator observed apparent ring columns, corner rings, cross/diamond alternations, and elastic pulling in CFD's synthetic RGB microdot field. The visible texture may include moiré and sampling artifacts. This experiment turns those observations into adjustable *generative parameters*, not claims about literal higher-dimensional space or new laws of physics.

## Layers and data flow

1. **Finite pocket addressing:** A quadtree starts from an empty-string root. Digits `0=NW`, `1=NE`, `2=SW`, `3=SE` designate recursive child cells. At depth six there are `4^6 = 4096` unique logical leaf addresses. A reversed-base-four bijection spreads sequential payload positions through the field. Depth is capped, with no infinity or capacity creation.
2. **Visual projection:** A browser Canvas 2D draws procedural ring interference, curved columns, corner oscillators, cross/diamond phases, and a bounded Mandelbrot escape-time family. Controls labeled 2/4/6 count independent procedural parameter contributions; they are **not spatial dimensions**. Visual pixels are a generated presentation, not bytes stored in luminous points.
3. **Invertible elastic map:** The geometry uses two sequential sinusoidal shears plus a 0–45° rotation about the center, with an analytic inverse. Every projected leaf center is inverted and quantized back to its recursive address. The warped picture can extend outside the unit square and be clipped by the viewport.
4. **Local byte payload:** Input may be user-authored UTF-8 or a deterministic synthetic 1,024-byte sample. Each byte is assigned a unique depth-six logical address. The finite maximum is 1,024 bytes per experiment, even though the quadtree has 4,096 potential leaves.
5. **Verification:** For each cell, encode its canonical center, apply the map, invert the map, recover the canonical address, and rebuild bytes by original position. Compare an FNV-1a32 integrity checksum. A one-bit change should fail. This tests address consistency under a *known* continuous deformation, **not** optical recovery from an image, error correction, robust physical storage, cryptographic authenticity, or compression.
6. **Altermath-style toy control:** Two four-element hidden configurations have equal coarse sum (zero), yet produce distinct results under the *declared* weighted probe. This illustrates how coarse equality can conceal interaction differences. It is an illustrative constructed counterexample to closure under a particular projection, not new empirical confirmation of Altermath.
7. **Evidence receipt:** A manually exported JSON report records declared parameters, payload length and checksum, simulated provenance, test result, timestamp, and toy control. The app does not automatically save or upload personal content.

## Reproduce

Run `npm install && npm test && npm run build`. In the browser, use **EXPLORE INFINITE POCKET FIELD**, switch Hybrid/Rings/Columns/Mandelbrot, adjust elastic shear, diamond orientation and 2/4/6 parameter groups, and navigate quadrants. Use **ENCODE 1 KB → VERIFY ROUND-TRIP** and expect **PASS**, then **CORRUPT BYTE → VERIFY ROUND-TRIP** and expect **FAIL**. Export a receipt after verification if desired.

Checks include all 4,096 leaf address identities, invertibility sweeps (including full 45° rotation), exact 1 KiB recovery under multiple distortions, empty/non-power-of-four payloads, over-capacity rejection, corruption rejection, toy nonclosure, and bounded Mandelbrot membership.

## Known limitations and next gates

- Browser screenshot QA for GPU/browser differences, mobile layout, keyboard navigation, reduced-motion behavior, performance, actual observed ring-column resemblance, and meaningful moiré control is still required.
- Canvas samples 220×220 procedural colors and scales to the viewport; it does **not** render infinitely many physical cells or use the v0.2 WebGL field's virtual dot lattice.
- The codec is deliberately independent of rendered pixels. Future work would test raster noise, sampling, quantization, erasures, and independent image-based decoding before making stronger storage claims.
- A future spatial representation may support relational state across cells, but this release stores just leaf byte values. A standalone causal dynamics model with an explicit coarse-graining map is required before Altermath-specific scientific conclusions.
- Any externally derived source requires independently documented provenance. No speculative dimension counting from perceived shapes.

**Ledger Above Ego:** a successful checksum is evidence for a reversible mathematical prototype, not proof of unbounded storage, real six-dimensional geometry, or novel physics.
