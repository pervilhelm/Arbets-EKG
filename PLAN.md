# Utvecklingsplan: träningsapp för arbetsprov på cykel

Sep 30, 2026 · @Oscar

## Så används planen

Claude Code bygger appen i faserna 1 till 10, i ordning, en fas per session. Fas 0 är Oscars uppgifter: faserna 1 till 9 kan byggas innan den är klar, men fas 10 kräver den.

Exportera dokumentet som Markdown och spara det som `PLAN.md` i repots rot. Starta varje session med: *Läs PLAN.md och CLAUDE.md. Genomför nästa fas som inte är avbockad.*

### Arbetsregler för Claude Code

Kopieras till `CLAUDE.md` i fas 1.

1. Läs hela fasen innan du skriver kod. Bygg bara det fasen beskriver.
2. Kliniska trösklar, kategorier och åtgärder tas exakt från denna plan, aldrig ur eget minne.
3. Allt kliniskt innehåll som Claude Code skriver (sammanfattningar, kännetecken, förväxlingar, scenarier, EKG-presets) får `review.status: "utkast"`. Endast granskaren sätter `granskad`.
4. Ändra aldrig en befintlig tröskel, åtgärd eller källhänvisning om inte uppgiften uttryckligen säger det.
5. Saknas något som fasen kräver: skapa det som utkast och lägg en rad i `docs/OPEN_QUESTIONS.md`. Går ett acceptanskriterium inte att uppfylla: stoppa och fråga.
6. Tester bara för logik som kan gå fel tyst: EKG-generator, simulatormotor, schemaläggare, innehållsvalidering. Inga tester som bara kontrollerar att en komponent renderas.
7. UI-text på svenska. Kod, filnamn och kommentarer på engelska.
8. En fas är klar när `npm run check` är grön och alla acceptanskriterier är uppfyllda. Bocka då av fasen nedan och committa med `fas N: <rubrik>`.

### Status

- [ ] Fas 0: manuella förutsättningar (Oscar)
- [x] Fas 1: projektsetup och PWA
- [ ] Fas 2: innehållslager och validering
- [ ] Fas 3: EKG-motor
- [ ] Fas 4: riktiga EKG-remsor
- [ ] Fas 5: snabbuppslag
- [ ] Fas 6: simulator
- [ ] Fas 7: repetition och statistik
- [ ] Fas 8: checklistor
- [ ] Fas 9: kvalitet och tillgänglighet
- [ ] Fas 10: klinisk granskning och release

## Mål och avgränsning

Appen tränar sjuksköterskor att känna igen EKG-, blodtrycks- och symtomfynd under arbetsprov på cykel och att välja rätt åtgärd: avbryt, överväg avbrott eller fortsätt och observera.

**Används på:** surfplatta i labbet och mobil. Fungerar helt offline efter första besöket.

**Ingår:** snabbuppslag (trafikljus och fyndkort), simulator med rullande EKG, repetition med statistik, checklistor för före, under och efter testet.

**Ingår inte:** patientdata, inloggning, backend, koppling till riktig EKG-utrustning, beslutsstöd i skarpt läge.

**Utbildningsverktyg, inte beslutsstöd.** Startsidan och Om-sidan visar texten *Utbildningsverktyg. Ej avsett för beslut om enskilda patienter.* Mjukvara för kliniska beslut kan klassas som medicinteknisk produkt enligt MDR.

**Integritet:** all progress lagras lokalt i webbläsaren. Ingen data lämnar enheten.

## Teknikval

Appen är en statisk PWA utan backend. Valen är låsta; använd senaste stabila version av varje paket vid setup och lås dem i `package-lock.json`.

| Område | Val |
| --- | --- |
| Ramverk | Vite, React, TypeScript (`strict: true`) |
| Styling | Tailwind CSS |
| Routing | React Router |
| Offline och installation | `vite-plugin-pwa` (Workbox), precache av all kod, allt innehåll och alla EKG-remsor |
| Innehåll | JSON-filer i `content/`, validerade med Zod, importerade vid build |
| Lokal lagring | Dexie (IndexedDB) med `dexie-react-hooks` |
| State | Ren TypeScript-motor för simulatorn plus React-hooks. Inget globalt state-bibliotek |
| EKG-rendering | HTML Canvas 2D, egen komponent |
| EKG-datapipeline | Python 3.11 med `wfdb`, `numpy`, `scipy`. Körs lokalt, output committas |
| Tester | Vitest för logik, Playwright för e2e |
| Lint och format | ESLint, Prettier |
| CI och deploy | GitHub Actions till GitHub Pages |
| Pakethanterare | npm |

## Projektstruktur

Allt kliniskt innehåll ligger i `content/` så att det kan granskas och uppdateras utan att röra koden.

