import { useMemo, useRef, useState } from "react";
import DenseFieldCanvas from "./components/DenseFieldCanvas.jsx";
import PocketFieldLab from "./components/PocketFieldLab.jsx";
import { MODES } from "./lib/field.mjs";
import { demoSignals } from "./lib/signals.mjs";
import { virtualDotCount } from "./lib/fieldViewport.mjs";

function RangeControl({ id, label, value, min, max, step, onChange, format }) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <div className="range-control">
      <div className="range-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value}
        style={{ "--range-progress": progress + "%" }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState("origin");
  const [density, setDensity] = useState(1024);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [seed, setSeed] = useState(1);
  const [renderer, setRenderer] = useState("webgl2");
  const [paused, setPaused] = useState(() =>
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  const signals = useMemo(() => demoSignals(), []);
  const [selectedId, setSelectedId] = useState("f03");
  const selected = signals.find((event) => event.id === selectedId) || signals[0];
  const currentMode = MODES.find((entry) => entry.id === mode) || MODES[0];

  function saveFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "CFD-" + mode + "-seed-" + seed + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="CFD home">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span className="brand-type"><strong>CFD</strong><small>COGNITIVE FIELD DISPLAY</small></span>
        </a>
        <div className="topbar-right">
          <span className="quiet-state"><span className="state-dot" /> LOCAL / NO CONNECTION</span>
          <span className="version">RESEARCH PREVIEW <b>0.3.0</b></span>
          <a className="github-link" href="https://github.com/MichaelWave369/CFD" target="_blank" rel="noreferrer">GITHUB ↗</a>
        </div>
      </header>

      <main id="home" className="main-grid">
        <aside className="control-panel" aria-label="Field controls">
          <div className="panel-header"><span className="eyebrow">01 / CONTROL SURFACE</span><span className="panel-count">◌</span></div>
          <h2>Shape the field<span className="accent-period">.</span></h2>
          <p className="panel-intro">An experimental language of particles, structure, and motion.</p>

          <div className="section-rule"><span>GEOMETRY MODE</span><span>{String(MODES.length).padStart(2, "0")} AVAILABLE</span></div>
          <div className="mode-options" role="group" aria-label="Geometry mode">
            {MODES.map((entry, index) => (
              <button
                key={entry.id} type="button"
                className={"mode-button" + (mode === entry.id ? " active" : "")}
                aria-pressed={mode === entry.id}
                onClick={() => setMode(entry.id)}
              >
                <span className="mode-icon" aria-hidden="true">{["✦", "✧", "▦", "◌", "⟡"][index]}</span>
                <span className="mode-copy"><strong>{entry.label}</strong><small>{entry.detail}</small></span>
                <span className="mode-index">0{index + 1}</span>
              </button>
            ))}
          </div>

          <div className="section-rule sliders-label"><span>FIELD PARAMETERS</span><span>ADJUSTABLE</span></div>
          <RangeControl id="density" label="Virtual dots per side" min={256} max={1536} step={64} value={density} onChange={setDensity} format={(v) => v.toLocaleString() + " / axis"} />
          <RangeControl id="speed" label="Motion rate" min={0.2} max={2.5} step={0.1} value={speed} onChange={setSpeed} format={(v) => v.toFixed(1) + " ×"} />
          <RangeControl id="zoom" label="Into the field" min={-2} max={4} step={0.25} value={Math.log2(zoom)} onChange={(v) => setZoom(2 ** v)} format={(v) => (2 ** v).toFixed(v < 0 ? 2 : 1) + "×"} />

          <div className="action-grid">
            <button className="action-primary" type="button" onClick={() => setPaused((p) => !p)}>
              <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>{paused ? "Resume field" : "Pause field"}
            </button>
            <button className="action-secondary" type="button" onClick={() => setSeed((s) => s + 1)}>
              ↻ &nbsp; Regenerate
            </button>
          </div>
          <button className="text-action" type="button" onClick={() => { setDensity(1024); setSpeed(1); setZoom(1); setMode("origin"); setSeed(1); }}>
            Reset default parameters <span aria-hidden="true">↗</span>
          </button>

          <div className="panel-foot">
            <span className="foot-crosshair" aria-hidden="true">⊕</span>
            <p>Inspired by a personal visual experience. No claim of direct access to thought, consciousness, or physical laws.</p>
          </div>
        </aside>

        <section className="workspace" aria-label="Cognitive Field Display workspace">
          <div className="workspace-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> AN EXPERIMENT IN SEEING SYSTEMS</div>
              <h1>Beyond the screen.<br /><em>Into the field.</em></h1>
              <p>A living visual grammar for relationships and observable signals. Start with imagination. Stay grounded in evidence.</p>
              <a className="pocket-jump" href="#pocket-lab">↘ EXPLORE INFINITE POCKET FIELD</a>
            </div>
            <div className="heading-glyph" aria-hidden="true"><span>◌</span><small>F / 01</small></div>
          </div>

          <div className="stage-shell">
            <div className="stage-heading">
              <div className="stage-title"><span className="stage-line" /> FIELD VIEWPORT <span className="stage-title-mode">/ {currentMode.label.toUpperCase()}</span></div>
              <div className="stage-tag">SYNTHETIC · DEMONSTRATION ONLY</div>
            </div>
            <div className="square-viewport"><DenseFieldCanvas mode={mode} density={density} speed={speed} zoom={zoom} seed={seed} paused={paused} canvasRef={canvasRef} onRenderer={setRenderer} /></div>
            <div className="stage-footer">
              <div className="stage-metrics">
                <span><i /> FIELD ENGINE <strong>{renderer === "webgl2" ? "WEBGL2" : "CANVAS 2D"}</strong></span>
                <span>VIRTUAL DOTS <strong>{virtualDotCount(density).toLocaleString()}</strong></span>
                <span>ZOOM <strong>{zoom.toFixed(2)}×</strong></span>
              </div>
              <button className="snapshot" type="button" onClick={saveFrame}>↓ SAVE FRAME</button>
            </div>
          </div>

          <PocketFieldLab />

          <div className="lower-grid">
            <section className="info-card">
              <div className="info-top"><span>02 / SIGNAL LEDGER</span><span className="badge-simulated">SIMULATED</span></div>
              <h3>Observe the sequence</h3>
              <p>Example events only. Choose one to inspect its provenance.</p>
              <div className="events" aria-label="Demo signal events">
                {signals.map((signal, index) => (
                  <button
                    key={signal.id} type="button"
                    onClick={() => setSelectedId(signal.id)}
                    className={"event-row" + (signal.id === selectedId ? " selected" : "")}
                    aria-pressed={signal.id === selectedId}
                  >
                    <span className="event-time">T+{String(index * 8).padStart(2, "0")}s</span>
                    <span className="event-label">{signal.label}</span>
                    <span className="event-dot" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>

            <section className="info-card inspect-card" aria-live="polite">
              <div className="info-top"><span>03 / STATE INSPECTOR</span><span>READ ONLY</span></div>
              <h3>{selected.label}</h3>
              <p>Every visible relationship should trace back to its declared origin.</p>
              <dl className="inspection">
                <div><dt>EVENT</dt><dd>{selected.id.toUpperCase()} / {selected.kind.toUpperCase()}</dd></div>
                <div><dt>ORIGIN</dt><dd>{selected.source}</dd></div>
                <div><dt>PROVENANCE</dt><dd className="provenance">{selected.provenance}</dd></div>
                <div><dt>INTENSITY</dt><dd>{Math.round(selected.intensity * 100)}% <small>(synthetic)</small></dd></div>
              </dl>
              <div className="inspector-note"><span aria-hidden="true">ⓘ</span> This display does not read hidden model reasoning or measure consciousness.</div>
            </section>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>CFD / FIELD STUDY 002</span>
        <span>PEOPLE ABOVE PROFIT <b>·</b> LEDGER ABOVE EGO</span>
        <span>BUILT FOR CURIOSITY, NOT CERTAINTY</span>
      </footer>
    </div>
  );
}
