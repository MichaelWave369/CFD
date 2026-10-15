// A stable interchange contract for future instrumented adapters.
// Synthetic demo events are explicitly provenance-tagged.
export const PROVENANCE = Object.freeze([
  "SIMULATED", "OBSERVED", "VERIFIED", "INFERRED", "UNKNOWN"
]);

export const SIGNAL_KINDS = Object.freeze([
  "event", "metric", "relation", "boundary", "warning"
]);

export function validateSignal(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return false;
  return typeof event.id === "string" && event.id.length > 0
    && typeof event.source === "string" && event.source.length > 0
    && typeof event.label === "string" && event.label.length > 0
    && PROVENANCE.includes(event.provenance)
    && SIGNAL_KINDS.includes(event.kind)
    && Number.isFinite(event.intensity) && event.intensity >= 0 && event.intensity <= 1
    && typeof event.at === "string" && Number.isFinite(Date.parse(event.at));
}

export function demoSignals() {
  const events = [
    ["f01", "Particle initialization", "event", 0.32],
    ["f02", "Synthetic relationships generated", "relation", 0.66],
    ["f03", "Six-fold geometry mapped", "boundary", 0.52],
    ["f04", "Counter-rotating field sampled", "metric", 0.74]
  ];
  return events.map(([id, label, kind, intensity], i) => ({
    id, label, kind, intensity,
    provenance: "SIMULATED",
    source: "CFD Demo Generator",
    at: new Date(Date.UTC(2026, 0, 1, 0, 0, i * 8)).toISOString()
  }));
}