```
PLAN.md
CLAUDE.md
content/
  findings/          ett JSON per fynd
  ecg-presets/       parametrar för syntetiska EKG
  scenarios/         simulatorscenarier
  checklists/        före, under, efter
  protocol.json      belastningsprotokoll
  sources.json       källförteckning
public/
  strips/            riktiga EKG-remsor (JSON) med licens
scripts/
  validate-content.ts
  review-export.ts
  ecg/
    extract_strips.py
    strip_map.yaml
    requirements.txt
src/
  content/           Zod-scheman och laddning
  ecg/               generator, renderer
  simulator/         motor (ren TS) och UI
  review/            repetition och schemaläggning
  features/          lookup, checklists, stats, about
  db/                Dexie-schema
  ui/                delade komponenter
tests/
  e2e/
docs/
  OPEN_QUESTIONS.md
```

## Innehållsmodell

Alla innehållstyper har ett `review`-fält, så att granskningen styr vad som får släppas. Schemana läggs i `src/content/schema.ts` exakt så här; `RhythmSpec` definieras i fas 3.

```ts
import { z } from "zod";

export const Action = z.enum(["avbryt", "overvag", "fortsatt"]);
export const Category = z.enum(["arytmi", "overledning", "ischemi", "blodtryck", "symtom", "ovrigt"]);
const Id = z.string().regex(/^[a-z0-9-]+$/);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const Review = z.object({
  status: z.enum(["utkast", "granskad"]),
  reviewer: z.string().optional(),
  date: IsoDate.optional(),
});

export const SourceRef = z.object({
  sourceId: Id,
  locator: z.string(), // t.ex. "Indications for Termination, Absolute"
});

export const Finding = z.object({
  id: Id,
  name: z.string(),
  aliases: z.array(z.string()),           // sökord, t.ex. "VT", "kammartakykardi"
  category: Category,
  action: Action,
  summary: z.string().max(200),           // max 3 rader i UI
  recognize: z.array(z.string()).min(1).max(5),
  confuseWith: z.array(z.object({ findingId: Id, difference: z.string() })),
  todo: z.string(),                       // vad sjuksköterskan gör
  ecg: z.object({ presetId: Id.optional(), stripIds: z.array(Id) }).optional(),
  sources: z.array(SourceRef).min(1),
  review: Review,
});

export const EcgPreset = z.object({
  id: Id,
  findingId: Id.optional(),
  lead: z.string(),                       // t.ex. "II"
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
  atSec: z.number().min(0),               // sekunder från fasens start
  phase: z.enum(["belastning", "aterhamtning"]),
  presetId: Id.optional(),
  vitals: z.object({ hr: z.number(), sbp: z.number(), dbp: z.number() }).partial().optional(),
  symptom: z.string().optional(),         // "Patienten säger: ..."
  findingId: Id.optional(),               // styr bedömningen
});

export const Scenario = z.object({
  id: Id,
  title: z.string(),
  patient: z.string(),                    // 1 till 2 meningar bakgrund
  baseline: z.object({ hr: z.number(), sbp: z.number(), dbp: z.number(), presetId: Id }),
  loadDurationSec: z.number(),            // belastningsfasens längd om ingen avbryter
  events: z.array(ScenarioEvent).min(1),
  responseWindowSec: z.number().default(15),
  debrief: z.string(),
  review: Review,
});

export const Checklist = z.object({
  id: Id,
  phase: z.enum(["fore", "under", "efter"]),
  title: z.string(),
  items: z.array(z.object({
    text: z.string(),
    findingId: Id.optional(),
    sourceRef: SourceRef.optional(),
  })),
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
```

**Valideringsregler** i `scripts/validate-content.ts`, utöver schemat:

1. Id är unika inom varje typ.
2. Alla referenser pekar på något som finns: `findingId`, `presetId`, `stripIds`, `sourceId`, `confuseWith`.
3. Fynd med kategori `arytmi`, `overledning` eller `ischemi` måste ha `ecg.presetId`.
4. `status: "granskad"` kräver `reviewer` och `date`.
5. Flaggan `--strict` fallerar om något i `content/` eller `public/strips/` har `status: "utkast"`.
6. Felmeddelanden anger filnamn, fält och vad som är fel.

## Seed-innehåll

Appen startar med 23 fynd hämtade ur AHA:s riktlinje från 2013. Namn, kategori och åtgärd tas exakt härifrån. Alla får `sourceId: "aha-2013"` och status `utkast`. Kolumnen *EKG* anger om fyndet ska ha ett syntetiskt preset (`<id>` som preset-id).

### Avbryt

Locator: `Indications for Termination: Absolute`.

