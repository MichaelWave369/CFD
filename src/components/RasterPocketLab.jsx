import { useEffect, useRef, useState } from "react";
import {
  RASTER_SIZE, RASTER_MAX_BYTES,
  makeRasterPocketImage, decodeRasterPocketImage,
  damageRasterPixels, damageRasterReplicas
} from "../lib/rasterPocket.mjs";

const initialText = "Ledger above ego. Bytes above pretty pixels.";
const encoder = new TextEncoder();

function kilobyteSample() {
  const bytes = new Uint8Array(RASTER_MAX_BYTES);
  let state = 0x369cfdae;
  for (let i = 0; i < bytes.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    bytes[i] = state >>> 24;
  }
  return bytes;
}

export default function RasterPocketLab() {
  const canvasRef = useRef(null);
  const [frame, setFrame] = useState(() => makeRasterPocketImage(encoder.encode(initialText)));
  const [text, setText] = useState(initialText);
  const [source, setSource] = useState("SIMULATED / LOCAL ENCODE");
  const [noise, setNoise] = useState(0.12);
  const [report, setReport] = useState(null);
  const [problem, setProblem] = useState("");
  const [nonce, setNonce] = useState(369);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = RASTER_SIZE; canvas.height = RASTER_SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) ctx.putImageData(new ImageData(frame.data, frame.width, frame.height), 0, 0);
  }, [frame]);

  function fromCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!ctx || !canvas || canvas.width !== RASTER_SIZE || canvas.height !== RASTER_SIZE) {
      throw new Error("Raster canvas unavailable");
    }
    const image = ctx.getImageData(0, 0, RASTER_SIZE, RASTER_SIZE);
    return { width: image.width, height: image.height, data: image.data };
  }
  function setImage(bytes, origin) {
    try {
      const image = makeRasterPocketImage(bytes);
      setFrame(image); setSource(origin); setReport(null); setProblem("");
    } catch (err) { setProblem(err.message); }
  }
  function decode() {
    try {
      // Deliberately pass only ImageData from the visible canvas to the decoder.
      // Original bytes and logical addresses are NOT available to the decode function.
      const recovered = decodeRasterPocketImage(fromCanvas());
      setReport({ passed: recovered.passed, reason: recovered.reason,
        length: recovered.length, checksum: recovered.checksum,
        expected: recovered.expected, disagreements: recovered.disagreements,
        at: new Date().toISOString(), source });
      setProblem(""); 
    } catch (err) { setProblem(err.message); }
  }
  function applyDamage(kind) {
    try {
      const image = fromCanvas();
      setFrame(kind === "noise"
        ? damageRasterPixels(image, noise, nonce)
        : damageRasterReplicas(image, kind === "single" ? 1 : 2));
      setNonce(n => n + 1); setReport(null); setProblem("");
    } catch (err) { setProblem(err.message); }
  }
  function savePng() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = "CFD-raster-pocket-1kb.png";
    link.click();
  }
  async function loadPng(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "image/png") { setProblem("Only PNG images are supported."); return; }
    try {
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width !== RASTER_SIZE || bitmap.height !== RASTER_SIZE) {
          throw new RangeError("Image must be exactly 492 × 492 pixels without cropping or rescaling.");
        }
        const off = document.createElement("canvas");
        off.width = RASTER_SIZE; off.height = RASTER_SIZE;
        const ctx = off.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Cannot read PNG pixels");
        ctx.drawImage(bitmap, 0, 0);
        const pixels = ctx.getImageData(0, 0, RASTER_SIZE, RASTER_SIZE);
        setFrame({ width: pixels.width, height: pixels.height, data: pixels.data });
        setSource("USER_UPLOADED / ORIGIN UNKNOWN");
        setReport(null); setProblem("");
      } finally { bitmap.close?.(); }
    } catch (err) { setProblem(err.message); }
  }
  function exportReceipt() {
    if (!report) return;
    const receipt = {
      experiment: "CFD Raster Pocket Reader v0.4", schema: 1,
      method: "Triply replicated module bits, majority vote on raster pixels, FNV-1a32 integrity",
      limitations: "Exact 492x492 orientation required; no perspective correction, elastic inversion, cryptographic authenticity, or guaranteed error correction.",
      dimensions: { width: RASTER_SIZE, height: RASTER_SIZE },
      channel: source, noiseControl: noise, result: report
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "CFD-raster-receipt.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section id="raster-pocket" className="raster-lab" aria-labelledby="raster-title">
      <header className="raster-head">
        <div>
          <div className="eyebrow">05 / PIXEL EVIDENCE EXPERIMENT · CFD 0.4</div>
          <h2 id="raster-title">Raster Pocket <em>Reader.</em></h2>
          <p>A real, local pixel-encoded 1 KiB grid with a separate decoder. Damage the image. Then see whether the bytes survive.</p>
        </div>
        <span className="raster-chip">IMAGE → BYTES</span>
      </header>
      <div className="raster-grid">
        <div className="raster-viewport">
          <div className="raster-minihead"><span>492 × 492 IMAGE</span><span>164 × 164 MODULES</span></div>
          <canvas ref={canvasRef} className="raster-canvas" aria-label="Pixel-encoded data image with cyan and navy square modules and corner orientation markers." role="img" />
          <div className="raster-minihead"><span>3 REPLICAS / BIT</span><span>LOCAL · NO SERVER</span></div>
          <p>Unlike the decorative field, this image contains actual encoded bytes. The pixel reader does not receive the original payload.</p>
        </div>
        <div className="raster-controls">
          <label htmlFor="raster-text">UTF-8 data to encode (maximum 1,024 bytes)</label>
          <textarea id="raster-text" value={text} rows={2} maxLength={1800}
            onChange={event => setText(event.target.value)} />
          <div className="raster-action-row">
            <button type="button" onClick={() => setImage(encoder.encode(text), "USER_AUTHORED / LOCAL ENCODE")}>ENCODE TEXT</button>
            <button type="button" onClick={() => setImage(kilobyteSample(), "SIMULATED / 1 KIB SAMPLE")}>ENCODE 1 KiB</button>
          </div>
          <button className="raster-verify" type="button" onClick={decode}>READ VISIBLE PIXELS</button>
          <div className="raster-rule" />
          <label htmlFor="raster-noise">RANDOM PIXEL NOISE · {Math.round(noise * 100)}%</label>
          <input id="raster-noise" type="range" min="0" max="0.5" step="0.01"
            value={noise} onChange={event => setNoise(Number(event.target.value))} />
          <div className="raster-action-row">
            <button type="button" onClick={() => applyDamage("noise")}>APPLY NOISE</button>
            <button type="button" onClick={() => applyDamage("single")}>BREAK 1 COPY</button>
            <button type="button" onClick={() => applyDamage("double")}>BREAK 2 COPIES</button>
          </div>
          <div className="raster-rule" />
          <div className="raster-action-row">
            <button type="button" onClick={savePng}>↓ SAVE PNG</button>
            <label className="raster-file-label" htmlFor="raster-file">↑ READ SAVED PNG</label>
            <input type="file" id="raster-file" accept="image/png" onChange={loadPng} />
          </div>
          {report && <div className="raster-result" aria-live="polite">
            <strong className={report.passed ? "raster-success" : "raster-failure"}>
              {report.passed ? "PASS / EXACT PIXEL RECOVERY" : "FAIL / " + report.reason}
            </strong>
            <span>READ {report.length} BYTES · {report.disagreements} BIT-VOTE DISAGREEMENTS</span>
            {report.checksum && <span>FNV32 {report.checksum}</span>}
            <small>SOURCE: {report.source}</small>
          </div>}
          {problem && <p className="raster-error" role="alert">{problem}</p>}
          <button type="button" className="raster-receipt" onClick={exportReceipt} disabled={!report}>↓ EXPORT RASTER RECEIPT</button>
        </div>
      </div>
      <p className="raster-boundary">Bounded research demo: triplicate storage adds redundancy rather than compression. Reading is from actual pixels but requires an unrotated, unscaled 492 × 492 frame. FNV detects accidental changes, not malicious tampering. This does not decode the animated CFD field or demonstrate unlimited storage.</p>
    </section>
  );
}
