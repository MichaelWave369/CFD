import { useEffect, useMemo, useRef, useState } from "react";
import { checksum32 } from "../lib/pocketField.mjs";
import {
  OPTICAL_SIZE, makeOpticalCarrier, warpOpticalCarrier, decodeOpticalImage
} from "../lib/opticalPocket.mjs";

const enc = new TextEncoder();
const initial = enc.encode("The pocket keeps its address when the square begins to move.");
function sampleKilobyte() {
  const bytes = new Uint8Array(1024);
  let seed = 0x369cfd;
  for (let i = 0; i < bytes.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    bytes[i] = seed >>> 24;
  }
  return bytes;
}
function Slider({ id, label, value, min, max, step, unit, onChange }) {
  return <label htmlFor={id} className="optical-slider">
    <span>{label} <strong>{value}{unit}</strong></span>
    <input type="range" id={id} value={value} min={min} max={max} step={step}
      onChange={event => onChange(Number(event.target.value))}/>
  </label>;
}

export default function OpticalPocketLab() {
  const canvasRef = useRef(null);
  const [text, setText] = useState("The pocket keeps its address when the square begins to move.");
  const [bytes, setBytes] = useState(initial);
  const [angle, setAngle] = useState(11);
  const [shear, setShear] = useState(0.12);
  const [scale, setScale] = useState(0.93);
  const [offsetX, setOffsetX] = useState(6);
  const [offsetY, setOffsetY] = useState(-7);
  const [imported, setImported] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("SIMULATED / LOCAL ENCODE");
  const settings = { angle, shear, scale, offsetX, offsetY };

  const generated = useMemo(() =>
    warpOpticalCarrier(makeOpticalCarrier(bytes), settings),
    [bytes, angle, shear, scale, offsetX, offsetY]);
  const activeImage = imported ?? generated;
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const canvas = canvasRef.current;
    canvas.width = OPTICAL_SIZE; canvas.height = OPTICAL_SIZE;
    ctx.putImageData(new ImageData(activeImage.data, OPTICAL_SIZE, OPTICAL_SIZE), 0, 0);
  }, [activeImage]);

  function changeGeometry(key, value) {
    setImported(null); setReport(null); setError("");
    setOrigin("SIMULATED / LOCAL AFFINE WARP");
    ({ angle: setAngle, shear: setShear, scale: setScale,
      offsetX: setOffsetX, offsetY: setOffsetY })[key](value);
  }
  function encodeText() {
    const next = enc.encode(text);
    if (next.length > 1024) { setError("Payload exceeds the 1,024-byte limit."); return; }
    setBytes(next); setImported(null); setReport(null); setError("");
    setOrigin("USER_AUTHORED / LOCAL ENCODE");
  }
  function encodeSample() {
    setBytes(sampleKilobyte()); setImported(null); setReport(null); setError("");
    setOrigin("SIMULATED / 1 KIB SAMPLE");
  }
  function readPixels() {
    try {
      const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas readback unavailable.");
      const pixels = ctx.getImageData(0, 0, OPTICAL_SIZE, OPTICAL_SIZE);
      const result = decodeOpticalImage(pixels);
      setReport({ passed: result.passed, reason: result.reason,
        length: result.length ?? 0, checksum: result.checksum ?? null,
        markerError: result.markerError, determinant: result.determinant,
        method: result.method ?? "FAILED_CALIBRATION",
        at: new Date().toISOString(), origin, provenance: "SIMULATED_OR_USER_SUPPLIED" });
      setError("");
    } catch (err) { setError(err.message); }
  }
  function savePng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "CFD-optical-pocket-900px.png";
    link.click();
  }
  async function importPng(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (file.type !== "image/png") { setError("Only PNG files are supported."); return; }
    try {
      const bmp = await createImageBitmap(file);
      try {
        if (bmp.width !== OPTICAL_SIZE || bmp.height !== OPTICAL_SIZE) {
          throw new Error("PNG must be exactly 900 × 900 pixels.");
        }
        const canvas = document.createElement("canvas");
        canvas.width = OPTICAL_SIZE; canvas.height = OPTICAL_SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Cannot read imported image.");
        ctx.drawImage(bmp, 0, 0);
        const image = ctx.getImageData(0, 0, OPTICAL_SIZE, OPTICAL_SIZE);
        setImported({ width: image.width, height: image.height, data: image.data });
        setOrigin("USER_UPLOADED / ORIGIN UNKNOWN");
        setReport(null); setError("");
      } finally { bmp.close?.(); }
    } catch (err) { setError(err.message); }
  }
  function exportReceipt() {
    if (!report) return;
    const receipt = {
      experiment: "CFD Elastic Optical Recovery v0.5",
      schema: 1, provenance: report.provenance,
      decoderInput: "Visible 900x900 RGBA pixels only, no transform metadata",
      distortionLimit: "2D affine rotation/shear/scale/translation only; NOT nonlinear elastic recovery",
      displaySettingsIfLocal: imported ? null : settings,
      encodedSampleChecksumIfLocal: imported ? null : checksum32(bytes),
      result: report
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "CFD-optical-receipt.json"; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section id="optical-pocket" className="optical-lab" aria-labelledby="optical-title">
    <div className="optical-heading">
      <div><div className="eyebrow">06 / EXPERIMENTAL OPTICAL DECODER · CFD 0.5</div>
        <h2 id="optical-title">Elastic Optical <em>Recovery.</em></h2>
        <p>Rotate, shear, and scale a genuine encoded image. Four self-identifying registration markers allow a separate decoder to infer the transformation from the pixels.</p>
      </div>
      <span className="optical-chip">NO KNOWN TRANSFORM PROVIDED TO DECODER</span>
    </div>
    <div className="optical-grid">
      <div className="optical-visual">
        <div className="optical-toolbar"><span>900 × 900 PIXEL FIELD</span><span>4 REGISTRATION MARKERS</span></div>
        <canvas ref={canvasRef} role="img" className="optical-canvas" aria-label="Rotated and sheared data grid with red, green, yellow and violet registration markers." />
        <div className="optical-toolbar"><span>DATA + FIDUCIALS</span><span>{imported ? "IMPORTED PNG" : "LOCAL GENERATED"}</span></div>
        <p>Marker positions come from image scans, not the distortion sliders. Pixel decoding still requires the exact 900×900 frame and an affine transformation.</p>
      </div>
      <div className="optical-controls">
        <label htmlFor="optical-message">ENCODE UP TO 1,024 UTF-8 BYTES</label>
        <textarea id="optical-message" value={text} rows={2} maxLength={1800} onChange={e => setText(e.target.value)} />
        <div className="optical-actions">
          <button type="button" onClick={encodeText}>ENCODE TEXT</button>
          <button type="button" onClick={encodeSample}>ENCODE 1 KiB</button>
        </div>
        <div className="optical-rule" />
        <Slider id="optical-angle" label="ROTATION" value={angle} min={-15} max={15} step={1} unit="°" onChange={v => changeGeometry("angle",v)} />
        <Slider id="optical-shear" label="ELASTIC-LIKE SHEAR" value={shear} min={-0.16} max={0.16} step={0.01} unit="" onChange={v => changeGeometry("shear",v)} />
        <Slider id="optical-scale" label="IMAGE SCALE" value={scale} min={0.85} max={1} step={0.01} unit="×" onChange={v => changeGeometry("scale",v)} />
        <Slider id="optical-offsetx" label="HORIZONTAL OFFSET" value={offsetX} min={-12} max={12} step={1} unit=" px" onChange={v => changeGeometry("offsetX",v)} />
        <Slider id="optical-offsety" label="VERTICAL OFFSET" value={offsetY} min={-12} max={12} step={1} unit=" px" onChange={v => changeGeometry("offsetY",v)} />
        <button className="optical-read" type="button" onClick={readPixels}>DETECT MARKERS + RECOVER BYTES</button>
        <div className="optical-actions">
          <button type="button" onClick={savePng}>↓ SAVE PNG</button>
          <label className="optical-upload" htmlFor="optical-file">↑ IMPORT PNG</label>
          <input id="optical-file" type="file" accept="image/png" onChange={importPng} />
        </div>
        {report && <div className="optical-result" aria-live="polite">
          <strong className={report.passed ? "optical-pass" : "optical-fail"}>
            {report.passed ? "PASS / PIXEL BYTES RECOVERED" : "FAIL / " + report.reason}
          </strong>
          <span>{report.length} BYTES · HASH {report.checksum ?? "UNAVAILABLE"}</span>
          {report.markerError != null && <span>FIDUCIAL RESIDUAL {report.markerError.toFixed(3)} px</span>}
          <small>{report.origin} · {report.method}</small>
        </div>}
        {error && <p className="optical-error" role="alert">{error}</p>}
        <button type="button" className="optical-receipt" disabled={!report} onClick={exportReceipt}>↓ EXPORT EVIDENCE RECEIPT</button>
      </div>
    </div>
    <p className="optical-caveat">Research boundary: “elastic” here means a uniform invertible affine shear, not arbitrary nonlinear rubber-sheet distortion. The decoder has no source message or slider values, but is designed for the known four-color fiducial format. Results do not imply unlimited storage, actual extra spatial dimensions, or scientific validation of Altermath.</p>
  </section>;
}