| Id | Fynd | Kategori | EKG |
| --- | --- | --- | --- |
| `vt-ihallande` | Ihållande ventrikeltakykardi | arytmi | ja |
| `av-block-2-3` | AV-block II eller III | overledning | ja |
| `st-hojning` | ST-höjning >1,0 mm i avledningar utan Q-våg från tidigare infarkt (ej aVR, aVL, V1) | ischemi | ja |
| `bt-fall-med-ischemi` | Systoliskt BT-fall >10 mmHg trots ökad belastning, med andra tecken på ischemi | blodtryck | nej |
| `angina-mattlig-svar` | Måttlig till svår angina | symtom | nej |
| `cns-symtom` | CNS-symtom: ataxi, yrsel, nära synkope | symtom | nej |
| `dalig-perfusion` | Tecken på dålig perfusion: cyanos, blekhet | symtom | nej |
| `tekniskt-fel` | Tekniska svårigheter att övervaka EKG eller systoliskt BT | ovrigt | nej |
| `patient-vill-avbryta` | Patienten ber att få avbryta | ovrigt | nej |

För `av-block-2-3` gäller två locators: `Indications for Termination: Absolute` och `Disorders of Impulse Conduction`.

### Överväg avbrott

Locator: `Indications for Termination: Relative`.

| Id | Fynd | Kategori | EKG |
| --- | --- | --- | --- |
| `st-sankning` | Uttalad ST-sänkning >2 mm, horisontell eller nedåtsluttande, mätt 60 till 80 ms efter J-punkten, vid misstänkt ischemi | ischemi | ja |
| `bt-fall-utan-ischemi` | Systoliskt BT-fall >10 mmHg, kvarstående under utgångsvärdet trots ökad belastning, utan andra tecken på ischemi | blodtryck | nej |
| `brostsmarta-okande` | Tilltagande bröstsmärta | symtom | nej |
| `trotthet-dyspne` | Trötthet, andfåddhet, pipande andning, benkramp eller claudicatio | symtom | nej |
| `ves-multifokala` | Multifokala VES | arytmi | ja |
| `ves-trioler` | Ventrikulära trioler (tre VES i följd) | arytmi | ja |
| `svt` | Supraventrikulär takykardi | arytmi | ja |
| `bradyarytmi` | Bradyarytmi som kan bli mer komplex eller påverka hemodynamiken | arytmi | ja |
| `hypertensiv-reaktion` | Kraftig hypertensiv reaktion: systoliskt >250 eller diastoliskt >115 mmHg | blodtryck | nej |
| `skankelblock-nytt` | Nytillkommet skänkelblock som inte direkt kan skiljas från VT | overledning | ja |

### Fortsätt och observera

Dessa är inte avbrottskriterier i AHA:s tabell; granskaren bekräftar klassningen.

| Id | Fynd | Kategori | EKG | Locator |
| --- | --- | --- | --- | --- |
| `ves-enstaka` | Enstaka VES | arytmi | ja | `Disorders of Impulse Formation` |
| `sves-enstaka` | Enstaka SVES | arytmi | ja | `Disorders of Impulse Formation` |
| `sinustakykardi` | Sinustakykardi, normalt svar på belastning | arytmi | ja | `HR Response` |
| `puls-85-procent` | Uppnådd 85 % av åldersberäknad maxpuls, inte ensamt ett avbrottskriterium | ovrigt | nej | `HR Response` |

### Medvetet utelämnat

Följande läggs som frågor i `docs/OPEN_QUESTIONS.md` i fas 2 och läggs till först efter klinikens PM: nytillkommet förmaksflimmer eller fladder, ventrikelflimmer och akut rutin, AV-block I, icke-ihållande VT, klinikens definition av ihållande VT, bigemini.

## Fas 0: manuella förutsättningar (Oscar)

Detta kan Claude Code inte göra. Fas 10 kan inte slutföras förrän allt är klart.

- [ ] Skaffa klinikens PM för arbetsprov på cykel: avbrottskriterier, belastningsprotokoll, BT-intervall, rutin vid avbrott och larm.
- [ ] Utse en medicinskt ansvarig granskare (läkare eller fysiolog) som signerar innehållet.
- [ ] Få svar från granskaren på punkterna under *Medvetet utelämnat*.
- [ ] Bestäm appens namn.
- [ ] Skapa GitHub-repo och aktivera GitHub Pages med GitHub Actions som källa.
- [ ] Kontrollera om klinikens PM får publiceras öppet. GitHub Pages är publikt; om svaret är nej byts hosting till en med åtkomstskydd innan fas 10.

## Fas 1: projektsetup och PWA

Mål: ett installerbart app-skal med navigering, som fungerar offline och byggs grönt i CI.

**Uppgifter**

