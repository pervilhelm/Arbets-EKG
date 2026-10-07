import { z } from "zod";
import {
  Case,
  Checklist,
  EcgPreset,
  Finding,
  Guide,
  Protocol,
  Review,
  Source,
  Strip,
  ECG_CATEGORIES,
  type Action,
} from "./schema";

export type ContentFile = { file: string; data: unknown };

export type ContentInput = {
  findings: ContentFile[];
  ecgPresets: ContentFile[];
  strips: ContentFile[];
  cases: ContentFile[];
  checklists: ContentFile[];
  guide?: ContentFile | null;
  protocol: ContentFile | null;
  sources: ContentFile | null;
};

export type ValidationError = { file: string; field: string; message: string };

export type ValidateOptions = { strict?: boolean };

const SEVERITY: Record<Action, number> = { fortsatt: 0, overvag: 1, avbryt: 2 };

type Parsed<T> = { file: string; value: T };

export function formatError(e: ValidationError): string {
  return e.field ? `${e.file}: ${e.field}: ${e.message}` : `${e.file}: ${e.message}`;
}

function fieldPath(path: PropertyKey[]): string {
  return path.reduce<string>((acc, key) => {
    if (typeof key === "number") return `${acc}[${key}]`;
    return acc ? `${acc}.${String(key)}` : String(key);
  }, "");
}

