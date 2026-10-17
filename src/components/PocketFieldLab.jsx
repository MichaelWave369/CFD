import { useEffect, useRef, useState } from "react";
import {
  MAX_PAYLOAD_BYTES, POCKET_DEPTH, PATTERN_FAMILIES, addressForPoint,
  boundsForAddress, centerForAddress, encodePocketBytes,
  hiddenStateProbe, mandelbrotEscape, recoverPocketBytes,
  unwarpPoint, warpPoint
} from "../lib/pocketField.mjs";

const TAU = Math.PI * 2;
const CORNERS = ["NW", "NE", "SW", "SE"];
const clampByte = n => Math.max(0, Math.min(255, Math.round(n)));
const defaultText = "PocketSquare: the address survives when the displayed geometry bends.";

function syntheticKilobyte() {
  const data = new Uint8Array(MAX_PAYLOAD_BYTES);
  let seed = 0x369cfd;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed >>> 24;
  }
  return data;
}

// 2D appearance is driven by 2, 4 or 6 explicit parameters;
// it is not a measurement of spatial dimensionality.
function sampleField(nx, ny, opts, time, region) {
  const p = unwarpPoint(nx, ny, opts.elasticity, opts.diamond);
  const wx = region.x + p.x * region.size;
  const wy = region.y + p.y * region.size;
  if (opts.pattern === "mandelbrot") {
    const iter = mandelbrotEscape(-1.9 + wx * 3, -1.5 + wy * 3, 36);
    if (iter === 36) return [6, 11, 25];
    const t = iter / 36;
    return [
      clampByte(17 + 90 * Math.sin(TAU * t + 1.1) ** 2),
      clampByte(19 + 125 * Math.sin(TAU * t + 2.9) ** 2),
      clampByte(37 + 180 * Math.sin(TAU * t + 4.5) ** 2)
    ];
  }
  const x = (p.x - 0.5) * 2, y = (p.y - 0.5) * 2;
  const r = Math.hypot(x, y);
  const ring = Math.cos(41 * r - time * 0.9);
  let corner = 0;
  for (const [cx, cy] of [[-0.78,-0.78],[0.78,-0.78],[-0.78,0.78],[0.78,0.78]]) {
    const dist = Math.hypot(x - cx, y - cy);
    corner += Math.cos(35 * dist + time * 0.48) * Math.exp(-2.7 * dist);
  }
  const column = Math.sin(31 * (x + 0.13 * Math.sin(8 * y + time * 0.32)) + time * 0.36)
    * Math.cos(20 * y + 5 * r - time * 0.25);
  const cross = Math.exp(-13 * Math.min(Math.abs(x), Math.abs(y)));
  const diamondWave = Math.cos(25 * (Math.abs(x) + Math.abs(y)) - time * 0.38);
  const base = opts.pattern === "rings"
    ? ring * 0.68 + corner * 0.35
    : opts.pattern === "columns"
      ? column * 0.83 + corner * 0.22
      : 0.4 * ring + 0.42 * column + 0.34 * corner;
  const extra4 = opts.axes >= 4 ? 0.19 * Math.sin(18 * (x + y) + time * 0.42) + 0.18 * diamondWave : 0;
  const extra6 = opts.axes >= 6 ? 0.13 * Math.cos(16 * (x - y) - time * 0.39) + 0.12 * Math.sin(12 * r + time) : 0;
  const wave = base + extra4 + extra6 + cross * 0.18;
  const glow = Math.pow(Math.max(0, wave + 0.38) / 2.8, 1.25);
  const strands = Math.max(0, 0.5 + 0.5 * column) * glow;
  return [
    clampByte(7 + 112 * glow + 25 * strands),
    clampByte(10 + 158 * glow + 46 * Math.max(0, corner) * glow),
    clampByte(24 + 205 * glow + 21 * Math.max(0, diamondWave) * glow)
  ];
}