1. Scaffolda Vite + React + TypeScript (strict) i repots rot.
2. Installera och konfigurera paketen i *Teknikval*.
3. Skapa mappstrukturen i *Projektstruktur* med tomma filer där det behövs.
4. Skapa `CLAUDE.md` med arbetsreglerna, npm-kommandona och en kort beskrivning av mappstrukturen.
5. npm-skript: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `e2e`, `validate:content`, samt `check` som kör lint, typecheck, test, validate:content och build i följd. `validate:content` är ett stubbskript som lyckas tills fas 2 ersätter det.
6. App-skal med bottennavigering: Uppslag, Simulator, Repetera, Checklistor, Om. Varje sida är tom med rubrik.
7. Startsidan och Om-sidan visar *Utbildningsverktyg. Ej avsett för beslut om enskilda patienter.*
8. PWA-manifest med platshållarnamn tills fas 0 ger namnet, ikoner i 192 och 512 px, precache av alla byggda filer.
9. GitHub Actions-workflow som kör `npm run check` vid varje push.
10. Skapa `docs/OPEN_QUESTIONS.md` med rubriken *Öppna frågor*.

**Acceptanskriterier**

- `npm run check` är grön lokalt och i CI.
- Appen går att installera som PWA och startar i flygplansläge efter första besöket.
- Navigeringen fungerar vid 375 px och 1024 px bredd utan horisontell scroll.

## Fas 2: innehållslager och validering

Mål: allt seed-innehåll finns som validerade JSON-filer som appen laddar offline.

**Uppgifter**

1. Implementera schemana i *Innehållsmodell* i `src/content/schema.ts`. Lägg `RhythmSpec` som `z.unknown()` tills fas 3.
2. Skriv `scripts/validate-content.ts` med valideringsreglerna. Kör med `tsx`.
3. Ladda innehållet med `import.meta.glob` (eager) i `src/content/index.ts` och exportera typade uppslag: `findings`, `findingById`, `scenarios`, `checklists`, `protocol`, `sources`.
4. Skapa `content/sources.json` med källorna under *Källor*: id `aha-2013`, `mitdb`, `ptb-xl`.
5. Skapa en fil per rad i *Seed-innehåll*, `content/findings/<id>.json`. Fyll `id`, `name`, `category`, `action` och `sources` exakt enligt tabellen. Skriv `summary`, `recognize`, `confuseWith`, `todo` och `aliases` som korta utkast. `ecg.presetId` sätts till fyndets id där kolumnen EKG är *ja*; `stripIds` lämnas tom. Skapa samtidigt en stubbfil `content/ecg-presets/<id>.json` per sådant fynd med `lead: "II"`, `rhythm: {}` och status `utkast`, så att referenserna validerar; den fylls i fas 3.
6. Skapa `content/protocol.json` med AHA:s exempel för cykel: `startW: 25`, `stepW: 25`, `stepSec: 120`, `recoveryMinSec: 360`. Sätt `bpEverySec: 120` som platshållare. Allt som `utkast`.
7. Lägg varje punkt under *Medvetet utelämnat* och varje platshållare i `docs/OPEN_QUESTIONS.md`.

**Acceptanskriterier**

- `npm run validate:content` är grön. `npm run validate:content -- --strict` är röd, eftersom allt är utkast.
- En fil med ett trasigt referens-id ger ett fel som namnger filen och fältet.
- Tester: giltig och ogiltig fil mot schemat, trasig referens, `granskad` utan `reviewer`.

## Fas 3: EKG-motor

Mål: appen kan generera och rita varje EKG-fynd i seed-listan, deterministiskt och på riktigt EKG-papper.

**Uppgifter**

1. Definiera `RhythmSpec` som Zod discriminated union i `src/content/schema.ts` och ersätt `z.unknown()`. Utgångsform:

```ts
type RhythmSpec = {
  baseHr: number;          // slag/min, kan skrivas över av simulatorn
  seed: number;            // samma seed ger samma signal
  pattern: RhythmSegment[]; // körs i ordning och loopar
  st?: { mm: number; slope: "horisontell" | "nedat" | "uppat" };
  qrsMs?: number;          // brett QRS, t.ex. skänkelblock
  noise?: { muscle: number; baseline: number }; // 0 till 1
};

type RhythmSegment =
  | { kind: "sinus"; beats: number }
  | { kind: "pvc"; morphology: "a" | "b"; count: number } // 1 enstaka, 3 triol
  | { kind: "pac"; count: number }
  | { kind: "vt"; rate: number; sec: number }
  | { kind: "svt"; rate: number; sec: number }
  | { kind: "af"; meanRate: number; sec: number }
  | { kind: "avblock"; type: "1" | "mobitz1" | "mobitz2" | "3"; sec: number; ventricularRate?: number }
  | { kind: "brady"; rate: number; sec: number }
  | { kind: "artifact"; type: "muskel" | "baslinje" | "elektrod"; sec: number };
```

