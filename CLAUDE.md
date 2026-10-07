# CLAUDE.md

Träningsapp för sjuksköterskor: tolka EKG och känna igen arytmier under arbetsprov på cykel, och veta när testet ska avbrytas. Statisk PWA utan backend, fungerar offline. Planen finns i `PLAN.md`. Starta varje session med: _Läs PLAN.md och CLAUDE.md. Genomför nästa fas som inte är avbockad._

## Arbetssätt (låg tokenförbrukning, följs alltid)

1. En fas per session. Avsluta sessionen när fasen är committad.
2. Läs bara `PLAN.md`, `CLAUDE.md` och de filer fasen rör. Sök med grep och läs utdrag, inte hela filer.
3. Högst en skärmdump per ny vy. Verifiera i övrigt med tester, sidtext och konsolfel.
4. `npm run check` en gång i slutet. Under arbetet körs bara riktade tester.
5. Inga subagenter och ingen research utöver det fasen kräver.
6. Python-pipelinen körs bara i fas 5. Därefter är `public/strips/` fryst.
7. Korta svar: vad som gjorts, vad som inte gick och öppna frågor.

## Regler

1. Läs hela fasen innan du skriver kod. Bygg bara det fasen beskriver.
2. Kliniska trösklar, kategorier och åtgärder ändras aldrig utan uttrycklig instruktion. Åtgärderna är låsta av `src/content/index.test.ts` och listas i `PLAN.md`.
3. Allt kliniskt innehåll som Claude Code skriver (texter, guidesteg, fall, presets, remsurval) får `review.status: "utkast"`. Endast granskaren sätter `granskad`, och bara på Oscars uttryckliga instruktion.
4. Riktiga EKG (`public/strips/`) används för lärande och övning. Syntetiska EKG visas bara som märkt komplement på fyndkortet.
5. Saknas något: skapa det som utkast och lägg en rad i `docs/OPEN_QUESTIONS.md`. Går ett acceptanskriterium inte att uppfylla: stoppa och fråga.
6. Tester bara för logik som kan gå fel tyst: EKG-generator, innehållsvalidering, övningslogik (bedömning, frågegenerering). Inga tester som bara kontrollerar att en komponent renderas.
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

### EKG-remsor (Python, bara fas 5, appen kör aldrig Python)

```bash
/opt/homebrew/bin/python3.12 -m venv scripts/ecg/.venv
scripts/ecg/.venv/bin/pip install -r scripts/ecg/requirements.txt
scripts/ecg/.venv/bin/python scripts/ecg/extract_strips.py --inventory mitdb   # eller ptb-xl
scripts/ecg/.venv/bin/python scripts/ecg/extract_strips.py [--only <fynd-id>]
```

Urvalet styrs av `scripts/ecg/strip_map.yaml`. Skriptet skriver `public/strips/*.json` och uppdaterar `stripIds` i fyndfilerna. Det är idempotent. Bara JSON-filerna committas.

## Mappstruktur

- `content/`: kliniskt innehåll som JSON (`findings/`, `ecg-presets/`, `protocol.json`, `sources.json`, senare `guide.json` och `cases/`).
- `public/strips/`: riktiga EKG-remsor med licens och citering.
- `scripts/`: `validate-content.ts`, `generate-icons.ts`, `ecg/` (Python-pipeline).
- `src/content/`: scheman (`schema.ts`), laddning (`index.ts`), valideringsregler (`validate.ts`).
- `src/ecg/`: generator, `EcgStrip`, dev-sidan `/dev/ecg`.
- `src/features/`: uppslag, fyndkort, tolkningsguide, om och källor. `src/practice/`: quiz och fallövningar. `src/ui/`: app-skal och delade komponenter.
- `tests/e2e/`: Playwright. `docs/OPEN_QUESTIONS.md`: öppna frågor.

## Att känna till

- Appnamnet är en platshållare (`APP_NAME` i `vite.config.ts`, `<title>` i `index.html`) tills fas 0 bestämmer det.
- `BASE_PATH` styr Vites `base` och routerns `basename` vid undersökväg, t.ex. GitHub Pages.
