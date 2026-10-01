import { useEffect, useRef, useState } from "react";
import { mvToY, timeToX } from "./scale";

type Props = {
  samples: Float32Array;
  fs: number;
  /** Screen reader label, e.g. "EKG-remsa: exempel på ihållande ventrikeltakykardi". */
  label: string;
  /** static: the whole strip. sweep: a monitor that loops the samples and draws over itself. */
  mode?: "static" | "sweep";
  heightMm?: number;
  /** Minimum CSS px per mm. A static strip wider than its container scrolls inside it. */
  minPxPerMm?: number;
  /** sweep: CSS px per mm; the visible window follows from the width. */
  pxPerMm?: number;
};

const CAL_MM = 10; // calibration pulse plus gap, drawn at the left edge
const BASELINE_FROM_TOP = 0.55; // share of the height above the isoelectric line
const SWEEP_GAP_SEC = 0.15;

const COLORS = {
  paper: "#fff7f7",
  minor: "#f6cfcf",
  major: "#e79b9b",
  trace: "#111827",
};

function drawGrid(ctx: CanvasRenderingContext2D, widthPx: number, heightPx: number, s: number) {
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.lineWidth = 1;
  for (const major of [false, true]) {
    ctx.strokeStyle = major ? COLORS.major : COLORS.minor;
    ctx.beginPath();
    for (let mm = 0; mm * s <= widthPx; mm++) {
      if ((mm % 5 === 0) !== major) continue;
      const x = Math.round(mm * s) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, heightPx);
    }
    for (let mm = 0; mm * s <= heightPx; mm++) {
      if ((mm % 5 === 0) !== major) continue;
      const y = Math.round(mm * s) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(widthPx, y);
    }
    ctx.stroke();
  }
}

/** 1 mV, 200 ms calibration pulse. */
function drawCalibration(ctx: CanvasRenderingContext2D, s: number, baseline: number) {
  const up = baseline - mvToY(1, s);
  ctx.beginPath();
  ctx.moveTo(0, baseline);
  ctx.lineTo(2 * s, baseline);
  ctx.lineTo(2 * s, up);
  ctx.lineTo(2 * s + timeToX(0.2, s), up);
  ctx.lineTo(2 * s + timeToX(0.2, s), baseline);
  ctx.lineTo(9 * s, baseline);
  ctx.stroke();
}

/** Strokes samples [from, to) in seconds, starting at x0 (device px). */
function drawTrace(
  ctx: CanvasRenderingContext2D,
  samples: Float32Array,
  fs: number,
  s: number,
  baseline: number,
  x0: number,
  from: number,
  to: number,
) {
  const n = samples.length;
  const i0 = Math.max(0, Math.floor(from * fs));
  const i1 = Math.ceil(to * fs);
  if (i1 <= i0) return;
  ctx.beginPath();
  for (let i = i0; i < i1; i++) {
    const v = samples[((i % n) + n) % n];
    const x = x0 + timeToX((i - i0) / fs, s);
    const y = baseline - mvToY(v, s);
    if (i === i0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function EcgStrip({
  samples,
  fs,
  label,
  mode = "static",
  heightMm = 32,
  minPxPerMm = 3,
  pxPerMm = 4,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const durationSec = samples.length / fs;
  const cssPxPerMm =
    mode === "static" ? Math.max(minPxPerMm, containerWidth / (CAL_MM + durationSec * 25)) : pxPerMm;
  const cssWidth = mode === "static" ? Math.ceil(cssPxPerMm * (CAL_MM + durationSec * 25)) : containerWidth;
  const cssHeight = Math.round(heightMm * cssPxPerMm);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || containerWidth === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = cssPxPerMm * dpr; // device px per mm
    const w = canvas.width;
    const h = canvas.height;
    const baseline = Math.round(h * BASELINE_FROM_TOP);
    const x0 = CAL_MM * s;

    // Grid is cached once per size and blitted every frame in sweep mode.
    const grid = document.createElement("canvas");
    grid.width = w;
    grid.height = h;
    const gctx = grid.getContext("2d")!;
    drawGrid(gctx, w, h, s);
    gctx.strokeStyle = COLORS.trace;
    gctx.lineWidth = 1.5 * dpr;
    gctx.lineJoin = "round";
    drawCalibration(gctx, s, baseline);

    ctx.strokeStyle = COLORS.trace;
    ctx.lineWidth = 1.5 * dpr;
    ctx.lineJoin = "round";

    if (mode === "static") {
      ctx.drawImage(grid, 0, 0);
      drawTrace(ctx, samples, fs, s, baseline, x0, 0, durationSec);
      return;
    }

    const windowSec = (w - x0) / (25 * s);
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const cursor = t % windowSec;
      const sweepStart = t - cursor;
      ctx.drawImage(grid, 0, 0);
      // Current sweep up to the cursor, then the previous sweep after a gap.
      drawTrace(ctx, samples, fs, s, baseline, x0, sweepStart, t);
      const gapEnd = cursor + SWEEP_GAP_SEC;
      if (sweepStart > 0 && gapEnd < windowSec) {
        drawTrace(
          ctx,
          samples,
          fs,
          s,
          baseline,
          x0 + timeToX(gapEnd, s),
          sweepStart - windowSec + gapEnd,
          sweepStart,
        );
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [samples, fs, mode, cssPxPerMm, cssWidth, cssHeight, containerWidth, durationSec]);

  return (
    <div ref={wrapRef} className={mode === "static" ? "w-full overflow-x-auto" : "w-full"}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        style={{ width: cssWidth, height: cssHeight, display: "block" }}
      />
    </div>
  );
}