2. `src/ecg/generator.ts`: `generate(spec, durationSec) => { samples: Float32Array; fs: 250; beats: Beat[] }`. Varje slag byggs av gaussiska vågor för P, Q, R, S och T. T-vågens läge skalas med RR-intervallet. Slumptal via seedad PRNG (t.ex. mulberry32). `beats` innehåller tid, typ, P-läge, QRS-bredd och PR-intervall, så att tester och simulator kan läsa rytmen utan att analysera signalen.
3. Morfologiregler som generatorn ska följa:
   - VES: QRS minst 120 ms, ingen föregående P, T-våg med motsatt riktning mot QRS, full kompensatorisk paus. Morfologi a och b skiljer sig tydligt för multifokala VES.
   - SVES: tidig P med avvikande form, smalt QRS, icke-kompensatorisk paus.
   - VT: brett QRS i angiven frekvens.
   - Förmaksflimmer: oregelbundna RR, inga P-vågor, lågamplitud flimmer i baslinjen.
   - AV-block: Mobitz I med tilltagande PR före bortfall, Mobitz II med konstant PR och plötsligt bortfall, grad III med P-vågor och QRS helt oberoende av varandra.
   - ST-förskjutning: nivå i mm mätt 60 ms efter J-punkten, med angiven lutning.
4. `src/ecg/EcgStrip.tsx`: Canvas-komponent. EKG-papper med 1 mm-rutor och 5 mm-rutor, 25 mm/s, 10 mm/mV, kalibreringspuls 1 mV. Lägen `static` (hela remsan) och `sweep` (monitor som ritar över sig själv). Skarp vid `devicePixelRatio` över 1. Skalning via rena funktioner `timeToX` och `mvToY`.
5. Fyll alla stubbfiler i `content/ecg-presets/` med en `RhythmSpec` som visar fyndet. Lägg till preset `sinus` (normal sinusrytm) som simulatorns utgångsrytm. Alla förblir `utkast`.
6. Utvecklingssida `/dev/ecg`, bara i dev-build, som visar alla presets under varandra med id.

**Acceptanskriterier och tester**

- Sinus 120/min ger medel-RR 500 ms ±5 %.
- VES: RR före plus RR efter är 2 × grund-RR ±5 %. SVES: summan är mindre än 2 × grund-RR.
- VT: alla QRS minst 120 ms, frekvens inom ±5 % av angiven.
- Mobitz I: PR ökar inom varje cykel före bortfallet.
- AV-block III: P-frekvens och QRS-frekvens skiljer sig, och PR-intervallen varierar.
- ST +2 mm ger 0,2 mV ±0,01 vid J + 60 ms.
- Samma `seed` ger identisk signal.
- `timeToX(1 s)` motsvarar 25 mm och `mvToY(1 mV)` motsvarar 10 mm.
- Alla presets syns på `/dev/ecg` utan fel i konsolen.

## Fas 4: riktiga EKG-remsor från PhysioNet

Mål: fyndkorten kan visa verkliga EKG-exempel bredvid de syntetiska, med korrekt licens och attribution.

Båda databaserna är vilo-EKG, inte arbetsprov. Remsorna lär ut morfologi; simulatorn använder alltid den syntetiska motorn.

**Uppgifter**

1. `scripts/ecg/extract_strips.py` med `requirements.txt` (`wfdb`, `numpy`, `scipy`, `pyyaml`). Scriptet laddar ner poster direkt från PhysioNet via `wfdb`.
2. `scripts/ecg/strip_map.yaml` styr urvalet, en post per fynd-id. Exempel på form:

```yaml
svt:
  dataset: mitdb
  rhythm: "(SVTA"   # rytmannotation i aux_note
  count: 2
ves-trioler:
  dataset: mitdb
  beats: "VVV"      # tre V-slag i följd
  count: 2
st-sankning:
  dataset: ptb-xl
  scp: "<kod ur scp_statements.csv>"
  count: 1
```

3. **MIT-BIH Arrhythmia Database:** läs rytmannotationer (`aux_note`) och slagannotationer (`symbol`). Kör först ett inventeringsläge, `--inventory`, som listar alla förekommande koder med antal och längd. Skriv mappningen utifrån den listan och MIT-BIH:s egen dokumentation, inte ur minnet. Välj kanalen som heter `MLII`. Klipp 10 s-fönster där fyndet ligger mitt i.
4. **PTB-XL:** använd `records500`, bara poster i `strat_fold` 9 eller 10 med `validated_by_human` sann, eftersom de har högst etikettkvalitet. Hitta SCP-koder i `scp_statements.csv`; inventeringsläget listar kandidater.
5. Resampla till 250 Hz, spara i mV med 3 decimaler som `public/strips/<fynd-id>-<n>.json` enligt `Strip`-schemat, med `license`, `citation` och `review.status: "utkast"`.
6. Fast seed för urvalet, så att omkörning ger samma filer.
7. Uppdatera `stripIds` i respektive fyndfil.
8. Källsida `/om/kallor` som listar databaser, licenser och citeringar från `sources.json`.

