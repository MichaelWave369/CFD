# Raster Pocket Reader · CFD v0.4

**Status:** experimental pixel-encoded data recovery prototype, local browser only.

## Progress beyond v0.3

The v0.3 quadtree codec can reconstruct logical leaf addresses from the known analytic inverse of a reversible coordinate map. That is useful but **does not read data from visible dots**.

This v0.4 track encodes independent binary bytes into a finite **164×164 module grid**, renders that as a **492×492 PNG-capable RGBA image**, and decodes the message from *only* pixel data supplied to `decodeRasterPocketImage(frame)`. The decoder is not given original payload bytes, a logical address map, or visual deformation parameters.

This format is original and deliberately minimal rather than a copy of QR or other established code formats. It is a toy research codec and **not appropriate for production backups or secure authentication**.

## The finite format

- 164×164 modules, with a two-module outer border and a 160×160 addressable interior.
- Three pixels per module edge, yielding 492×492 RGBA pixels.
- Four corner orientation markers, allowing basic detection of gross marker damage. **No perspective correction, rescaling, mirroring, rotation, or camera-frame search is implemented.**
- Payload limit **1,024 bytes (1 KiB)**.
- An 11-byte header: magic `CFDP`, version byte `1`, big-endian payload length, and four checksum bytes.
- Header plus maximum payload = 1,035 bytes = 8,280 encoded bits.
- Three fixed-capacity spatial replica bands: `8,280 × 3 = 24,840` interior modules used at the maximum packet size, fitting the 25,600 available interior modules. The unused slots remain dark.
- Every module is a colored binary cell. Decode first takes a majority of its nine actual RGB pixels, then a majority of three independent module replicas of each bit.
- Compare reconstructed data against the header's 32-bit FNV-1a integrity checksum. A matching checksum detects many accidental corruptions, but is **not cryptographic authentication**.

## Reproduce

```sh
npm install
npm test
npm run build
```

1. In **Raster Pocket Reader**, click **ENCODE 1 KiB** and **READ VISIBLE PIXELS**. Expect exact recovery from canvas pixels.
2. Select **APPLY NOISE** with a moderate noise percentage, then read again. The majority-vote reader may correct the damage. The tolerance is empirical and depends on the noise level and pattern.
3. Click **BREAK 1 COPY**, then decode. With two complete replicas intact, the original bytes should still be reconstructed.
4. Start with a fresh sample, click **BREAK 2 COPIES**, then decode. Expect an explicit failure, not a success claim.
5. **SAVE PNG**, then use **READ SAVED PNG** to load the actual exported image and decode its pixels.
6. Optionally export a local JSON evidence receipt with status, checksum, vote disagreements, source, and timestamp.

## What PASS means and does not mean

- **PASS**: image pixel data had the expected dimensions and corner markers; the decoded header identified a finite message; its bytes matched their stored FNV integrity checksum.
- **FAIL**: a structural, header, size, or checksum check did not verify. No attempt is made to fabricate recovery.
- A triple-repetition encoding **costs three times as many modules per bit**. It is redundancy, not compression and not unlimited information density.
- Corruption testing is deterministic in automated tests and manually adjustable in the UI.
- JPEG is not supported; use PNG to avoid lossy changes.
- File loading and all decoding are local to the browser. No upload service, telemetry, external model calls, or hidden sensor feed is used.
- This is not yet a codec for the **moving ring-column CFD artwork**. That more difficult experiment would need orientation/synchronization under deformation, quantization controls, and a falsifiable independent decoder.
- Procedural 2/4/6-parameter effects are not evidence for actual higher-dimensional spatial geometry or physics.
- Equal-coarse/different-response Altermath demonstrations are still constructed toy examples, not empirical proof of a scientific law.

## Further gates

- Browser visual QA and mobile accessibility.
- Optional independent grayscale screenshots (PNG exact dimensions), controlled resampling, simulated shear/diamond distortion, noise masks, cropped margins, and blur.
- Compare corruption/error performance against established baselines using measured bit/byte error rates, not adjectives.
- Add proper cryptographic content authenticity if the project ever needs adversarial verification.
- Do not claim optical geometric recovery until the independent decoder actually achieves it.

**Ledger Above Ego · Bytes recovered, claims bounded.**
