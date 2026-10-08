import { describe, expect, it } from "vitest";
import { ecgPresets } from "../content";
import type { RhythmSpec } from "../content/schema";
import { FS, generate, type Beat } from "./generator";
import { mvToY, timeToX } from "./scale";

const spec = (s: Partial<RhythmSpec> & Pick<RhythmSpec, "pattern">): RhythmSpec => ({
  baseHr: 60,
  seed: 1,
  ...s,
});

const ventricular = (beats: Beat[]) => beats.filter((b) => b.type !== "blocked");
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const rrBefore = (beats: Beat[], i: number) => beats[i].time - beats[i - 1].time;
const rrAfter = (beats: Beat[], i: number) => beats[i + 1].time - beats[i].time;

describe("generate", () => {
  it("sinus 120/min gives mean RR 500 ms ±5 %", () => {
    const beats = generate(spec({ baseHr: 120, pattern: [{ kind: "sinus", beats: 10 }] }), 30).beats;
    const rr = beats.slice(1).map((b, i) => b.time - beats[i].time);
    expect(mean(rr)).toBeGreaterThan(0.475);
    expect(mean(rr)).toBeLessThan(0.525);
    expect(beats.every((b) => b.type === "sinus" && b.prMs === 160)).toBe(true);
  });

  it("PVC: wide QRS without P and a full compensatory pause", () => {
    const s = spec({
      baseHr: 90,
      pattern: [
        { kind: "sinus", beats: 4 },
        { kind: "pvc", morphology: "a", count: 1 },
      ],
    });
    const beats = ventricular(generate(s, 40).beats);
    const rr0 = 60 / 90;
    const pvcs = beats
      .map((b, i) => [b, i] as const)
      .filter(([b, i]) => b.type === "pvc" && i > 0 && i < beats.length - 1);
    expect(pvcs.length).toBeGreaterThan(3);
    for (const [b, i] of pvcs) {
      expect(b.qrsMs).toBeGreaterThanOrEqual(120);
      expect(b.pTime).toBeNull();
      expect(rrBefore(beats, i) + rrAfter(beats, i)).toBeCloseTo(2 * rr0, 1);
      expect(Math.abs(rrBefore(beats, i) + rrAfter(beats, i) - 2 * rr0) / (2 * rr0)).toBeLessThan(0.05);
    }
  });

  it("multifocal PVCs: morphology a and b differ in signal", () => {
    const s = spec({
      baseHr: 80,
      pattern: [
        { kind: "sinus", beats: 3 },
        { kind: "pvc", morphology: "a", count: 1 },
        { kind: "sinus", beats: 3 },
        { kind: "pvc", morphology: "b", count: 1 },
      ],
    });
    const { samples, beats } = generate(s, 20);
    const peak = (b: Beat) => samples[Math.round((b.time + b.qrsMs / 2000) * FS)];
    const a = beats.find((b) => b.morphology === "a")!;
    const b = beats.find((x) => x.morphology === "b")!;
    expect(peak(a)).toBeGreaterThan(0.8);
    expect(peak(b)).toBeLessThan(-0.8);
  });

  it("PAC: early beat with a non-compensatory pause", () => {
    const s = spec({
      baseHr: 90,
      pattern: [
        { kind: "sinus", beats: 4 },
        { kind: "pac", count: 1 },
      ],
    });
    const beats = generate(s, 40).beats;
    const rr0 = 60 / 90;
    const pacs = beats
      .map((b, i) => [b, i] as const)
      .filter(([b, i]) => b.type === "pac" && i > 0 && i < beats.length - 1);
    expect(pacs.length).toBeGreaterThan(3);
    for (const [b, i] of pacs) {
      expect(b.qrsMs).toBeLessThan(120);
      expect(b.pTime).not.toBeNull();
      expect(rrBefore(beats, i)).toBeLessThan(rr0);
      expect(rrBefore(beats, i) + rrAfter(beats, i)).toBeLessThan(2 * rr0 * 0.95);
    }
  });

  it("VT: every QRS at least 120 ms, rate within ±5 %", () => {
    const beats = generate(spec({ baseHr: 100, pattern: [{ kind: "vt", rate: 180, sec: 60 }] }), 30).beats;
    const vt = beats.filter((b) => b.type === "vt");
    expect(vt.length).toBeGreaterThan(50);
    expect(vt.every((b) => b.qrsMs >= 120)).toBe(true);
    const rate = 60 / mean(vt.slice(1).map((b, i) => b.time - vt[i].time));
    expect(Math.abs(rate - 180) / 180).toBeLessThan(0.05);
  });

  it("VF: no beats during fibrillation, but a chaotic signal of at least 0.2 mV", () => {
    const { beats, samples } = generate(
      spec({ baseHr: 100, pattern: [{ kind: "sinus", beats: 3 }, { kind: "vf", sec: 60 }] }),
      10,
    );
    const lastBeat = Math.max(...beats.map((b) => b.time));
    expect(lastBeat).toBeLessThan(2.5);
    const vf = Array.from(samples.slice(4 * FS, 10 * FS));
    expect(Math.max(...vf) - Math.min(...vf)).toBeGreaterThan(0.4);
  });

  it("Mobitz I: PR increases within each cycle before the dropped beat", () => {
    const beats = generate(
      spec({ baseHr: 80, pattern: [{ kind: "avblock", type: "mobitz1", sec: 60 }] }),
      30,
    ).beats;
    const cycles: number[][] = [[]];
    for (const b of beats) {
      if (b.type === "blocked") cycles.push([]);
      else cycles[cycles.length - 1].push(b.prMs!);
    }
    const complete = cycles.slice(1, -1);
    expect(complete.length).toBeGreaterThan(3);
    for (const prs of complete) {
      expect(prs.length).toBeGreaterThan(1);
      for (let i = 1; i < prs.length; i++) expect(prs[i]).toBeGreaterThan(prs[i - 1]);
    }
  });

  it("Mobitz II: constant PR and sudden drops", () => {
    const beats = generate(
      spec({ baseHr: 80, pattern: [{ kind: "avblock", type: "mobitz2", sec: 60 }] }),
      30,
    ).beats;
    const prs = beats.filter((b) => b.type !== "blocked").map((b) => b.prMs);
    expect(new Set(prs).size).toBe(1);
    expect(beats.filter((b) => b.type === "blocked").length).toBeGreaterThan(3);
  });

  it("AV block III: P and QRS rates differ and PR intervals vary", () => {
    const s = spec({ baseHr: 80, pattern: [{ kind: "avblock", type: "3", sec: 60, ventricularRate: 40 }] });
    const beats = generate(s, 30).beats;
    const p = beats.filter((b) => b.type === "blocked").map((b) => b.time);
    const qrs = beats.filter((b) => b.type === "escape").map((b) => b.time);
    const rate = (ts: number[]) => 60 / mean(ts.slice(1).map((t, i) => t - ts[i]));
    expect(rate(p)).toBeCloseTo(80, -1);
    expect(rate(qrs)).toBeCloseTo(40, -1);
    // Apparent PR: preceding P onset to QRS onset.
    const prs = qrs.map((q) => q - (Math.max(...p.filter((t) => t < q)) - 0.05));
    expect(Math.max(...prs) - Math.min(...prs)).toBeGreaterThan(0.2);
  });

  it.each([
    { mm: 2, slope: "horisontell" as const },
    { mm: -2, slope: "nedat" as const },
    { mm: 2.5, slope: "uppat" as const },
  ])("ST $mm mm ($slope) gives $mm × 0.1 mV ±0.01 at J + 60 ms", ({ mm, slope }) => {
    const { samples, beats } = generate(
      spec({ pattern: [{ kind: "sinus", beats: 10 }], st: { mm, slope } }),
      10,
    );
    for (const b of beats.slice(1, -1)) {
      const v = samples[Math.round((b.time + b.qrsMs / 1000 + 0.06) * FS)];
      expect(Math.abs(v - mm * 0.1)).toBeLessThanOrEqual(0.01);
    }
  });

  it("ST level holds at exercise heart rates", () => {
    const { samples, beats } = generate(
      spec({ baseHr: 130, pattern: [{ kind: "sinus", beats: 10 }], st: { mm: -2, slope: "horisontell" } }),
      10,
    );
    for (const b of beats.slice(1, -1)) {
      const v = samples[Math.round((b.time + b.qrsMs / 1000 + 0.06) * FS)];
      expect(Math.abs(v + 0.2)).toBeLessThanOrEqual(0.03);
    }
  });

  it("same seed gives identical signal, different seed does not", () => {
    const s = spec({
      baseHr: 100,
      pattern: [
        { kind: "sinus", beats: 3 },
        { kind: "af", meanRate: 110, sec: 5 },
      ],
      noise: { muscle: 0.5, baseline: 0.5 },
    });
    const a = generate(s, 15);
    const b = generate(s, 15);
    expect(Array.from(a.samples)).toEqual(Array.from(b.samples));
    expect(a.beats).toEqual(b.beats);
    expect(Array.from(generate({ ...s, seed: 2 }, 15).samples)).not.toEqual(Array.from(a.samples));
  });

  it("every content preset generates a finite signal with beats", () => {
    expect(ecgPresets.length).toBeGreaterThan(0);
    for (const preset of ecgPresets) {
      const { samples, beats } = generate(preset.rhythm, 20);
      expect(samples.length, preset.id).toBe(20 * FS);
      expect(samples.every(Number.isFinite), preset.id).toBe(true);
      expect(beats.length, preset.id).toBeGreaterThan(5);
    }
  });
});

describe("scale", () => {
  it("1 s is 25 mm and 1 mV is 10 mm", () => {
    expect(timeToX(1, 1)).toBe(25);
    expect(mvToY(1, 1)).toBe(10);
    expect(timeToX(0.2, 4)).toBeCloseTo(20);
    expect(mvToY(-0.5, 4)).toBe(-20);
  });
});