**Acceptanskriterier**

- Scriptet är idempotent: två körningar ger identiska filer.
- Varje fynd i `strip_map.yaml` har minst en remsa, eller en rad i `docs/OPEN_QUESTIONS.md` som säger att inget passande segment fanns.
- `public/strips/` är mindre än 5 MB totalt.
- Varje remsfil har licens och citering, och källsidan visar dem.
- Appen kör aldrig Python; bara de genererade JSON-filerna committas.

## Fas 5: snabbuppslag

Mål: från startsidan till rätt fyndkort på högst två tryck.

**Uppgifter**

1. Startsida `/`: tre stora knappar, *Avbryt*, *Överväg avbrott*, *Fortsätt och observera*, med antal fynd på varje. Varje knapp har färg, ikon och text; färgen bär aldrig betydelsen ensam. Sökfält överst.
2. Listvy `/uppslag/:action`: fynden grupperade per kategori (arytmi, överledning, ischemi, blodtryck, symtom, övrigt).
3. Fyndkort `/fynd/:id`, uppifrån och ner:
   - EKG överst. Flikar *Exempel* (riktig remsa) och *Syntetiskt* (preset). Visa *Exempel* som standard om en granskad remsa finns.
   - Sammanfattning, max tre rader.
   - *Känns igen på*: `recognize`.
   - *Förväxla inte med*: `confuseWith` som länkar till respektive kort, med skillnaden i en rad.
   - *Gör så här*: `todo`.
   - Källa med locator.
   - Gul etikett *Ej granskad* när `review.status` är `utkast`.
4. Utöka `EcgStrip` med `layout: "single" | "12-lead"`. 12-avledningsremsor visas i standardlayout 3 × 4 plus rytmremsa II.
5. Tryck på EKG öppnar helskärm, liggande, med pinch-zoom.
6. Sök: klientsök på `name` och `aliases`, tålig mot stavfel (t.ex. Fuse.js).

**Acceptanskriterier**

- Valfritt fyndkort nås från startsidan på högst två tryck.
- Allt fungerar offline.
- e2e: startsida, *Avbryt*, *Ihållande ventrikeltakykardi*, kortet visar EKG och etiketten *Ej granskad*.

## Fas 6: simulator

Mål: användaren tränar beslutet under tidspress, med rullande EKG, stigande belastning och feedback efteråt.

**Uppgifter**

1. `src/simulator/engine.ts`: ren TypeScript, ingen DOM, driven av `tick(dtMs)`. Indata: scenario och protokoll. Tillstånd: tid, fas, belastning (W), HR, senaste BT med tidsstämpel, aktiv rytm, aktiva händelser, logg över användarens tryck.
2. Belastningen följer `protocol.json`. HR interpoleras linjärt mot nästa händelses värde. BT visas bara som mätningar var `bpEverySec`; en händelse som ändrar BT syns vid nästa mätning.
3. En händelse med `findingId` blir *aktiv* när den syns för användaren: EKG och symtom direkt, BT vid nästa mätning. Den är aktiv i `responseWindowSec`.
4. Bedömning utifrån fyndets `action`:
   - `avbryt`: rätt om användaren trycker *Avbryt testet* medan händelsen är aktiv. Annars *missat avbrott*; simuleringen pausas och går till debriefing.
   - `overvag`: rätt om användaren trycker *Markera fynd* eller *Avbryt testet* medan händelsen är aktiv.
   - `fortsatt`: rätt om användaren inte avbryter. *Markera fynd* räknas inte som fel.
   - *Avbryt testet* utan aktiv `avbryt`- eller `overvag`-händelse: *för tidigt avbrott*.
   - Reaktionstid loggas för varje rätt svar.
5. Efter avbrott eller efter `loadDurationSec` börjar återhämtningsfasen i `protocol.recoveryMinSec`, med belastning 0 W. Återhämtningshändelser bedöms på samma sätt; *Avbryt testet* byter där etikett till *Agera nu*; vad åtgärden innebär står på fyndkortet.
6. UI `/simulator/:id`: EKG i `sweep`-läge, belastning, HR, senaste BT med tid sedan mätning, symtomruta (*Patienten säger: ...*), knapparna *Markera fynd* och *Avbryt testet*, pausknapp. Listvy `/simulator` med alla scenarier och senaste resultat.
7. Debriefing: tidslinje med händelser och användarens tryck, bedömning per händelse, länk till fyndkortet och scenariots `debrief`-text.
8. Parametern `?speed=N` accelererar tiden, bara i dev- och testbuild.
9. Skapa 12 scenarier i `content/scenarios/`, alla `utkast`. Tillsammans ska de täcka varje fynd som har EKG-preset, minst tre blodtrycks- eller symtomfynd, minst två händelser i återhämtningsfasen och gröna distraktorer i minst hälften av scenarierna.

