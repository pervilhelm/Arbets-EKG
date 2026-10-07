import { describe, expect, it } from "vitest";
import { formatError, validateContent, type ContentInput } from "./validate";

const draft = { status: "utkast" };
const rhythm = { baseHr: 70, seed: 1, pattern: [{ kind: "sinus", beats: 4 }] };

function finding(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Fynd ${id}`,
    aliases: [],
    category: "symtom",
    action: "fortsatt",
    summary: "Kort sammanfattning.",
    recognize: ["Kännetecken"],
    confuseWith: [],
    todo: "Observera.",
    sources: [{ sourceId: "aha-2013", locator: "Indications for Termination: Absolute" }],
    review: draft,
    ...overrides,
  };
}

function baseInput(): ContentInput {
  return {
    findings: [
      { file: "content/findings/a.json", data: finding("a") },
      {
        file: "content/findings/b.json",
        data: finding("b", {
          category: "arytmi",
          ecg: { presetId: "b", stripIds: [] },
          confuseWith: [{ findingId: "a", difference: "Skillnad." }],
        }),
      },
    ],
    ecgPresets: [
      {
        file: "content/ecg-presets/b.json",
        data: { id: "b", findingId: "b", lead: "II", rhythm, review: draft },
      },
    ],
    strips: [],
    scenarios: [],
    checklists: [],
    protocol: {
      file: "content/protocol.json",
      data: { startW: 25, stepW: 25, stepSec: 120, bpEverySec: 120, recoveryMinSec: 360, review: draft },
    },
    sources: {
      file: "content/sources.json",
      data: [{ id: "aha-2013", title: "AHA", url: "https://example.org/aha" }],
    },
  };
}

describe("validateContent", () => {
  it("accepts valid content", () => {
    expect(validateContent(baseInput())).toEqual([]);
  });

  it("rejects a file that breaks the schema, naming file and field", () => {
    const input = baseInput();
    input.findings[0].data = finding("a", { action: "stoppa", recognize: [] });
    const errors = validateContent(input);
    expect(errors.map((e) => [e.file, e.field])).toEqual(
      expect.arrayContaining([
        ["content/findings/a.json", "action"],
        ["content/findings/a.json", "recognize"],
      ]),
    );
  });

  it("reports a broken reference with file and field", () => {
    const input = baseInput();
    input.findings[1].data = finding("b", {
      category: "arytmi",
      ecg: { presetId: "b", stripIds: [] },
      confuseWith: [{ findingId: "finns-inte", difference: "x" }],
    });
    const errors = validateContent(input);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ file: "content/findings/b.json", field: "confuseWith[0].findingId" });
    expect(formatError(errors[0])).toContain('okänt fynd-id "finns-inte"');
  });

  it("checks references from presets, scenarios and checklists", () => {
    const input = baseInput();
    input.ecgPresets[0].data = { id: "b", findingId: "saknas", lead: "II", rhythm, review: draft };
    input.scenarios = [
      {
        file: "content/scenarios/s.json",
        data: {
          id: "s",
          title: "S",
          patient: "P",
          baseline: { hr: 70, sbp: 130, dbp: 80, presetId: "saknas" },
          loadDurationSec: 600,
          events: [{ atSec: 0, phase: "belastning", findingId: "saknas" }],
          debrief: "D",
          review: draft,
        },
      },
    ];
    input.checklists = [
      {
        file: "content/checklists/c.json",
        data: {
          id: "c",
          phase: "fore",
          title: "C",
          items: [{ text: "T", sourceRef: { sourceId: "saknas", locator: "L" } }],
          review: draft,
        },
      },
    ];
    expect(validateContent(input).map((e) => `${e.file} ${e.field}`)).toEqual([
      "content/ecg-presets/b.json findingId",
      "content/scenarios/s.json baseline.presetId",
      "content/scenarios/s.json events[0].findingId",
      "content/checklists/c.json items[0].sourceRef.sourceId",
    ]);
  });

  it("requires strip license and citation to match the dataset source", () => {
    const input = baseInput();
    input.sources!.data = [
      { id: "aha-2013", title: "AHA", url: "https://example.org/aha" },
      { id: "mitdb", title: "MIT", url: "https://example.org/mit", license: "ODC-By", citation: "Moody" },
    ];
    const strip = (license: string) => ({
      id: "b-1",
      findingId: "b",
      dataset: "mitdb",
      record: "100",
      startSec: 0,
      fs: 250,
      leads: { MLII: [0, 0.1] },
      license,
      citation: "Moody",
      review: draft,
    });
    input.strips = [{ file: "public/strips/b-1.json", data: strip("ODC-By") }];
    expect(validateContent(input)).toEqual([]);
    input.strips = [{ file: "public/strips/b-1.json", data: strip("CC0") }];
    expect(validateContent(input)).toEqual([
      expect.objectContaining({ file: "public/strips/b-1.json", field: "license" }),
    ]);
  });

  it("rejects duplicate ids within a type", () => {
    const input = baseInput();
    input.findings.push({ file: "content/findings/a2.json", data: finding("a") });
    expect(validateContent(input)).toEqual([
      expect.objectContaining({ file: "content/findings/a2.json", field: "id" }),
    ]);
  });

  it("requires an ECG preset for arrhythmia, conduction and ischemia findings", () => {
    const input = baseInput();
    input.findings[0].data = finding("a", { category: "ischemi" });
    expect(validateContent(input)).toEqual([
      expect.objectContaining({ file: "content/findings/a.json", field: "ecg.presetId" }),
    ]);
  });

  it("requires reviewer and date when status is granskad", () => {
    const input = baseInput();
    input.findings[0].data = finding("a", { review: { status: "granskad", date: "2026-10-01" } });
    expect(validateContent(input)).toEqual([
      expect.objectContaining({ file: "content/findings/a.json", field: "review.reviewer" }),
    ]);
  });

  it("fails drafts only in strict mode", () => {
    const input = baseInput();
    expect(validateContent(input, { strict: false })).toEqual([]);
    const strictErrors = validateContent(input, { strict: true });
    expect(strictErrors.length).toBe(4); // two findings, one preset, protocol
    expect(strictErrors.every((e) => e.field === "review.status")).toBe(true);
  });
});

describe("guide validation", () => {
  const step = (over: Record<string, unknown> = {}) => ({
    id: "s",
    title: "Steg",
    explanation: "En mening.",
    underLoad: "Titta.",
    stripId: "x",
    findingIds: ["a"],
    ...over,
  });
  const withGuide = (steps: unknown[]) => {
    const input = baseInput();
    input.guide = { file: "content/guide.json", data: { steps, review: draft } };
    return input;
  };
  const strip = (leads: number) => ({
    file: "public/strips/x.json",
    data: {
      id: "x",
      dataset: "mitdb",
      record: "1",
      startSec: 0,
      fs: 250,
      leads: Object.fromEntries(Array.from({ length: leads }, (_, i) => [`L${i}`, [0]])),
      license: "l",
      citation: "c",
      review: draft,
    },
  });

  it("rejects explanations over five sentences", () => {
    const input = withGuide(Array.from({ length: 7 }, () => step({ explanation: "A. B. C. D. E. F." })));
    expect(validateContent(input).some((e) => e.message.includes("högst 5 meningar"))).toBe(true);
  });

  it("requires 12-lead strips and known finding ids", () => {
    const input = withGuide(Array.from({ length: 7 }, () => step({ findingIds: ["nope"] })));
    input.strips = [strip(1)];
    input.sources!.data = [
      { id: "aha-2013", title: "AHA", url: "https://example.org/aha" },
      { id: "mitdb", title: "M", url: "https://example.org/m", license: "l", citation: "c" },
    ];
    const msgs = validateContent(input).map((e) => e.message);
    expect(msgs).toContain('okänt fynd-id "nope"');
    expect(msgs).toContain('remsan "x" har inte 12 avledningar');
  });
});
