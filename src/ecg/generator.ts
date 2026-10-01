// Deterministic synthetic ECG (one lead, lead II morphology) built from Gaussian
// P, Q, R, S and T waves. Generation runs in two steps: plan a timeline of beats
// from the rhythm pattern, then synthesise the signal from that timeline.
import type { RhythmSegment, RhythmSpec } from "../content/schema";

export const FS = 250;

export type BeatType = "sinus" | "pvc" | "pac" | "vt" | "svt" | "af" | "escape" | "blocked";

export type Beat = {
  /** Seconds. QRS onset for ventricular beats, P-wave peak for blocked P waves. */
  time: number;
  type: BeatType;
  /** P-wave peak of the P wave conducted to this beat; null when there is none. */
  pTime: number | null;
  /** QRS duration in ms; 0 for blocked P waves. */
  qrsMs: number;
  /** P onset to QRS onset in ms; null when no P wave is conducted. */
  prMs: number | null;
  morphology?: "a" | "b";
};

export type EcgSignal = { samples: Float32Array; fs: typeof FS; beats: Beat[] };

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SINUS_PR = 0.16;
const PAC_PR = 0.14;
const NARROW_QRS = 0.09;
const PVC_QRS = { a: 0.14, b: 0.16 } as const;
const VT_QRS = 0.16;
const P_HALF = 0.05; // P onset to P peak
const PVC_COUPLING = 0.6; // fraction of the sinus RR
const PAC_COUPLING = 0.7;

type QrsShape = "narrow" | "wide" | "pvc-a" | "pvc-b" | "vt";
type PShape = "sinus" | "ectopic";

type Planned = {
  beat: Beat;
  qrs: QrsShape | null;
  p: PShape | null;
  /** ST deviation applies to supraventricular conducted beats only. */
  st: boolean;
};

type Window = { start: number; end: number };
type ArtifactWindow = Window & { type: "muskel" | "baslinje" | "elektrod" };

type Timeline = { planned: Planned[]; fibrillation: Window[]; artifacts: ArtifactWindow[] };