function drawGrid(ctx, size, opts) {
  ctx.lineWidth = Math.max(0.75, size / 650);
  for (let axis = 0; axis < 2; axis++) {
    for (let k = 0; k <= 4; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 36; i++) {
        const t = i / 36;
        const pt = axis === 0 ? warpPoint(k / 4, t, opts.elasticity, opts.diamond)
          : warpPoint(t, k / 4, opts.elasticity, opts.diamond);
        const sx = pt.x * size, sy = pt.y * size;
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = k % 2 === 0 ? "rgba(116,224,230,.29)" : "rgba(161,141,252,.19)";
      ctx.stroke();
    }
  }
}

function drawPacket(ctx, size, opts, packet, region) {
  if (!packet) return;
  const stride = Math.max(1, Math.ceil(packet.cells.length / 240));
  for (let i = 0; i < packet.cells.length; i += stride) {
    const cell = packet.cells[i], center = centerForAddress(cell.address);
    const lx = (center.x - region.x) / region.size, ly = (center.y - region.y) / region.size;
    if (lx < 0 || lx >= 1 || ly < 0 || ly >= 1) continue;
    const q = warpPoint(lx, ly, opts.elasticity, opts.diamond);
    const radius = Math.max(1, size / 400);
    ctx.fillStyle = "rgba(140,252,211,.84)";
    ctx.fillRect(q.x * size - radius / 2, q.y * size - radius / 2, radius, radius);
  }
}

