import { useEffect, useRef, useState } from "react";
import FieldCanvas from "./FieldCanvas.jsx";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "../lib/denseShader.mjs";
import { modeIndex } from "../lib/fieldViewport.mjs";

// Render a dense *procedurally sampled* field instead of allocating millions
// of individual JavaScript points. Screen resolution still limits visible detail.
function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader compilation error";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function prepareProgram(gl) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Unable to link field shader";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

export default function DenseFieldCanvas({ mode, density, speed, zoom, paused, seed, canvasRef, onRenderer }) {
  const wrapperRef = useRef(null);
  const elapsed = useRef(0);
  const lastMode = useRef(mode);
  const params = useRef({ mode, density, speed, zoom, paused, seed });
  const [webglReady, setWebglReady] = useState(true);
  const [problem, setProblem] = useState(false);
  params.current = { mode, density, speed, zoom, paused, seed };

  useEffect(() => {
    if (!webglReady) return;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    let gl;
    try {
      gl = canvas.getContext("webgl2", {
        alpha: false, antialias: false, powerPreference: "high-performance",
        preserveDrawingBuffer: true
      });
      if (!gl) throw new Error("WebGL2 not available");
    } catch (error) {
      console.info("CFD fallback: " + error.message);
      setWebglReady(false);
      onRenderer?.("canvas");
      return;
    }

    let program;
    try {
      program = prepareProgram(gl);
    } catch (error) {
      console.warn("CFD shader unavailable: " + error.message);
      setProblem(true);
      setWebglReady(false);
      onRenderer?.("canvas");
      return;
    }

    const uniforms = Object.fromEntries([
      "uResolution", "uTime", "uZoom", "uDensity", "uBlend",
      "uSeed", "uFromMode", "uToMode"
    ].map((name) => [name, gl.getUniformLocation(program, name)]));
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.useProgram(program);
    onRenderer?.("webgl2");

    let active = true;
    let frameId = 0;
    let lastStamp = null;
    let fromMode = modeIndex(mode);
    let toMode = fromMode;
    let transition = 1;
    let lastRender = 0;
    const TARGET_FRAME_MS = 1000 / 30;

    function render() {
      const p = params.current;
      if (p.mode !== lastMode.current) {
        fromMode = toMode;
        toMode = modeIndex(p.mode);
        transition = 0;
        lastMode.current = p.mode;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.uTime, elapsed.current);
      gl.uniform1f(uniforms.uZoom, p.zoom);
      gl.uniform1f(uniforms.uDensity, p.density);
      gl.uniform1f(uniforms.uBlend, transition);
      gl.uniform1f(uniforms.uSeed, p.seed);
      gl.uniform1i(uniforms.uFromMode, fromMode);
      gl.uniform1i(uniforms.uToMode, toMode);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(stamp) {
      if (!active) return;
      const p = params.current;
      if (lastStamp != null && !p.paused && stamp - lastRender >= TARGET_FRAME_MS) {
        const dt = Math.min(0.07, (stamp - lastRender) / 1000);
        elapsed.current += dt * p.speed;
        transition = Math.min(1, transition + dt * 1.55);
      }
      if (lastRender === 0 || stamp - lastRender >= TARGET_FRAME_MS) {
        render();
        lastRender = stamp;
      }
      lastStamp = stamp;
      frameId = requestAnimationFrame(frame);
    }

    function resize() {
      const rect = wrapper.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const pixels = Math.max(1, Math.round(Math.min(rect.width, rect.height) * dpr));
      if (canvas.width !== pixels || canvas.height !== pixels) {
        canvas.width = pixels;
        canvas.height = pixels;
      }
      if (active) render();
    }
    function onLost(event) {
      event.preventDefault();
      if (!active) return;
      console.warn("CFD WebGL context lost; switching to Canvas fallback");
      active = false;
      cancelAnimationFrame(frameId);
      setWebglReady(false);
      onRenderer?.("canvas");
    }

    canvas.addEventListener("webglcontextlost", onLost);
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    resize();
    frameId = requestAnimationFrame(frame);

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, [canvasRef, onRenderer, webglReady]);

  if (!webglReady) {
    return (
      <div className="dense-fallback">
        <FieldCanvas
          mode={mode} density={Math.min(density, 1800)} speed={speed} zoom={zoom}
          seed={seed} paused={paused} canvasRef={canvasRef}
        />
        <span className="fallback-note">
          {problem ? "GPU field shader unavailable" : "WebGL2 unavailable"} · Canvas 2D fallback (reduced density)
        </span>
      </div>
    );
  }
  return (
    <div className="field-surface dense-field" ref={wrapperRef}>
      <canvas
        ref={canvasRef}
        className="field-canvas"
        role="img"
        aria-label="Square synthetic moving RGB microdot field; a creative representation, not a neural measurement."
      />
      <div className="scan-corners" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div className="field-status">
        <span className="live-pip" />
        {paused ? "FIELD PAUSED" : "FIELD ACTIVE"}
        <span className="field-status-divider">/</span>
        VIRTUAL POINT FIELD
      </div>
      <div className="dense-caption" aria-hidden="true">CFD 0.2 · SYNTHETIC / SQUARE FIELD</div>
    </div>
  );
}