function planTimeline(spec: RhythmSpec, durationSec: number, rand: () => number): Timeline {
  const rr0 = 60 / spec.baseHr;
  const supraQrs = (spec.qrsMs ?? NARROW_QRS * 1000) / 1000;
  const supraShape: QrsShape = supraQrs >= 0.12 ? "wide" : "narrow";
  const jitter = (rr: number) => rr * (1 + 0.02 * (rand() - 0.5));

  const planned: Planned[] = [];
  const fibrillation: Window[] = [];
  const artifacts: ArtifactWindow[] = [];

  let next = 0.4; // next scheduled sinus QRS onset
  let lastQrs = -Infinity;
  const anchor = () => (Number.isFinite(lastQrs) ? lastQrs : next - rr0);

  const conducted = (qrsTime: number, type: BeatType, pr: number, p: PShape, qrs = supraQrs) => {
    const pTime = qrsTime - pr + P_HALF;
    planned.push({
      beat: { time: qrsTime, type, pTime, qrsMs: qrs * 1000, prMs: Math.round(pr * 1000) },
      qrs: qrs === supraQrs ? supraShape : qrs >= 0.12 ? "wide" : "narrow",
      p,
      st: true,
    });
    lastQrs = qrsTime;
  };
  const ventricular = (time: number, type: BeatType, qrs: number, shape: QrsShape, st: boolean) => {
    const morphology = shape === "pvc-a" ? "a" : shape === "pvc-b" ? "b" : undefined;
    planned.push({
      beat: { time, type, pTime: null, qrsMs: qrs * 1000, prMs: null, ...(morphology && { morphology }) },
      qrs: shape,
      p: null,
      st,
    });
    lastQrs = time;
  };
  const blockedP = (pOnset: number) => {
    const pTime = pOnset + P_HALF;
    planned.push({
      beat: { time: pTime, type: "blocked", pTime, qrsMs: 0, prMs: null },
      qrs: null,
      p: "sinus",
      st: false,
    });
  };

  const run = (seg: RhythmSegment) => {
    switch (seg.kind) {
      case "sinus": {
        for (let i = 0; i < seg.beats; i++) {
          conducted(next, "sinus", SINUS_PR, "sinus");
          next += jitter(rr0);
        }
        break;
      }
      case "pvc": {
        // The sinus node keeps its rhythm: the next sinus beat falls on the
        // original grid, which gives a full compensatory pause.
        let t = anchor() + PVC_COUPLING * rr0;
        for (let i = 0; i < seg.count; i++) {
          ventricular(t, "pvc", PVC_QRS[seg.morphology], seg.morphology === "a" ? "pvc-a" : "pvc-b", false);
          t += PVC_COUPLING * rr0;
        }
        while (next <= lastQrs + 0.5 * rr0) next += rr0;
        break;
      }
      case "pac": {
        // The early atrial beat resets the sinus node: non-compensatory pause.
        let t = anchor() + PAC_COUPLING * rr0;
        for (let i = 0; i < seg.count; i++) {
          conducted(t, "pac", PAC_PR, "ectopic");
          t += PAC_COUPLING * rr0;
        }
        next = lastQrs + jitter(rr0) * 1.05;
        break;
      }
      case "vt":
      case "svt": {
        const rr = 60 / seg.rate;
        let t = anchor() + Math.min(rr, PVC_COUPLING * rr0);
        const end = t + seg.sec;
        while (t < end) {
          if (seg.kind === "vt") ventricular(t, "vt", VT_QRS, "vt", false);
          else ventricular(t, "svt", supraQrs, supraShape, true);
          t += jitter(rr);
        }
        next = lastQrs + 1.2 * rr0;
        break;
      }
      case "af": {
        const rr = 60 / seg.meanRate;
        const start = anchor() + 0.1;
        const end = start + seg.sec;
        fibrillation.push({ start, end });
        let t = anchor() + rr * (0.6 + 0.8 * rand());
        while (t < end) {
          ventricular(t, "af", supraQrs, supraShape, true);
          t += rr * (0.6 + 0.8 * rand());
        }
        next = Math.max(end, lastQrs + 0.6 * rr0) + rr0;
        break;
      }
      case "avblock": {
        const firstP = next - SINUS_PR;
        const end = firstP + seg.sec;
        let pOnset = firstP;
        if (seg.type === "3") {
          // Atria and ventricles beat independently. If the rates form a near
          // whole-number ratio, every QRS would land at the same PR and the strip
          // would read as 2:1 block, so speed the atria up slightly.
          const rrV = 60 / (seg.ventricularRate ?? 40);
          const ratio = rrV / rr0;
          const rrA = Math.abs(ratio - Math.round(ratio)) < 0.1 ? rr0 * 0.95 : rr0;
          for (; pOnset < end; pOnset += jitter(rrA)) blockedP(pOnset);
          const escapeQrs = Math.max(supraQrs, 0.11);
          for (let t = anchor() + rrV; t < end; t += jitter(rrV)) {
            ventricular(t, "escape", escapeQrs, escapeQrs >= 0.12 ? "wide" : "narrow", true);
          }
        } else {
          // PR per atrial beat in one cycle; null is a blocked P wave.
          const cycle: (number | null)[] =
            seg.type === "1"
              ? [0.28]
              : seg.type === "mobitz1"
                ? [0.16, 0.24, 0.28, null]
                : [0.18, 0.18, 0.18, null];
          for (let i = 0; pOnset < end; i++, pOnset += jitter(rr0)) {
            const pr = cycle[i % cycle.length];
            if (pr === null) blockedP(pOnset);
            else conducted(pOnset + pr, "sinus", pr, "sinus");
          }
        }
        next = Math.max(pOnset + SINUS_PR, lastQrs + 0.8 * rr0);
        break;
      }
      case "brady": {
        const rr = 60 / seg.rate;
        let t = anchor() + rr;
        const end = t + seg.sec;
        for (; t < end; t += jitter(rr)) conducted(t, "sinus", SINUS_PR, "sinus");
        next = lastQrs + rr;
        break;
      }
      case "artifact": {
        // The underlying sinus rhythm continues under the artifact.
        const start = next - 0.2;
        artifacts.push({ start, end: start + seg.sec, type: seg.type });
        while (next < start + seg.sec) {
          conducted(next, "sinus", SINUS_PR, "sinus");
          next += jitter(rr0);
        }
        break;
      }
    }
  };

  for (let guard = 0; guard < 10_000 && Math.max(next, lastQrs) < durationSec + 1; guard++) {
    for (const seg of spec.pattern) {
      run(seg);
      if (Math.max(next, lastQrs) >= durationSec + 1) break;
    }
  }

  planned.sort((a, b) => a.beat.time - b.beat.time);
  return { planned, fibrillation, artifacts };
}

// --- Synthesis ---------------------------------------------------------------

function addGauss(buf: Float32Array, center: number, sigma: number, amp: number, sigmaRight = sigma) {
  const from = Math.max(0, Math.floor((center - 4 * sigma) * FS));
  const to = Math.min(buf.length - 1, Math.ceil((center + 4 * sigmaRight) * FS));
  for (let i = from; i <= to; i++) {
    const d = i / FS - center;
    const s = d < 0 ? sigma : sigmaRight;
    buf[i] += amp * Math.exp(-(d * d) / (2 * s * s));
  }
}

