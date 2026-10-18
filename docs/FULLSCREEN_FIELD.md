# CFD v0.8 · Fullscreen Fuzzy Dots Field

**Status:** presentation/UI enhancement; all geometry remains synthetic.

## What it does

The original v0.2 WebGL2-backed, square Fuzzy Dots viewport now has an **in-canvas FULLSCREEN button**. Click it to make the square field as large as possible within the display without stretching it. On a wide monitor, the square is centered with dark side margins; on a tall phone, it is centered with dark space above and below.

- Uses the standard element `requestFullscreen()` and `exitFullscreen()` browser APIs when supported and permitted.
- Uses a fixed-position **immersive fallback** when native fullscreen is unavailable or denied, so the user still gets a distraction-free expanded view in the current browser window.
- The EXIT FULLSCREEN button is *inside the fullscreen element*. Native fullscreen is also dismissible with Escape, and Escape explicitly dismisses the immersive fallback.
- The overlay offers **Pause/Resume, zoom −/+, current magnification and Save PNG**. The existing field parameters and camera zoom are unchanged when opening and closing.
- Maintains original square aspect ratio (1:1). No rectangular stretching.
- Reuses the mounted `DenseFieldCanvas` and its WebGL2 or Canvas 2D fallback rather than recreating the renderer. Its built-in ResizeObserver resizes the canvas when the wrapper changes, so mode, seed, virtual dot density, reduced-motion behavior and timeline remain untouched.
- UI control labels, keyboard interaction and focus-return behavior are included.
- No new network calls, subscriptions, telemetry, recordings or access to hidden AI reasoning.

## How to try it

1. Open the live `/CFD/` page and find **FIELD VIEWPORT** near the top.
2. Select any field mode and start the animation.
3. Click **FULLSCREEN** at the top right of the square.
4. Use **− / +** to change zoom by one octave, **Pause/Resume**, or **PNG** to capture the current square.
5. Click **EXIT FULLSCREEN** or press Escape. Confirm the original page and controls remain where they were.
6. Repeat with reduced-motion enabled and, if possible, with WebGL2 disabled to exercise Canvas fallback.
7. On a phone or browser without standard Fullscreen API, verify the in-page immersive fallback and Escape/exit control.

## Tests and limits

Pure Node tests cover fullscreen zoom clamping and the invariance of world-to-square viewport coordinates at all supported magnifications. GitHub Actions must also complete the standard full Node test suite and Vite production build.

**Browser-only behaviors** such as actual Fullscreen API permissions, browser chrome hiding, safe-area overlays, Canvas fallback visibility, touch controls, and focus behavior require hands-on testing; a green Node test does not prove these are visually correct.

Native fullscreen is browser-dependent and may require a direct user gesture. Fallback immersive mode fills the available browser viewport but cannot hide the browser's own toolbar. A larger screen does not increase the independent information capacity of the procedural virtual dot substrate.

**Ledger Above Ego · Keep the field square.**
