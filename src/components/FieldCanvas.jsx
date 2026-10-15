import { useEffect, useMemo, useRef } from "react";
import { makeField, positionAt } from "../lib/field.mjs";

const COLORS = [
  [94, 237, 227], [122, 170, 255], [177, 137, 255],
  [242, 124, 200], [104, 217, 255], [210, 188, 255]
];
const TAU = Math.PI * 2;

export default function FieldCanvas({ mode, density, speed, zoom, paused, seed, canvasRef }) {
  const wrapperRef = useRef(null);
  const elapsedRef = useRef(0);
  const points = useMemo(() => makeField(density, seed, mode), [density, seed, mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let width = 1;
    let height = 1;
    let frameId = 0;
    let lastStamp = null;
    let active = true;

    function paint() {
      const time = elapsedRef.current;
      const cx = width * 0.5;
      const cy = height * 0.49;
      const scale = Math.min(width / 2.35, height / 2.12) * zoom;

      ctx.fillStyle = "#070b17";
      ctx.fillRect(0, 0, width, height);

      const haze = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(width, height) * 0.63);
      haze.addColorStop(0, "rgba(89, 80, 160, .20)");
      haze.addColorStop(0.47, "rgba(30, 73, 119, .07)");
      haze.addColorStop(1, "rgba(7, 11, 23, 0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);

      // Presentation scaffolding only; the rings do not claim biological or model structure.
      ctx.strokeStyle = "rgba(127, 158, 214, .075)";
      ctx.lineWidth = 1;
      [0.29, 0.56, 0.88].forEach((r) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, scale * r, scale * r * 0.78, 0, 0, TAU);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(cx, 20);
      ctx.lineTo(cx, height - 20);
      ctx.moveTo(20, cy);
      ctx.lineTo(width - 20, cy);
      ctx.stroke();

      if (mode === "nested") {
        for (let k = 0; k < 6; k++) {
          const a = k * TAU / 6;
          const x = cx + Math.cos(a) * 0.48 * scale;
          const y = cy + Math.sin(a) * 0.39 * scale;
          const r = scale * (0.22 + 0.022 * Math.sin(time * 0.7 + k));
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(time * 0.05 * (k % 2 ? -1 : 1));
          ctx.strokeStyle = k % 2 ? "rgba(168, 132, 255, .22)" : "rgba(95, 222, 225, .20)";
          ctx.setLineDash([3, 9]);
          ctx.beginPath();
          ctx.ellipse(0, 0, r, r * 0.86, 0, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
        ctx.setLineDash([]);
      }

      for (const p of points) {
        const v = positionAt(p, time, mode);
        const perspective = 1 / (1 - Math.min(0.7, Math.max(-0.7, v.z)) * 0.22);
        const x = cx + v.x * scale * perspective;
        const y = cy + v.y * scale * perspective;
        if (x < -8 || x > width + 8 || y < -8 || y > height + 8) continue;
        const rgb = COLORS[p.hue];
        const alpha = Math.min(0.97, 0.34 + p.brightness * 0.44 + (v.z + 1) * 0.065);
        const radius = (p.i % 17 === 0 ? 1.8 : p.i % 5 === 0 ? 1.35 : 0.9) * perspective;
        if (p.i % 11 === 0) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(" + rgb.join(",") + ",.07)";
          ctx.arc(x, y, radius * 4.5, 0, TAU);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + rgb.join(",") + "," + alpha.toFixed(3) + ")";
        ctx.arc(x, y, Math.max(0.5, radius), 0, TAU);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(183, 198, 228, .44)";
      ctx.font = "10px ui-monospace, SFMono-Regular, Consolas, monospace";
      ctx.fillText("FIELD / " + mode.toUpperCase(), 20, 27);
      ctx.textAlign = "right";
      ctx.fillText("SEED " + String(seed).padStart(3, "0"), width - 20, 27);
      ctx.textAlign = "left";
      ctx.fillText("CFD 0.1  •  SYNTHETIC GEOMETRY", 20, height - 22);
    }

    function frame(stamp) {
      if (!active) return;
      if (lastStamp != null && !paused) {
        const dt = Math.min(0.05, (stamp - lastStamp) / 1000);
        elapsedRef.current += dt * speed;
      }
      lastStamp = stamp;
      paint();
      if (!paused) frameId = requestAnimationFrame(frame);
    }

    function resize() {
      const box = wrapper.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (paused) paint();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    resize();
    frameId = requestAnimationFrame(frame);

    return () => {
      active = false;
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [mode, points, speed, zoom, paused, seed, canvasRef]);

  return (
    <div ref={wrapperRef} className="field-surface">
      <canvas
        ref={canvasRef}
        aria-label={"Synthetic " + mode + " mode particle field. Decorative visualization, not measured model thoughts."}
        role="img"
        className="field-canvas"
      />
      <div className="scan-corners" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div className="field-status">
        <span className="live-pip" />
        {paused ? "FIELD PAUSED" : "FIELD ACTIVE"}
        <span className="field-status-divider">/</span>
        LOCAL SIMULATION
      </div>
      <div className="field-coordinates" aria-hidden="true">X / Y / Z</div>
    </div>
  );
}
