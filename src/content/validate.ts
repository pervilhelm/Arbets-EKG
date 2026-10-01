import { z } from "zod";
import {
  Checklist,
  EcgPreset,
  Finding,
  Protocol,
  Review,
  Scenario,
  Source,
  Strip,
  type Category,
} from "./schema";

export type ContentFile = { file: string; data: unknown };

export type ContentInput = {
  findings: ContentFile[];
  ecgPresets: ContentFile[];
  strips: ContentFile[];
  scenarios: ContentFile[];
  checklists: ContentFile[];
  protocol: ContentFile | null;
  sources: ContentFile | null;
};

export type ValidationError = { file: string; field: string; message: string };

export type ValidateOptions = { strict?: boolean };

const ECG_REQUIRED: Category[] = ["arytmi", "overledning", "ischemi"];

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
  const scenarios = parseAll(input.scenarios, Scenario);
  const checklists = parseAll(input.checklists, Checklist);

  const protocol = input.protocol ? parseAll([input.protocol], Protocol) : [];
  if (!input.protocol) push("content/protocol.json", "", "filen saknas");

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
  uniqueIds("scenario", scenarios);
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
    if (ECG_REQUIRED.includes(f.category) && !f.ecg?.presetId) {
      push(file, "ecg.presetId", `krävs för kategorin "${f.category}"`);
    }
  }
  for (const { file, value: p } of presets) ref(file, "findingId", p.findingId, findingIds, "fynd");
  for (const { file, value: s } of strips) ref(file, "findingId", s.findingId, findingIds, "fynd");
  for (const { file, value: s } of scenarios) {
    ref(file, "baseline.presetId", s.baseline.presetId, presetIds, "preset");
    s.events.forEach((e, i) => {
      ref(file, `events[${i}].presetId`, e.presetId, presetIds, "preset");
      ref(file, `events[${i}].findingId`, e.findingId, findingIds, "fynd");
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
    ...scenarios,
    ...checklists,
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
