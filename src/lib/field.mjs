// Pure geometry. This module never reads model internals or external telemetry.
export const MODES = Object.freeze([
  { id: "drift", label: "Free Drift", detail: "A floating field of colored points" },
  { id: "lattice", label: "Fuzzy Lattice", detail: "The original square-array inspiration" },
  { id: "vortex", label: "Vortex", detail: "Depth-projected inward and outward flow" },
  { id: "nested", label: "Nested Six", detail: "Six-fold groups and counter-rotation" }
]);

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const fract = (n) => n - Math.floor(n);
const hash = (n) => fract(Math.sin(n * 127.1 + 78.233) * 43758.5453123);
const seeded = (i, seed, salt) => hash((i + 1) * 0.937 + seed * 31.719 + salt * 17.137);

export function makeField(count = 720, seed = 1, mode = "drift") {
  const n = Math.max(1, Math.min(2000, Math.floor(Number(count) || 1)));
  const cols = Math.ceil(Math.sqrt(n * 1.6));
  const rows = Math.ceil(n / cols);

  return Array.from({ length: n }, (_, i) => {
    const u = seeded(i, seed, 1);
    const v = seeded(i, seed, 2);
    const w = seeded(i, seed, 3);
    const q = i / Math.max(1, n - 1);
    const base = { i, hue: i % 6, brightness: 0.4 + w * 0.6, phase: TAU * u };

    if (mode === "lattice") {
      return {
        ...base, x: ((i % cols) / Math.max(1, cols - 1) - 0.5) * 2.15 + (u - 0.5) * 0.026,
        y: (Math.floor(i / cols) / Math.max(1, rows - 1) - 0.5) * 1.76 + (v - 0.5) * 0.026,
        z: (w - 0.5) * 0.35
      };
    }

    if (mode === "vortex") {
      const angle = i * GOLDEN_ANGLE + u * 0.18;
      const radius = Math.sqrt(q) * 0.96;
      return {
        ...base, angle, radius,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.72,
        z: Math.sin(angle * 0.42 + radius * 8) * 0.6
      };
    }

    if (mode === "nested") {
      const group = i % 6;
      const ringIndex = Math.floor(i / 6);
      const ringAngle = ringIndex * GOLDEN_ANGLE + u * 0.12;
      const localRadius = 0.045 + Math.sqrt(ringIndex / Math.max(1, Math.ceil(n / 6))) * 0.24;
      const centerAngle = group * TAU / 6;
      return {
        ...base, group, ringAngle, localRadius,
        cx: Math.cos(centerAngle) * 0.48, cy: Math.sin(centerAngle) * 0.39,
        x: 0, y: 0, z: Math.sin(ringAngle * 0.5) * 0.25
      };
    }

    return {
      ...base, x: (u - 0.5) * 2.15,
      y: (v - 0.5) * 1.85, z: (w - 0.5) * 1.1
    };
  });
}

export function positionAt(p, time, mode = "drift") {
  const t = Number.isFinite(time) ? time : 0;

  if (mode === "lattice") {
    return {
      x: p.x + Math.sin(t * 0.55 + p.phase) * 0.018,
      y: p.y + Math.cos(t * 0.42 + p.phase) * 0.018,
      z: p.z + Math.sin(t * 0.6 + p.i * 0.09) * 0.15
    };
  }

  if (mode === "vortex") {
    const angle = p.angle + t * (0.21 + (1 - p.radius) * 0.22);
    const wave = 1 + Math.sin(t * 0.8 + p.radius * 14) * 0.085;
    return {
      x: Math.cos(angle) * p.radius * wave,
      y: Math.sin(angle) * p.radius * wave * 0.78,
      z: p.z + Math.sin(angle * 2 + t * 0.7) * 0.18
    };
  }

  if (mode === "nested") {
    const direction = p.group % 2 === 0 ? 1 : -1;
    const angle = p.ringAngle + t * direction * 0.42;
    const breathing = 1 + Math.sin(t * 0.7 + p.group * 1.05) * 0.12;
    const r = p.localRadius * breathing;
    return {
      x: p.cx + Math.cos(angle) * r,
      y: p.cy + Math.sin(angle) * r * 0.86,
      z: p.z + Math.sin(angle + t * 0.3) * 0.15
    };
  }

  return {
    x: p.x + Math.sin(t * 0.3 + p.phase) * 0.065,
    y: p.y + Math.cos(t * 0.27 + p.phase * 1.7) * 0.055,
    z: p.z + Math.sin(t * 0.4 + p.phase) * 0.11
  };
}