export default function PocketFieldLab() {
  const canvasRef = useRef(null);
  const [path, setPath] = useState("");
  const [pattern, setPattern] = useState("hybrid");
  const [elasticity, setElasticity] = useState(0.68);
  const [diamond, setDiamond] = useState(0.3);
  const [axes, setAxes] = useState(6);
  const [paused, setPaused] = useState(() =>
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  const [message, setMessage] = useState(defaultText);
  const [packet, setPacket] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [showProbe, setShowProbe] = useState(false);
  const [motionSeed, setMotionSeed] = useState(0);
  const [depth, setDepth] = useState(POCKET_DEPTH);
  const opts = { pattern, elasticity, diamond, axes };
  const region = boundsForAddress(path);
  const probe = hiddenStateProbe();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const offscreen = document.createElement("canvas");
    offscreen.width = 220;
    offscreen.height = 220;
    const off = offscreen.getContext("2d", { alpha: false });
    if (!off) return;
    const pixels = off.createImageData(220, 220);
    let frameId = 0, active = true, last = 0, elapsed = 0, prev = 0;
    const box = canvas.getBoundingClientRect();
    const size = Math.max(240, Math.min(900, Math.round(box.width * Math.min(devicePixelRatio || 1, 1.5))));
    canvas.width = size;
    canvas.height = size;
    function paint(timestamp) {
      if (!active) return;
      if (!prev) prev = timestamp;
      if (!paused) elapsed += Math.min((timestamp - prev) / 1000, 0.08);
      prev = timestamp;
      if (!last || timestamp - last >= (pattern === "mandelbrot" ? 140 : 70)) {
        const time = elapsed + motionSeed;
        for (let y = 0; y < 220; y++) {
          for (let x = 0; x < 220; x++) {
            const color = sampleField((x + 0.5) / 220, (y + 0.5) / 220, opts, time, region);
            const p = (y * 220 + x) * 4;
            pixels.data[p] = color[0]; pixels.data[p + 1] = color[1];
            pixels.data[p + 2] = color[2]; pixels.data[p + 3] = 255;
          }
        }
        off.putImageData(pixels, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(offscreen, 0, 0, size, size);
        drawGrid(ctx, size, opts);
        drawPacket(ctx, size, opts, packet, region);
        last = timestamp;
      }
      frameId = requestAnimationFrame(paint);
    }
    frameId = requestAnimationFrame(paint);
    return () => { active = false; cancelAnimationFrame(frameId); };
  }, [path, pattern, elasticity, diamond, axes, paused, packet, motionSeed]);

  function navigate(quadrant) {
    setPath(p => p.length < depth ? p + String(quadrant) : p);
  }
  function clickField(event) {
    if (path.length >= depth) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = unwarpPoint(
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height, elasticity, diamond
    );
    if (point.x >= 0 && point.x < 1 && point.y >= 0 && point.y < 1) {
      navigate(Number(addressForPoint(point.x, point.y, 1)));
    }
  }
  function encode(bytes) {
    try {
      const result = encodePocketBytes(bytes);
      setPacket(result); setPath(""); setReport(null); setError("");
    } catch (e) { setError(e.message); }
  }
  function corrupt() {
    if (!packet?.cells.length) return;
    setPacket(p => ({ ...p, cells: p.cells.map((cell, i) =>
      i === Math.floor(p.cells.length / 2) ? { ...cell, byte: cell.byte ^ 1 } : cell) }));
    setReport(null);
  }
  function verify() {
    if (!packet) return;
    try {
      const result = recoverPocketBytes(packet, elasticity, diamond);
      setReport({
        passed: result.passed, recovered: result.recovered, total: result.total,
        checksum: result.checksum, expected: packet.checksum,
        at: new Date().toISOString(), provenance: "SIMULATED"
      });
      setError("");
    } catch (e) { setReport(null); setError(e.message); }
  }
  function exportReceipt() {
    if (!report || !packet) return;
    const receipt = {
      experiment: "CFD Pocket Field Lab 0.3", schema: 1, provenance: "SIMULATED",
      note: "Analytically reversible 2D transform with exact address lookup; not image-based decoding, compression, infinite storage, or physics evidence.",
      parameters: { pattern, elasticity, diamond, axes, depth: packet.depth, path, motionSeed },
      packet: { length: packet.length, checksum: packet.checksum }, result: report,
      nonclosureToy: probe
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "CFD-pocket-receipt.json";
    a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section id="pocket-lab" className="pocket-lab" aria-labelledby="pocket-title">
      <div className="pocket-heading">
        <div><div className="eyebrow">04 / EXPERIMENTAL WORKSPACE · SIMULATED</div>
          <h2 id="pocket-title">Infinite Pocket <em>Field.</em></h2>
          <p>Recursive square addresses, elastic rings and projections, and reversible data recovery. Finite implementation; expandable mathematics.</p>
        </div>
        <span className="pocket-chip">CFD 0.3 · PROTOTYPE</span>
      </div>
      <div className="pocket-layout">
        <div className="pocket-visual">
          <div className="pocket-toolbar"><span>POCKET / {path || "ROOT"}</span><span>LEVEL {path.length} / {depth}</span></div>
          <canvas ref={canvasRef} onClick={clickField} className="pocket-canvas"
            role="img" aria-label="Simulated procedural point field. Click a visible quadrant to explore the next recursively addressed region. Accessible quadrant buttons are below." />
          <div className="pocket-toolbar"><span>2D PROJECTION · {axes} PARAMETERS</span><span>{packet ? packet.length + " ADDRESSED BYTES" : "NO PAYLOAD"}</span></div>
          <div className="pocket-nav" aria-label="Pocket navigation">
            <button type="button" onClick={() => setPath(p => p.slice(0, -1))} disabled={!path}>↑ UP</button>
            <button type="button" onClick={() => setPath("")} disabled={!path}>⌂ ROOT</button>
            {CORNERS.map((corner, index) => (
              <button type="button" key={corner} onClick={() => navigate(index)}
                disabled={path.length >= depth} aria-label={"Enter " + corner + " quadrant"}>{corner}</button>
            ))}
          </div>
          <div className="pocket-info">Four logical children per pocket. Zoom generates views on demand; stored bytes remain at finite six-level addresses.</div>
        </div>
        <div className="pocket-controls">
          <div className="pocket-label">PATTERN FAMILY</div>
          <div className="pocket-choice">
            {PATTERN_FAMILIES.map(name => <button key={name} type="button" className={pattern === name ? "active" : ""}
              aria-pressed={pattern === name} onClick={() => setPattern(name)}>{name}</button>)}
          </div>
          <label className="pocket-slider">ELASTIC SHEAR <strong>{elasticity.toFixed(2)}</strong>
            <input type="range" min="0" max="1" step="0.02" value={elasticity} onChange={e => setElasticity(Number(e.target.value))} />
          </label>
          <label className="pocket-slider">CROSS → DIAMOND <strong>{Math.round(diamond * 45)}°</strong>
            <input type="range" min="0" max="1" step="0.02" value={diamond} onChange={e => setDiamond(Number(e.target.value))} />
          </label>
          <label className="pocket-slider">EXPLORATION DEPTH <strong>{depth} / {POCKET_DEPTH}</strong>
            <input type="range" min="1" max={POCKET_DEPTH} step="1" value={depth}
              onChange={e => { const n = Number(e.target.value); setDepth(n); setPath(p => p.slice(0, n)); }} />
          </label>
          <div className="pocket-label">PROJECTION PARAMETERS · NOT SPATIAL DIMENSIONS</div>
          <div className="pocket-choice">
            {[2, 4, 6].map(value => <button type="button" key={value} className={axes === value ? "active" : ""}
              aria-pressed={axes === value} onClick={() => setAxes(value)}>{value} axes</button>)}
          </div>
          <div className="pocket-actions">
            <button type="button" onClick={() => setPaused(p => !p)}>{paused ? "▶ RESUME" : "Ⅱ PAUSE"}</button>
            <button type="button" onClick={() => setMotionSeed(s => s + 1.618)}>↻ REPHASE</button>
          </div>
          <div className="pocket-divider" />
          <div className="pocket-label">BYTE RECOVERY EXPERIMENT · MAX 1,024 BYTES</div>
          <label className="pocket-input-label" htmlFor="pocket-message">UTF-8 payload</label>
          <textarea id="pocket-message" rows="2" value={message} maxLength={1600}
            onChange={e => setMessage(e.target.value)} />
          <div className="pocket-actions">
            <button type="button" onClick={() => encode(new TextEncoder().encode(message))}>ENCODE TEXT</button>
            <button type="button" onClick={() => encode(syntheticKilobyte())}>ENCODE 1 KB</button>
          </div>
          <div className="pocket-actions">
            <button type="button" disabled={!packet} onClick={verify}>VERIFY ROUND-TRIP</button>
            <button type="button" disabled={!packet?.length} onClick={corrupt}>CORRUPT BYTE</button>
          </div>
          {packet && <div className="pocket-result">
            <span>DEPTH {packet.depth} · {packet.length} BYTES · FNV32 {packet.checksum}</span>
            {report && <strong className={report.passed ? "pocket-pass" : "pocket-fail"}>
              {report.passed ? "PASS · EXACT RECOVERY" : "FAIL · INTEGRITY MISMATCH"} · {report.recovered}/{report.total} ADDRESSES
            </strong>}
          </div>}
          {error && <div role="alert" className="pocket-error">{error}</div>}
          <button className="pocket-export" type="button" onClick={exportReceipt} disabled={!report}>↓ EXPORT EVIDENCE RECEIPT</button>
          <div className="pocket-divider" />
          <div className="pocket-label">ALTERMATH · TOY NONCLOSURE PROBE</div>
          <p className="pocket-muted">Two hidden configurations share the same coarse sum, but a weighted interaction distinguishes them.</p>
          <button className="pocket-export" type="button" onClick={() => setShowProbe(p => !p)}
            aria-expanded={showProbe}>{showProbe ? "HIDE" : "INSPECT"} HIDDEN-STATE PAIR</button>
          {showProbe && <div className="pocket-result" aria-live="polite">
            <span>COARSE SUM A / B: {probe.coarseA} / {probe.coarseB} (SAME)</span>
            <strong>PROBE RESPONSE A / B: {probe.responseA} / {probe.responseB} (DIFFERENT)</strong>
            <small>Deterministic constructed example, not empirical validation of Altermath.</small>
          </div>}
        </div>
      </div>
      <p className="pocket-disclaimer">All field imagery and payloads are simulated locally. Codec verification uses known point coordinates and an analytic inverse transform; it does not decode dots from a raster image, demonstrate compression, or provide unlimited physical storage. No external services or personal data collection.</p>
    </section>
  );
}
