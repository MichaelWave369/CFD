# Cognitive Field Display (CFD)

**Beyond the screen. Into the field.**

CFD is an original, experimental interface for representing **observable computational signals** as geometric fields of particles, patterns, and motion. The first prototype is inspired by the creator's lifelong *Fuzzy Dots* visual imagery: a relaxed closed-eye field of colored points that seems to move into imagined diagrams and structures.

**This is a visualization tool, not a consciousness detector or a view into an AI's private thoughts.** Version 0.1 uses entirely **synthetic demonstration data**. It does not connect to a model, make claims about subjective experience, or demonstrate new physical laws.

## Quick start

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. Use `npm test` for pure-function tests and `npm run build` for a production bundle.

## Explore

- **Drift:** a responsive, relaxed RGB point field
- **Lattice:** a square-like ordered particle array
- **Vortex:** a depth-projected spiral
- **Nested:** six-fold clusters and counter-rotating rings inspired by NBG
- Adjust particle density, motion rate, and field zoom
- Pause/resume, regenerate a deterministic field, and save a PNG snapshot
- Observe a clearly labeled, **synthetic** signal/event ledger
- Respects reduced-motion preference on first load; controls are keyboard accessible

## Boundaries and provenance

- **SIMULATED:** generated demo data only. The prototype's visuals fall in this class.
- **OBSERVED:** a measured event from an instrumented adapter (future).
- **VERIFIED:** an event supported by an explicit verification process (future).
- **INFERRED:** a derived or interpreted value, not a direct observation (future).
- **UNKNOWN:** provenance was not established.

The geometry is an **encoding chosen by CFD**, never proof of the structure of a model's internal reasoning. See [architecture](docs/ARCHITECTURE.md) and [roadmap](docs/ROADMAP.md).

## Build and publish

CI tests and builds all PRs. After merge to `main`, the Pages workflow builds the static site with `/CFD/` as its base path. Enable **Settings → Pages → Build and deployment → GitHub Actions** for the repository if needed. No API keys, backend, telemetry harvesting, tracking, or external model downloads are used by the prototype.

## Values

**People Above Profit · Ledger Above Ego · Peace Above Drama · Laughter Before Hatred · Bounce First, Discuss Later.**

Original implementation. MIT licensed. Research and creative inspiration do not imply scientific validation.