**Tester (motorn)**

- `avbryt`-händelse med tryck efter 10 s är rätt; utan tryck inom 15 s blir den *missat avbrott*.
- Tryck före första aktiva `avbryt`- eller `overvag`-händelse blir *för tidigt avbrott*.
- `fortsatt`-händelse plus *Avbryt testet* blir fel.
- BT-händelse blir aktiv vid nästa mätning, inte vid `atSec`.
- Belastningen efter 5 min matchar protokollet.

**Acceptanskriterier**

- Motortesterna är gröna.
- e2e: ett scenario körs med `?speed=10` till debriefing, som visar rätt bedömning.
- Simulatorn går i 60 fps på en mellanklass-Android (ingen tappad rendering i Chrome DevTools performance-profil vid 4x CPU-throttling).

## Fas 7: repetition och statistik

Mål: korta repetitionspass där de fynd användaren missar kommer tillbaka oftare.

**Uppgifter**

1. Frågor genereras från innehållet, inga handskrivna frågor. Tre typer:
   - EKG-remsa eller preset: vilken åtgärd? (tre val)
   - EKG-remsa eller preset: vilket fynd? (fyra val, distraktorer från `confuseWith` först, sedan samma kategori)
   - Fyndnamn: vilken åtgärd? (tre val, täcker även blodtrycks- och symtomfynd)
2. Leitner-schema med 5 lådor och intervallen 0, 1, 3, 7 och 14 dagar. Rätt svar flyttar upp en låda, fel svar till låda 1.
3. Pass `/repetera`: 10 frågor, förfallna först, fyll på med nya. Direkt feedback med länk till fyndkortet.
4. Dexie-tabeller: `answers` (itemId, correct, ms, at), `boxes` (itemId, box, dueAt), `simRuns` (scenarioId, result, at).
5. Statistik `/statistik`: träffsäkerhet per fynd, de fem mest missade, simulatorhistorik, knapp *Nollställ min data*.
6. Export och import av all progress som JSON-fil, för byte av enhet.

**Tester**

- Leitner: flytt upp, flytt till låda 1, korrekt `dueAt`.
- Distraktorer: alltid unika, aldrig rätt svar, fyller på från samma kategori när `confuseWith` inte räcker.
- Export följt av import ger identiska tabeller.

**Acceptanskriterier**

- Progress finns kvar efter omladdning och offline.
- e2e: ett pass på 5 frågor ger rätt statistik på `/statistik`.

## Fas 8: checklistor

Mål: tre bockbara checklistor för före, under och efter testet, med innehåll ur AHA 2013 och protokollet.

**Uppgifter**

1. `content/checklists/fore.json`. Två grupper, locator `Absolute and Relative Contraindications to Exercise Testing`:
   - *Absoluta kontraindikationer:* akut hjärtinfarkt inom 2 dygn; pågående instabil angina; okontrollerad arytmi med hemodynamisk påverkan; aktiv endokardit; symtomgivande svår aortastenos; dekompenserad hjärtsvikt; akut lungemboli, lunginfarkt eller djup ventrombos; akut myokardit eller perikardit; akut aortadissektion; fysisk funktionsnedsättning som hindrar säker och adekvat testning.
   - *Relativa kontraindikationer:* känd obstruktiv stenos i vänster huvudstam; måttlig till svår aortastenos med oklart samband med symtom; takyarytmier med okontrollerad kammarfrekvens; förvärvat höggradigt eller totalt AV-block; hypertrofisk obstruktiv kardiomyopati med kraftig vilogradient; nyligen genomgången stroke eller TIA; psykisk funktionsnedsättning med begränsad förmåga att samarbeta; vilohypertoni över 200/110 mmHg; okorrigerade tillstånd som betydande anemi, elektrolytrubbning eller hypertyreos.
   - *Förberedelser*, locator `Subject Preparation`: fastat 3 timmar; testets syfte och förlopp förklarat; aktuella läkemedel noterade; vilo-EKG med 12 avledningar taget.