const smoothstep = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Adds the QRS complex and returns the sign of its main deflection. */
function addQrs(buf: Float32Array, shape: QrsShape, onset: number, w: number): number {
  switch (shape) {
    case "narrow": {
      const k = w / NARROW_QRS;
      addGauss(buf, onset + 0.015 * k, 0.008 * k, -0.1);
      addGauss(buf, onset + 0.04 * k, 0.01 * k, 1.2);
      addGauss(buf, onset + 0.065 * k, 0.01 * k, -0.25);
      return 1;
    }
    case "wide": // bundle branch block: broad, notched R
      addGauss(buf, onset + 0.35 * w, 0.15 * w, 0.8);
      addGauss(buf, onset + 0.65 * w, 0.15 * w, 0.9);
      return 1;
    case "pvc-a":
      addGauss(buf, onset + w / 2, w / 5.5, 1.4);
      return 1;
    case "pvc-b":
      addGauss(buf, onset + 0.02, 0.008, 0.2);
      addGauss(buf, onset + w / 2 + 0.01, w / 6, -1.3);
      return -1;
    case "vt":
      addGauss(buf, onset + w / 2, w / 5.5, 1.2);
      return 1;
  }
}

function synthesise(
  spec: RhythmSpec,
  durationSec: number,
  timeline: Timeline,
  rand: () => number,
): Float32Array {
  const n = Math.round(durationSec * FS);
  const buf = new Float32Array(n);
  const rr0 = 60 / spec.baseHr;
  let prevQrs: number | null = null;

  for (const { beat, qrs, p, st } of timeline.planned) {
    if (p && beat.pTime !== null) {
      if (p === "sinus") addGauss(buf, beat.pTime, 0.02, 0.15);
      else addGauss(buf, beat.pTime, 0.018, -0.12); // ectopic atrial focus: inverted P
    }
    if (!qrs) continue;

    const q = beat.time;
    const w = beat.qrsMs / 1000;
    const sign = addQrs(buf, qrs, q, w);

    // T wave: position scales with the preceding RR (Fridericia), longer after a
    // wide QRS. Wide complexes get a T wave opposite to the QRS.
    const rr = prevQrs === null ? rr0 : q - prevQrs;
    prevQrs = q;
    const qt = 0.4 * Math.cbrt(rr) + Math.max(0, w - NARROW_QRS);
    const tPeak = q + qt - 0.07;
    const tAmp = qrs === "narrow" ? 0.3 : -sign * (qrs === "wide" ? 0.3 : 0.45);
    addGauss(buf, tPeak, 0.04, tAmp, 0.028);

    if (st && spec.st) {
      // Level is spec.st.mm at J + 60 ms, then follows the slope until the T peak.
      const j = q + w;
      const level = spec.st.mm * 0.1; // 10 mm/mV
      const slope = spec.st.slope === "nedat" ? -1 : spec.st.slope === "uppat" ? 1 : 0; // mV/s
      const from = Math.max(0, Math.floor((j - 0.02) * FS));
      const to = Math.min(n - 1, Math.ceil((tPeak + 0.08) * FS));
      for (let i = from; i <= to; i++) {
        const t = i / FS;
        const env = smoothstep((t - (j - 0.02)) / 0.02) * (1 - smoothstep((t - tPeak) / 0.08));
        buf[i] += (level + slope * (t - (j + 0.06))) * env;
      }
    }
  }

  for (const { start, end } of timeline.fibrillation) {
    const waves = [0, 1, 2].map(() => ({ f: 5 + 2.5 * rand(), phase: 2 * Math.PI * rand() }));
    for (let i = Math.max(0, Math.floor(start * FS)); i < Math.min(n, end * FS); i++) {
      const t = i / FS;
      const env = smoothstep((t - start) / 0.3) * smoothstep((end - t) / 0.3);
      let v = 0;
      for (const { f, phase } of waves) v += Math.sin(2 * Math.PI * f * t + phase);
      buf[i] += 0.025 * v * env;
    }
  }

  const gauss = () => {
    const u = Math.max(rand(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };

  for (const { start, end, type } of timeline.artifacts) {
    const phase = 2 * Math.PI * rand();
    for (let i = Math.max(0, Math.floor(start * FS)); i < Math.min(n, end * FS); i++) {
      const t = i / FS - start;
      if (type === "muskel") buf[i] += 0.12 * gauss();
      else if (type === "baslinje")
        buf[i] += 0.8 * Math.sin(2 * Math.PI * 0.5 * t + phase) * smoothstep(t / 0.5);
      else buf[i] = 1.2 * Math.exp(-t / 0.15) + 0.01 * gauss(); // lead off: step, then flat line
    }
  }

  if (spec.noise) {
    const { muscle, baseline } = spec.noise;
    const p1 = 2 * Math.PI * rand();
    const p2 = 2 * Math.PI * rand();
    for (let i = 0; i < n; i++) {
      const t = i / FS;
      buf[i] +=
        0.04 * muscle * gauss() +
        baseline *
          (0.25 * Math.sin(2 * Math.PI * 0.3 * t + p1) + 0.1 * Math.sin(2 * Math.PI * 0.11 * t + p2));
    }
  }

  return buf;
}

export function generate(spec: RhythmSpec, durationSec: number): EcgSignal {
  const rand = mulberry32(spec.seed);
  const timeline = planTimeline(spec, durationSec, rand);
  const samples = synthesise(spec, durationSec, timeline, rand);
  const beats = timeline.planned.map((p) => p.beat).filter((b) => b.time < durationSec);
  return { samples, fs: FS, beats };
}
