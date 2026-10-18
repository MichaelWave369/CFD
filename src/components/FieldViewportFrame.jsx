import { useEffect, useRef, useState } from "react";
import { clampZoom, stepFieldZoom, MAX_ZOOM, MIN_ZOOM } from "../lib/fieldViewport.mjs";

// A stable wrapper: entering/exiting fullscreen never re-mounts the renderer,
// swaps out the canvas, changes its seed, or changes field coordinates.
export default function FieldViewportFrame({
  children, paused, onTogglePause, zoom, onZoomChange, onSaveFrame
}) {
  const surfaceRef = useRef(null);
  const toggleRef = useRef(null);
  const nativeWasOpen = useRef(false);
  const [nativeOpen, setNativeOpen] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const expanded = nativeOpen || fallbackOpen;

  useEffect(() => {
    function onFullscreenChange() {
      const active = document.fullscreenElement === surfaceRef.current;
      setNativeOpen(active);
      if (nativeWasOpen.current && !active) {
        toggleRef.current?.focus({ preventScroll: true });
      }
      nativeWasOpen.current = active;
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    onFullscreenChange();
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!fallbackOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onEscape(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setFallbackOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    }
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [fallbackOpen]);

  async function toggleFullscreen() {
    const surface = surfaceRef.current;
    if (!surface) return;
    if (fallbackOpen) {
      setFallbackOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
      return;
    }
    if (document.fullscreenElement === surface) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.info("CFD fullscreen exit unavailable:", error);
      }
      return;
    }
    // Native browser fullscreen if available; fixed-position immersive mode
    // for browsers which do not expose/support the element Fullscreen API.
    if (typeof surface.requestFullscreen === "function") {
      try {
        await surface.requestFullscreen();
        setNativeOpen(document.fullscreenElement === surface);
        return;
      } catch (error) {
        console.info("CFD using immersive fullscreen fallback:", error);
      }
    }
    setFallbackOpen(true);
  }

  return (
    <div
      ref={surfaceRef}
      className={"square-viewport field-fullscreen-shell" + (fallbackOpen ? " field-immersive-fallback" : "")}
      aria-label="Square Fuzzy Dots field viewport"
    >
      {children}
      <button
        ref={toggleRef}
        className="field-fullscreen-toggle"
        type="button"
        aria-label={expanded ? "Exit fullscreen field" : "Enter fullscreen field"}
        aria-pressed={expanded}
        onClick={toggleFullscreen}
        title={expanded ? "Exit fullscreen (Esc)" : "Expand Fuzzy Dots to fullscreen"}
      >
        <span aria-hidden="true">{expanded ? "↙" : "⛶"}</span>
        <span>{expanded ? "EXIT FULLSCREEN" : "FULLSCREEN"}</span>
      </button>
      {expanded && (
        <div className="field-immersive-toolbar" role="group" aria-label="Fullscreen Fuzzy Dots controls">
          <span className="field-immersive-status">CFD / SYNTHETIC FIELD</span>
          <button type="button" onClick={onTogglePause} aria-label={paused ? "Resume field animation" : "Pause field animation"}>
            {paused ? "▶ RESUME" : "Ⅱ PAUSE"}
          </button>
          <button type="button" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM}
            onClick={() => onZoomChange(stepFieldZoom(zoom, -1))}>−</button>
          <span className="field-immersive-zoom" aria-live="polite">{zoom.toFixed(2)}×</span>
          <button type="button" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM}
            onClick={() => onZoomChange(stepFieldZoom(zoom, 1))}>+</button>
          <button type="button" onClick={onSaveFrame} aria-label="Save fullscreen field image as PNG">
            ↓ PNG
          </button>
        </div>
      )}
    </div>
  );
}
