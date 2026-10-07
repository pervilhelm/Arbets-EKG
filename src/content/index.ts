// Loads all content at build time. Files are bundled into the app, so they are
// precached by the service worker and available offline.
import { z } from "zod";
import { Case, Checklist, EcgPreset, Finding, Guide, Protocol, Source } from "./schema";

type JsonModules = Record<string, unknown>;

const findingFiles: JsonModules = import.meta.glob("/content/findings/*.json", {
  eager: true,
  import: "default",
});
const presetFiles: JsonModules = import.meta.glob("/content/ecg-presets/*.json", {
  eager: true,
  import: "default",
});
const caseFiles: JsonModules = import.meta.glob("/content/cases/*.json", {
  eager: true,
  import: "default",
});
const checklistFiles: JsonModules = import.meta.glob("/content/checklists/*.json", {
  eager: true,
  import: "default",
});
const guideFile: JsonModules = import.meta.glob("/content/guide.json", {
  eager: true,
  import: "default",
});
const protocolFile: JsonModules = import.meta.glob("/content/protocol.json", {
  eager: true,
  import: "default",
});
const sourcesFile: JsonModules = import.meta.glob("/content/sources.json", {
  eager: true,
  import: "default",
});

// validate:content runs before every build, so a failure here means the bundle
// and the content are out of sync. Fail loudly instead of rendering bad data.
function parse<S extends z.ZodType>(schema: S, file: string, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw new Error(`Ogiltigt innehåll i ${file}: ${result.error.message}`);
  return result.data;
}

function parseAll<S extends z.ZodType>(schema: S, files: JsonModules): z.output<S>[] {
  return Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, data]) => parse(schema, file, data));
}

function parseOne<S extends z.ZodType>(schema: S, files: JsonModules): z.output<S> {
  const [entry] = Object.entries(files);
  if (!entry) throw new Error("Innehållsfil saknas");
  return parse(schema, entry[0], entry[1]);
}

export const findings: Finding[] = parseAll(Finding, findingFiles);
export const findingById: ReadonlyMap<string, Finding> = new Map(findings.map((f) => [f.id, f]));
export const ecgPresets: EcgPreset[] = parseAll(EcgPreset, presetFiles);
export const presetById: ReadonlyMap<string, EcgPreset> = new Map(ecgPresets.map((p) => [p.id, p]));
export const cases: Case[] = parseAll(Case, caseFiles);
export const caseById: ReadonlyMap<string, Case> = new Map(cases.map((c) => [c.id, c]));
export const checklists: Checklist[] = parseAll(Checklist, checklistFiles);
export const guide: Guide = parseOne(Guide, guideFile);
export const protocol: Protocol = parseOne(Protocol, protocolFile);
export const sources: Source[] = parseOne(z.array(Source), sourcesFile);
