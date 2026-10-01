# CLAUDE.md

Träningsapp för sjuksköterskor: EKG-, blodtrycks- och symtomfynd vid arbetsprov på cykel. Statisk PWA utan backend, fungerar offline. Hela planen och innehållsmodellen finns i `PLAN.md`. Starta varje session med: _Läs PLAN.md och CLAUDE.md. Genomför nästa fas som inte är avbockad._

## Arbetsregler

1. Läs hela fasen innan du skriver kod. Bygg bara det fasen beskriver.
2. Kliniska trösklar, kategorier och åtgärder tas exakt från `PLAN.md`, aldrig ur eget minne.
3. Allt kliniskt innehåll som Claude Code skriver (sammanfattningar, kännetecken, förväxlingar, scenarier, EKG-presets) får `review.status: "utkast"`. Endast granskaren sätter `granskad`.
4. Ändra aldrig en befintlig tröskel, åtgärd eller källhänvisning om inte uppgiften uttryckligen säger det.
5. Saknas något som fasen kräver: skapa det som utkast och lägg en rad i `docs/OPEN_QUESTIONS.md`. Går ett acceptanskriterium inte att uppfylla: stoppa och fråga.
6. Tester bara för logik som kan gå fel tyst: EKG-generator, simulatormotor, schemaläggare, innehållsvalidering. Inga tester som bara kontrollerar att en komponent renderas.
7. UI-text på svenska. Kod, filnamn och kommentarer på engelska.
8. En fas är klar när `npm run check` är grön och alla acceptanskriterier är uppfyllda. Bocka då av fasen i `PLAN.md` och committa med `fas N: <rubrik>`.

## Kommandon

| Kommando                   | Gör                                                                         |
| -------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`              | Utvecklingsserver                                                           |
| `npm run build`            | Typkontroll och produktionsbygge till `dist/` (inklusive service worker)    |
| `npm run preview`          | Servera `dist/` lokalt                                                      |
| `npm run lint`             | ESLint, inga varningar tillåtna                                             |
| `npm run typecheck`        | `tsc -b` över app, config, skript och tester                                |
| `npm run test`             | Vitest (`src/**/*.test.ts`, `scripts/**/*.test.ts`)                         |
| `npm run e2e`              | Playwright (`tests/e2e/`), bygger och startar preview själv                 |
| `npm run validate:content` | Validerar `content/` och `public/strips/`; `-- --strict` fallerar på utkast |
| `npm run check`            | lint, typecheck, test, validate:content och build i följd                   |
| `npm run format`           | Prettier                                                                    |

Ikonerna genereras med `npx tsx scripts/generate-icons.ts`.

### EKG-remsor (Python, körs lokalt, appen kör aldrig Python)

```bash
/opt/homebrew/bin/python3.12 -m venv scripts/ecg/.venv
scripts/ecg/.venv/bin/pip install -r scripts/ecg/requirements.txt
scripts/ecg/.venv/bin/python scripts/ecg/extract_strips.py --inventory mitdb   # eller ptb-xl
scripts/ecg/.venv/bin/python scripts/ecg/extract_strips.py [--only <fynd-id>]
```

Urvalet styrs av `scripts/ecg/strip_map.yaml`. Skriptet skriver `public/strips/*.json` och uppdaterar `stripIds` i fyndfilerna. Det är idempotent (fast seed). Bara JSON-filerna committas.

## Mappstruktur

- `content/` allt kliniskt innehåll som JSON: `findings/`, `ecg-presets/`, `scenarios/`, `checklists/`, `protocol.json`, `sources.json`.
- `public/strips/` riktiga EKG-remsor (JSON) med licens. `public/icons/` PWA-ikoner.
- `scripts/` innehållsvalidering, granskningsexport, ikongenerering och `ecg/` (Python-pipeline för remsor, körs lokalt).
- `src/content/` Zod-scheman (`schema.ts`), laddning (`index.ts`) och valideringsreglerna (`validate.ts`, som `scripts/validate-content.ts` anropar). `src/ecg/` generator och renderer. `src/simulator/` motor (ren TS) och UI. `src/review/` repetition och schemaläggning. `src/features/` lookup, checklists, stats, about. `src/db/` Dexie-schema. `src/ui/` delade komponenter (app-skal, bottennavigering).
- `tests/e2e/` Playwright. `docs/OPEN_QUESTIONS.md` öppna frågor.

## Att känna till

- Appnamnet är en platshållare (`APP_NAME` i `vite.config.ts`, `<title>` i `index.html`) tills fas 0 bestämmer det.
- `BASE_PATH` styr Vites `base` och routerns `basename` när appen serveras från en undersökväg, t.ex. GitHub Pages.
