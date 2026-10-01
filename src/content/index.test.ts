import { describe, expect, it } from "vitest";
import { findingById, findings, protocol, sources } from "./index";

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
      ].sort(),
    );
    expect(idsWithAction("fortsatt")).toEqual(
      ["ves-enstaka", "sves-enstaka", "sinustakykardi", "puls-85-procent"].sort(),
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
    expect(protocol).toMatchObject({ startW: 25, stepW: 25, stepSec: 120, recoveryMinSec: 360 });
    expect(sources.map((s) => s.id)).toEqual(["aha-2013", "mitdb", "ptb-xl"]);
  });
});