2. `content/checklists/under.json`: EKG övervakas kontinuerligt; BT mäts var `protocol.bpEverySec`; fråga regelbundet om bröstsmärta, andfåddhet och yrsel; observera hudfärg. Locators: `Electrocardiographic Recording` för EKG, `Clinical Responses` för symtom, `Physical Signs` för hudfärg. Varje punkt länkar till relevanta fynd via `findingId`.
3. `content/checklists/efter.json`, locator `The Postexercise Period`: övervaka 6 till 8 minuter, längre vid symtom eller om BT, HR och ST inte återgått till nära utgångsvärdet; BT-fall och arytmier kan uppträda först i återhämtningen.
4. UI `/checklistor/:phase`: bockbar lista som nollställs vid ny session och inte sparas. Punkter med `findingId` länkar till fyndkortet.
5. Allt `utkast`. Klinikspecifika punkter från PM läggs till i fas 10.

**Acceptanskriterier**

- Varje punkt har `sourceRef` eller hänvisar till `protocol.json`.
- Checklistorna fungerar offline och är läsbara vid 375 px bredd.

## Fas 9: kvalitet och tillgänglighet

Mål: appen är tillgänglig, snabb och verifierad end-to-end innan granskningen.

**Uppgifter**

1. Tillgänglighet enligt WCAG 2.1 AA: kontrast, touchytor minst 44 × 44 px, fokusmarkering, skärmläsaretiketter på knappar och EKG (t.ex. *EKG-remsa: exempel på ihållande ventrikeltakykardi*). Trafikljusfärgerna kombineras alltid med ikon och text.
2. Mörkt läge som följer systeminställningen; EKG-papperet får en mörk variant med samma rutnät.
3. Samla e2e-flödena från fas 5, 6 och 7 i `tests/e2e/` och lägg till ett offlinetest: ladda appen, slå av nätverket (`context.setOffline(true)`), navigera till ett fyndkort, ett scenario och en checklista.
4. Lighthouse CI i GitHub Actions mot `npm run preview`, mobilprofil.
5. Gå igenom `docs/OPEN_QUESTIONS.md` och se till att varje rad anger vem som ska svara (Oscar eller granskaren).

**Acceptanskriterier**

- Lighthouse mobil: Performance, Accessibility och Best Practices minst 90.
- Alla e2e-tester, inklusive offlinetestet, är gröna i CI.
- Ingen axe-överträdelse på nivå *serious* eller *critical* på start, fyndkort, simulator, repetition och checklistor (`@axe-core/playwright`).

## Fas 10: klinisk granskning och release

Mål: allt innehåll är anpassat till klinikens PM, signerat av granskaren och publicerat. Kräver att fas 0 är klar.

**Uppgifter**

1. Anpassa innehållet till klinikens PM: trösklar, protokoll (`protocol.json`), BT-intervall, rutin vid avbrott. Lägg till fynd som granskaren godkänt från *Medvetet utelämnat*. Avvikelser mot AHA 2013 får egen `sourceId` för PM:et.
2. `scripts/review-export.ts` genererar `review/granskning.html`: ett utskrivbart dokument med varje fynd, varje preset och remsa som bild, varje scenario och checklistpunkt, med id och rutor för *Godkänd* och *Kommentar*.
3. Granskarens beslut förs in i filerna: `review.status: "granskad"`, `reviewer`, `date`. Claude Code gör detta bara på Oscars uttryckliga instruktion, post för post.
4. Release-workflow i GitHub Actions, manuellt startad: `npm run check`, `npm run validate:content -- --strict`, deploy till GitHub Pages (eller den hosting fas 0 bestämt).
5. Om-sidan visar appversion, innehållsdatum och granskarens namn.

**Acceptanskriterier**

- `validate:content --strict` är grön: inget innehåll är `utkast`.
- Release-workflow blockerar deploy om något steg fallerar.
- Den publicerade appen går att installera och fungerar offline efter första besöket.
- Etiketten *Ej granskad* syns ingenstans i den publicerade versionen.

## Källor

Id:t först på varje rad används som `sourceId` i `content/sources.json`.

- `aha-2013`: [Fletcher GF et al. Exercise Standards for Testing and Training: A Scientific Statement From the American Heart Association. Circulation 2013;128:873-934](https://www.ahajournals.org/doi/10.1161/CIR.0b013e31829b5b44). Avbrottskriterier, kontraindikationer, förberedelser, cykelprotokoll, återhämtning.
- `mitdb`: [MIT-BIH Arrhythmia Database, PhysioNet](https://physionet.org/content/mitdb/1.0.0/). 48 halvtimmesutdrag av tvåkanaliga ambulatoriska EKG. Licens: Open Data Commons Attribution License v1.0.
- `ptb-xl`: [PTB-XL v1.0.3, PhysioNet](https://physionet.org/content/ptb-xl/1.0.3/). 21 799 kliniska 12-avlednings-EKG à 10 s, 500 Hz. Licens: Creative Commons Attribution 4.0. Kontrollera licensen igen om en nyare version laddas ner.
