import { z } from "zod";

export const Action = z.enum(["avbryt", "overvag", "fortsatt"]);
export const Category = z.enum(["arytmi", "overledning", "ischemi", "blodtryck", "symtom", "ovrigt"]);
/** Categories that are seen on the ECG and therefore need ECG examples. */
export const ECG_CATEGORIES: readonly z.infer<typeof Category>[] = ["arytmi", "overledning", "ischemi"];
const Id = z.string().regex(/^[a-z0-9-]+$/);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const Count = z.number().int().min(1);
const Rate = z.number().positive(); // beats per minute
const Sec = z.number().positive();

export const RhythmSegment = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("sinus"), beats: Count }),
  z.object({ kind: z.literal("pvc"), morphology: z.enum(["a", "b"]), count: Count }), // 1 single, 3 triplet
  z.object({ kind: z.literal("pac"), count: Count }),
  z.object({ kind: z.literal("vt"), rate: Rate, sec: Sec }),
  z.object({ kind: z.literal("svt"), rate: Rate, sec: Sec }),
  z.object({ kind: z.literal("af"), meanRate: Rate, sec: Sec }),
  z.object({ kind: z.literal("vf"), sec: Sec }), // no QRS complexes
  z.object({
    kind: z.literal("avblock"),
    type: z.enum(["1", "mobitz1", "mobitz2", "3"]),
    sec: Sec,
    ventricularRate: Rate.optional(),
  }),
  z.object({ kind: z.literal("brady"), rate: Rate, sec: Sec }),
  z.object({ kind: z.literal("artifact"), type: z.enum(["muskel", "baslinje", "elektrod"]), sec: Sec }),
]);

const Level = z.number().min(0).max(1);

export const RhythmSpec = z.object({
  baseHr: Rate, // can be overridden by the simulator
  seed: z.number().int(), // same seed gives the same signal
  pattern: z.array(RhythmSegment).min(1), // runs in order and loops
  st: z.object({ mm: z.number(), slope: z.enum(["horisontell", "nedat", "uppat"]) }).optional(),
  qrsMs: z.number().min(60).max(200).optional(), // wide QRS, e.g. bundle branch block
  noise: z.object({ muscle: Level, baseline: Level }).optional(),
});

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
  findingId: Id.optional(), // absent for normal ECGs (id "normal-<n>")
  dataset: z.enum(["mitdb", "incartdb", "ptb-xl"]),
  record: z.string(),
  startSec: z.number(),
  fs: z.number(),
  leads: z.record(z.string(), z.array(z.number())), // mV
  license: z.string(),
  citation: z.string(),
  review: Review,
});

const Bpm = z.number().int().positive();
const Mmhg = z.number().int().positive();

export const CaseStep = z.object({
  phase: z.enum(["belastning", "aterhamtning"]),
  watt: z.number().int().min(0), // load during the step, follows protocol.json under load
  timeSec: z.number().int().min(0), // seconds from the start of the phase
  stripId: Id, // a real 12-lead ECG
  hr: Bpm,
  sbp: Mmhg,
  dbp: Mmhg,
  symptom: z.string().optional(), // shown as "Patienten säger: ..."
  findingId: Id.optional(), // drives the assessment; absent means nothing to act on
});

export const Case = z.object({
  id: Id,
  title: z.string(),
  background: z.string(), // 1 to 2 sentences
  baseline: z.object({ stripId: Id, hr: Bpm, sbp: Mmhg, dbp: Mmhg }),
  steps: z.array(CaseStep).min(3).max(5),
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

const MAX_SENTENCES = 5;

export const GuideStep = z.object({
  id: Id,
  title: z.string(),
  explanation: z.string().refine((t) => (t.match(/[.!?](\s|$)/g) ?? []).length <= MAX_SENTENCES, {
    message: `högst ${MAX_SENTENCES} meningar`,
  }),
  underLoad: z.string(), // what to look for during exercise
  stripId: Id, // a real 12-lead ECG
  findingIds: z.array(Id),
});

export const Guide = z.object({
  steps: z.array(GuideStep).length(7),
  review: Review,
});

export const Protocol = z.object({
  startW: z.number(),
  altStartW: z.array(z.number()).optional(), // other start loads in use, e.g. 75 W
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
  citation: z.string().optional(), // required citation text, e.g. for PhysioNet datasets
});

export type Action = z.infer<typeof Action>;
export type RhythmSegment = z.infer<typeof RhythmSegment>;
export type RhythmSpec = z.infer<typeof RhythmSpec>;
export type Category = z.infer<typeof Category>;
export type Review = z.infer<typeof Review>;
export type SourceRef = z.infer<typeof SourceRef>;
export type Finding = z.infer<typeof Finding>;
export type EcgPreset = z.infer<typeof EcgPreset>;
export type Strip = z.infer<typeof Strip>;
export type CaseStep = z.infer<typeof CaseStep>;
export type Case = z.infer<typeof Case>;
export type Checklist = z.infer<typeof Checklist>;
export type GuideStep = z.infer<typeof GuideStep>;
export type Guide = z.infer<typeof Guide>;
export type Protocol = z.infer<typeof Protocol>;
export type Source = z.infer<typeof Source>;