export function validateContent(input: ContentInput, options: ValidateOptions = {}): ValidationError[] {
  const errors: ValidationError[] = [];
  const push = (file: string, field: string, message: string) => errors.push({ file, field, message });

  function parseAll<S extends z.ZodType>(files: ContentFile[], schema: S): Parsed<z.output<S>>[] {
    const out: Parsed<z.output<S>>[] = [];
    for (const { file, data } of files) {
      const result = schema.safeParse(data);
      if (result.success) {
        out.push({ file, value: result.data });
      } else {
        for (const issue of result.error.issues) push(file, fieldPath(issue.path), issue.message);
      }
    }
    return out;
  }

  const findings = parseAll(input.findings, Finding);
  const presets = parseAll(input.ecgPresets, EcgPreset);
  const strips = parseAll(input.strips, Strip);
  const cases = parseAll(input.cases, Case);
  const checklists = parseAll(input.checklists, Checklist);

  const protocol = input.protocol ? parseAll([input.protocol], Protocol) : [];
  if (!input.protocol) push("content/protocol.json", "", "filen saknas");

  const guide = input.guide ? parseAll([input.guide], Guide) : [];

  const sources: Parsed<Source>[] = [];
  if (input.sources) {
    for (const { value } of parseAll([input.sources], z.array(Source))) {
      value.forEach((source, i) => sources.push({ file: `${input.sources!.file} [${i}]`, value: source }));
    }
  } else {
    push("content/sources.json", "", "filen saknas");
  }

  // Rule 1: ids are unique within each type.
  function uniqueIds(kind: string, items: Parsed<{ id: string }>[]): Set<string> {
    const seen = new Map<string, string>();
    for (const { file, value } of items) {
      const first = seen.get(value.id);
      if (first) push(file, "id", `${kind}-id "${value.id}" används redan i ${first}`);
      else seen.set(value.id, file);
    }
    return new Set(seen.keys());
  }

  const findingIds = uniqueIds("fynd", findings);
  const presetIds = uniqueIds("preset", presets);
  const stripIds = uniqueIds("remsa", strips);
  uniqueIds("fall", cases);
  uniqueIds("checklista", checklists);
  const sourceIds = uniqueIds("käll", sources);

  // Rule 2: every reference points to something that exists.
  const ref = (file: string, field: string, id: string | undefined, known: Set<string>, kind: string) => {
    if (id !== undefined && !known.has(id)) push(file, field, `okänt ${kind}-id "${id}"`);
  };

  for (const { file, value: f } of findings) {
    f.confuseWith.forEach((c, i) =>
      ref(file, `confuseWith[${i}].findingId`, c.findingId, findingIds, "fynd"),
    );
    ref(file, "ecg.presetId", f.ecg?.presetId, presetIds, "preset");
    f.ecg?.stripIds.forEach((id, i) => ref(file, `ecg.stripIds[${i}]`, id, stripIds, "remsa"));
    f.sources.forEach((s, i) => ref(file, `sources[${i}].sourceId`, s.sourceId, sourceIds, "käll"));

    // Rule 3: ECG categories must have a synthetic preset.
    if (ECG_CATEGORIES.includes(f.category) && !f.ecg?.presetId) {
      push(file, "ecg.presetId", `krävs för kategorin "${f.category}"`);
    }
  }
  for (const { file, value: p } of presets) ref(file, "findingId", p.findingId, findingIds, "fynd");
  for (const { file, value: s } of strips) {
    ref(file, "findingId", s.findingId, findingIds, "fynd");
    // The sources page shows license and citation per dataset; strips must match it.
    const source = sources.find((src) => src.value.id === s.dataset)?.value;
    if (!source) push(file, "dataset", `källa "${s.dataset}" saknas i sources.json`);
    else {
      if (s.license !== source.license)
        push(file, "license", `skiljer sig från sources.json för "${s.dataset}"`);
      if (s.citation !== source.citation)
        push(file, "citation", `skiljer sig från sources.json för "${s.dataset}"`);
    }
  }
  const stripById = new Map(strips.map((s) => [s.value.id, s.value]));
  const findingById = new Map(findings.map((f) => [f.value.id, f.value]));
  const twelveLead = (file: string, field: string, id: string) => {
    const strip = stripById.get(id);
    if (strip && Object.keys(strip.leads).length !== 12)
      push(file, field, `remsan "${id}" har inte 12 avledningar`);
  };

  for (const { file, value: g } of guide) {
    g.steps.forEach((step, i) => {
      ref(file, `steps[${i}].stripId`, step.stripId, stripIds, "remsa");
      step.findingIds.forEach((id, j) => ref(file, `steps[${i}].findingIds[${j}]`, id, findingIds, "fynd"));
      twelveLead(file, `steps[${i}].stripId`, step.stripId);
    });
  }
  const p = protocol[0]?.value;
  for (const { file, value: c } of cases) {
    ref(file, "baseline.stripId", c.baseline.stripId, stripIds, "remsa");
    twelveLead(file, "baseline.stripId", c.baseline.stripId);
    if (stripById.get(c.baseline.stripId)?.findingId)
      push(file, "baseline.stripId", "utgångs-EKG:t ska vara ett normalt EKG");

    c.steps.forEach((step, i) => {
      const at = (field: string) => `steps[${i}].${field}`;
      ref(file, at("stripId"), step.stripId, stripIds, "remsa");
      ref(file, at("findingId"), step.findingId, findingIds, "fynd");
      twelveLead(file, at("stripId"), step.stripId);

      // The load follows the protocol; recovery is at most the start load.
      if (p && step.phase === "belastning") {
        const watt = p.startW + Math.floor(step.timeSec / p.stepSec) * p.stepW;
        if (step.watt !== watt)
          push(file, at("watt"), `ska vara ${watt} W vid ${step.timeSec} s enligt protokollet`);
      }
      if (p && step.phase === "aterhamtning" && step.watt > p.startW)
        push(file, at("watt"), `återhämtning får vara högst ${p.startW} W`);

      const prev = c.steps[i - 1];
      if (prev && prev.phase === "aterhamtning" && step.phase === "belastning")
        push(file, at("phase"), "belastning kan inte komma efter återhämtning");
      else if (prev && prev.phase === step.phase && step.timeSec <= prev.timeSec)
        push(file, at("timeSec"), "stegen ska komma i tidsordning");

      // The ECG must not call for a stronger action than the step is assessed by.
      const stepAction = step.findingId ? findingById.get(step.findingId)?.action : undefined;
      const stripFinding = stripById.get(step.stripId)?.findingId;
      const stripAction = stripFinding ? findingById.get(stripFinding)?.action : undefined;
      if (stripAction && SEVERITY[stripAction] > SEVERITY[stepAction ?? "fortsatt"])
        push(file, at("findingId"), `EKG:t visar "${stripFinding}", som kräver en starkare åtgärd än steget`);

      // An abort ends the case, so a later step could never be played.
      if (stepAction === "avbryt" && i < c.steps.length - 1)
        push(file, at("findingId"), "ett avbrottsfynd måste ligga i sista steget");
    });
  }
  for (const { file, value: c } of checklists) {
    c.items.forEach((item, i) => {
      ref(file, `items[${i}].findingId`, item.findingId, findingIds, "fynd");
      ref(file, `items[${i}].sourceRef.sourceId`, item.sourceRef?.sourceId, sourceIds, "käll");
    });
  }

  // Rules 4 and 5: review status.
  const reviewed: Parsed<{ review: Review }>[] = [
    ...findings,
    ...presets,
    ...strips,
    ...cases,
    ...checklists,
    ...guide,
    ...protocol,
  ];
  for (const { file, value } of reviewed) {
    const { status, reviewer, date } = value.review;
    if (status === "granskad") {
      if (!reviewer) push(file, "review.reviewer", 'krävs när status är "granskad"');
      if (!date) push(file, "review.date", 'krävs när status är "granskad"');
    } else if (options.strict) {
      push(file, "review.status", 'är "utkast" (--strict kräver granskat innehåll)');
    }
  }

  return errors;
}
