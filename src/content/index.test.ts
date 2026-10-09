import { describe, expect, it } from "vitest";
import { cases, findingById, findings, protocol, sources } from "./index";
import { ECG_CATEGORIES } from "./schema";


const idsWithAction = (action: string) =>
  findings
    .filter((f) => f.action === action)
    .map((f) => f.id)
    .sort();

describe("bundled content", () => {
  it("matches the seed table in PLAN.md", () => {
    expect(idsWithAction("avbryt")).toEqual(
      [
        "vt-ihallande",
        "ventrikelflimmer",
        "av-block-2-3",
        "st-hojning",
        "bt-fall-med-ischemi",
        "angina-mattlig-svar",
        "cns-symtom",
        "dalig-perfusion",
        "tekniskt-fel",
        "patient-vill-avbryta",
      ].sort(),
    );
    expect(idsWithAction("overvag")).toEqual(
      [
        "st-sankning",
        "bt-fall-utan-ischemi",
        "brostsmarta-okande",
        "trotthet-dyspne",
        "ves-multifokala",
        "ves-trioler",
        "svt",
        "bradyarytmi",
        "hypertensiv-reaktion",
        "skankelblock-nytt",
        "formaksflimmer-fladder",
        "ves-bigemini",
      ].sort(),
    );
    expect(idsWithAction("fortsatt")).toEqual(
      ["ves-enstaka", "sves-enstaka", "sinustakykardi", "puls-85-procent", "av-block-1"].sort(),
    );
  });

  it("cites AHA 2013 for every finding, with both locators for AV-block", () => {
    for (const f of findings) expect(f.sources.every((s) => s.sourceId === "aha-2013")).toBe(true);
    expect(findingById.get("av-block-2-3")?.sources.map((s) => s.locator)).toEqual([
      "Indications for Termination: Absolute",
      "Disorders of Impulse Conduction",
    ]);
  });

  it("loads protocol and sources", () => {
    expect(protocol).toMatchObject({
      startW: 50,
      altStartW: [75],
      stepW: 25,
      stepSec: 120,
      bpEverySec: 180,
      recoveryMinSec: 360,
    });
    expect(sources.map((s) => s.id)).toEqual(["aha-2013", "mitdb", "incartdb", "ptb-xl"]);
  });

  it("covers the case requirements in PLAN.md", () => {
    const steps = cases.flatMap((c) => c.steps);
    const covered = new Set(steps.map((s) => s.findingId));
    // Every ECG finding with a real ECG; the rest cannot be shown in a case step.
    const ecgFindings = findings.filter(
      (f) => ECG_CATEGORIES.includes(f.category) && (f.ecg?.stripIds.length ?? 0) > 0,
    );
    expect(cases.length).toBeGreaterThanOrEqual(6);
    for (const f of ecgFindings) expect(covered, f.id).toContain(f.id);
    const bpOrSymptom = findings.filter(
      (f) => ["blodtryck", "symtom"].includes(f.category) && covered.has(f.id),
    );
    expect(bpOrSymptom.length).toBeGreaterThanOrEqual(2);
    expect(steps.some((s) => s.phase === "aterhamtning")).toBe(true);
    const withGreen = cases.filter((c) =>
      c.steps.some((s) => s.findingId && findingById.get(s.findingId)?.action === "fortsatt"),
    );
    expect(withGreen.length).toBeGreaterThanOrEqual(cases.length / 2);
  });
});
