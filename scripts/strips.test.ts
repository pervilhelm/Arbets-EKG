import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const TWELVE_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
const ECG_CATEGORIES = ["arytmi", "overledning", "ischemi"];

type StripFile = { id: string; findingId?: string; leads: Record<string, number[]> };
type FindingFile = { id: string; category: string; ecg?: { stripIds: string[] } };

const readJson = <T>(dir: string): T[] =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(root, dir, f), "utf8")) as T);

const strips = readJson<StripFile>("public/strips");
const stripById = new Map(strips.map((s) => [s.id, s]));
const isTwelveLead = (s: StripFile) =>
  TWELVE_LEADS.every(
    (lead) => (s.leads[lead]?.length ?? 0) > 0 && s.leads[lead].length === s.leads.I?.length,
  );

describe("real ECG strips", () => {
  // Added in phase 9 after the strips were frozen; listed in docs/OPEN_QUESTIONS.md.
  const AWAITING_STRIPS = ["ventrikelflimmer"];

  it("give every ECG finding at least one 12-lead strip", () => {
    const missing = readJson<FindingFile>("content/findings")
      .filter((f) => ECG_CATEGORIES.includes(f.category))
      .filter(
        (f) => !(f.ecg?.stripIds ?? []).some((id) => stripById.has(id) && isTwelveLead(stripById.get(id)!)),
      )
      .map((f) => f.id)
      .filter((id) => !AWAITING_STRIPS.includes(id));
    expect(missing).toEqual([]);
  });

  it("include four normal 12-lead ECGs without a finding", () => {
    const normals = strips.filter((s) => s.id.startsWith("normal-"));
    expect(normals.map((s) => s.id).sort()).toEqual(["normal-1", "normal-2", "normal-3", "normal-4"]);
    expect(normals.every((s) => s.findingId === undefined && isTwelveLead(s))).toBe(true);
  });
});
