import { z } from "zod";

export const Action = z.enum(["avbryt", "overvag", "fortsatt"]);
export const Category = z.enum(["arytmi", "overledning", "ischemi", "blodtryck", "symtom", "ovrigt"]);
const Id = z.string().regex(/^[a-z0-9-]+$/);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Placeholder until phase 3 defines the rhythm model.
export const RhythmSpec = z.unknown();

export const Review = z.object({
  status: z.enum(["utkast", "granskad"]),
  reviewer: z.string().optional(),
  date: IsoDate.optional(),
});

export const SourceRef = z.object({
  sourceId: Id,
  locator: z.string(), // e.g. "Indications for Termination, Absolute"
});

export const Finding = z.object({
  id: Id,
  name: z.string(),
  aliases: z.array(z.string()), // search terms, e.g. "VT", "kammartakykardi"
  category: Category,
  action: Action,
  summary: z.string().max(200), // at most 3 lines in the UI
  recognize: z.array(z.string()).min(1).max(5),
  confuseWith: z.array(z.object({ findingId: Id, difference: z.string() })),
  todo: z.string(), // what the nurse does
  ecg: z.object({ presetId: Id.optional(), stripIds: z.array(Id) }).optional(),
  sources: z.array(SourceRef).min(1),
  review: Review,
});

export const EcgPreset = z.object({
  id: Id,
  findingId: Id.optional(),
  lead: z.string(), // e.g. "II"
  rhythm: RhythmSpec,
  review: Review,
});

export const Strip = z.object({
  id: Id,
  findingId: Id,
  dataset: z.enum(["mitdb", "ptb-xl"]),
  record: z.string(),
  startSec: z.number(),
  fs: z.number(),
  leads: z.record(z.string(), z.array(z.number())), // mV
  license: z.string(),
  citation: z.string(),
  review: Review,
});

export const ScenarioEvent = z.object({
  atSec: z.number().min(0), // seconds from the start of the phase
  phase: z.enum(["belastning", "aterhamtning"]),
  presetId: Id.optional(),
  vitals: z.object({ hr: z.number(), sbp: z.number(), dbp: z.number() }).partial().optional(),
  symptom: z.string().optional(), // "Patienten säger: ..."
  findingId: Id.optional(), // drives the assessment
});

export const Scenario = z.object({
  id: Id,
  title: z.string(),
  patient: z.string(), // 1 to 2 sentences of background
  baseline: z.object({ hr: z.number(), sbp: z.number(), dbp: z.number(), presetId: Id }),
  loadDurationSec: z.number(), // length of the load phase if nobody stops the test
  events: z.array(ScenarioEvent).min(1),
  responseWindowSec: z.number().default(15),
  debrief: z.string(),
  review: Review,
});

export const Checklist = z.object({
  id: Id,
  phase: z.enum(["fore", "under", "efter"]),
  title: z.string(),
  items: z.array(
    z.object({
      text: z.string(),
      findingId: Id.optional(),
      sourceRef: SourceRef.optional(),
    }),
  ),
  review: Review,
});

export const Protocol = z.object({
  startW: z.number(),
  stepW: z.number(),
  stepSec: z.number(),
  bpEverySec: z.number(),
  recoveryMinSec: z.number(),
  review: Review,
});

export const Source = z.object({
  id: Id,
  title: z.string(),
  url: z.string().url(),
  license: z.string().optional(),
});

export type Action = z.infer<typeof Action>;
export type Category = z.infer<typeof Category>;
export type Review = z.infer<typeof Review>;
export type SourceRef = z.infer<typeof SourceRef>;
export type Finding = z.infer<typeof Finding>;
export type EcgPreset = z.infer<typeof EcgPreset>;
export type Strip = z.infer<typeof Strip>;
export type ScenarioEvent = z.infer<typeof ScenarioEvent>;
export type Scenario = z.infer<typeof Scenario>;
export type Checklist = z.infer<typeof Checklist>;
export type Protocol = z.infer<typeof Protocol>;
export type Source = z.infer<typeof Source>;
