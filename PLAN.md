# Utvecklingsplan: träningsapp för arbetsprov på cykel

Reviderad 2026-10-07 · @Oscar. Ersätter planen från 2026-09-30 (faserna 1–4 genomförda enligt den, finns i git-historiken).

## Mål

Appen lär sjuksköterskor att **tolka EKG och känna igen arytmier under arbetsprov på cykel**, och att välja rätt åtgärd: avbryt, överväg avbrott eller fortsätt och observera.

- **Riktiga EKG överallt där användaren lär sig och övar.** Fyndkort, tolkningsguide, quiz och fallövningar visar verkliga 12-avlednings-EKG från öppna databaser, ritade som ett riktigt EKG: standardlayout 3 × 4 plus rytmremsa II, 25 mm/s, 10 mm/mV, kalibreringspuls och avledningsnamn. Syntetiska EKG används bara som märkt komplement på fyndkortet.
- **Används på** surfplatta och mobil. Fungerar helt offline efter första besöket. Ingen inloggning, ingen backend, ingen patientdata. Progress lagras lokalt.
- **Utbildningsverktyg, inte beslutsstöd.** Startsidan och Om-sidan visar _Utbildningsverktyg. Ej avsett för beslut om enskilda patienter._

## Status

- [x] Fas 1–4: app-skal och PWA, innehåll och validering, EKG-generator, remsor från PhysioNet
- [ ] Fas 0: manuella förutsättningar (Oscar), krävs för fas 9
- [x] Fas 5: riktiga 12-avlednings-EKG
- [x] Fas 6: fyndkort och uppslag
- [x] Fas 7: tolkningsguide
- [ ] Fas 8: quiz och fallövningar
- [ ] Fas 9: granskning och release

## Arbetssätt (gäller varje session)

Syftet är låg tokenförbrukning. Reglerna finns också i `CLAUDE.md`.

1. **En fas per session.** Starta en ny session för varje fas. Avsluta sessionen när fasen är committad.
2. **Läs smalt.** Läs `PLAN.md` och `CLAUDE.md`, sedan bara de filer fasen rör. Sök med grep och läs utdrag i stället för hela filer.
3. **Högst en skärmdump per ny vy.** Verifiera i övrigt med tester, sidtext och konsolfel.
4. **`npm run check` en gång i slutet.** Under arbetet körs bara riktade tester.
5. **Inga subagenter**, ingen extra research utöver det fasen kräver.
6. **Python-pipelinen körs bara i fas 5.** Därefter är remsorna frysta.
7. **Korta svar.** Rapportera vad som gjorts, vad som inte gick och öppna frågor, utan att återge koden.
8. **Modell:** Opus för fas 5 och 8 (dataurval respektive logik), Sonnet för fas 6, 7 och 9.

Uppskattad förbrukning, inklusive cachad kontext: fas 5 cirka 3–4 M tokens, fas 6 cirka 2–3 M, fas 7 cirka 1 M, fas 8 cirka 3–4 M, fas 9 cirka 1–2 M. Totalt cirka 10–14 M.

## Det som finns (fas 1–4)

- Vite, React, TypeScript (strict), Tailwind, React Router, PWA med precache, Vitest, Playwright, ESLint, Prettier, CI i GitHub Actions.
- Innehållsscheman i `src/content/schema.ts`, validering i `src/content/validate.ts` (`npm run validate:content [-- --strict]`), laddning i `src/content/index.ts`.
- 23 fynd i `content/findings/` hämtade ur AHA 2013, alla `utkast`. Åtgärden per fynd är låst av testet `src/content/index.test.ts`, som speglar AHA:s tabell. Ändra aldrig en åtgärd utan uttrycklig instruktion.
- EKG-generator (`src/ecg/generator.ts`), remskomponent (`src/ecg/EcgStrip.tsx`), 13 syntetiska presets, utvecklingssidan `/dev/ecg`.
- 19 remsor i `public/strips/` från MIT-BIH (en avledning, MLII) och PTB-XL (12 avledningar). Pipeline i `scripts/ecg/`. Källsida `/om/kallor`.
- Öppna frågor i `docs/OPEN_QUESTIONS.md`.

**Fynd per åtgärd** (källa AHA 2013, _Indications for Termination_; fortsätt-fynden bekräftas av granskaren):

- Avbryt: `vt-ihallande`, `av-block-2-3`, `st-hojning`, `bt-fall-med-ischemi`, `angina-mattlig-svar`, `cns-symtom`, `dalig-perfusion`, `tekniskt-fel`, `patient-vill-avbryta`.
- Överväg avbrott: `st-sankning`, `bt-fall-utan-ischemi`, `brostsmarta-okande`, `trotthet-dyspne`, `ves-multifokala`, `ves-trioler`, `svt`, `bradyarytmi`, `hypertensiv-reaktion`, `skankelblock-nytt`.
- Fortsätt och observera: `ves-enstaka`, `sves-enstaka`, `sinustakykardi`, `puls-85-procent`.

EKG-fynden är de tolv med kategori `arytmi`, `overledning` eller `ischemi`.

## Fas 0: manuella förutsättningar (Oscar)

- [ ] Klinikens PM för arbetsprov: avbrottskriterier, protokoll, BT-intervall, rutin vid avbrott.
- [ ] Medicinskt ansvarig granskare som signerar innehållet.
- [ ] Svar på frågorna i `docs/OPEN_QUESTIONS.md`.
- [ ] Appens namn, GitHub-repo med Pages, och besked om PM:et får publiceras öppet.

## Fas 5: riktiga 12-avlednings-EKG

Mål: varje EKG-fynd har minst ett riktigt 12-avlednings-EKG, och det finns normala 12-avlednings-EKG att använda som utgångsläge i fallövningarna.

1. Inventera öppna 12-avlednings-databaser på PhysioNet utöver PTB-XL, med fokus på fynd som PTB-XL saknar (VT, trioler, multifokala VES, AV-block II/III, SVT). Kandidater att kontrollera: St Petersburg INCART 12-lead Arrhythmia Database (slagannoterad, 30 min per post) och _A large scale 12-lead ECG database for arrhythmia study_. Kontrollera licens och citering på respektive PhysioNet-sida, inte ur minnet. Lägg varje vald databas i `content/sources.json` och utöka `Strip.dataset`.
2. Utöka `extract_strips.py` med inventering och urval för de nya databaserna. Varje 12-avlednings-remsa är 10 s, 250 Hz, med avledningarna I, II, III, aVR, aVL, aVF och V1–V6. Spara amplituder i mV med 2 decimaler.
3. `Strip.findingId` blir valfritt. Lägg till 4 normala 12-avlednings-EKG från PTB-XL (`NORM`, sinusrytm, olika frekvenser) med id `normal-<n>`.
4. Urvalet granskas visuellt med ett kontaktark (en bild per 10 remsor). Byt ut remsor som inte tydligt visar fyndet.
5. MIT-BIH-remsorna med en avledning behålls som extra rytmexempel men räknas inte som fyndets 12-avlednings-EKG.

**Acceptanskriterier**

- Varje EKG-fynd har minst en 12-avlednings-remsa, eller en rad i `docs/OPEN_QUESTIONS.md` som förklarar varför och vilken databas som skulle behövas.
- `public/strips/` är högst 8 MB. Skriptet är idempotent. Varje remsa har licens och citering som stämmer med `sources.json`.

## Fas 6: fyndkort och uppslag

Mål: från startsidan till rätt fyndkort på högst två tryck, med ett EKG som ser ut som ett riktigt.

1. Ta bort de oanvända beroendena `dexie` och `dexie-react-hooks`.
2. `EcgStrip` får `layout: "12-lead"`: standardlayout 3 × 4 (I, II, III / aVR, aVL, aVF / V1–V3 / V4–V6, 2,5 s per kolumn) plus rytmremsa II över hela bredden, avledningsnamn, kalibreringspuls och en rubrikrad med 25 mm/s och 10 mm/mV. På smal skärm scrollar EKG:t horisontellt inuti sin ruta. Ingen zoom.
3. Startsida `/`: tre stora knappar _Avbryt_, _Överväg avbrott_, _Fortsätt och observera_ med antal fynd, färg, ikon och text (färgen bär aldrig betydelsen ensam), plus ett enkelt filterfält på namn och `aliases`.
4. Listvy `/uppslag/:action` grupperad per kategori.
5. Fyndkort `/fynd/:id`: riktigt EKG överst (flikar per remsa, plus fliken _Syntetiskt_ där preset finns), sammanfattning, _Känns igen på_, _Förväxla inte med_ (länkar), _Gör så här_, källa med locator, gul etikett _Ej granskad_ vid `utkast`. Varje EKG har en skärmläsaretikett, t.ex. _EKG med 12 avledningar: exempel på supraventrikulär takykardi_.

**Acceptanskriterier**

- Valfritt fyndkort nås på högst två tryck och fungerar offline.
- e2e: startsida, _Avbryt_, _AV-block II eller III_, kortet visar 12-avlednings-EKG och _Ej granskad_.

## Fas 7: tolkningsguide

Mål: en systematisk metod för att läsa ett EKG under arbetsprov.

1. `content/guide.json` (schema i `schema.ts`, status `utkast`): 7 steg i ordning, nämligen frekvens, rytm och regelbundenhet, P-våg, PR-tid, QRS-bredd och form, ST-sträcka, T-våg. Varje steg har en kort förklaring (högst 5 meningar), vad man letar efter under belastning, ett riktigt 12-avlednings-EKG (`stripId`) och länkar till relevanta fynd.
2. Sidan `/tolka` visar ett steg i taget med föregående och nästa. Lägg _Tolka_ i bottennavigeringen i stället för _Checklistor_.

**Acceptanskriterier**

- Alla steg validerar, och alla `stripId` och fynd-id finns.
- Sidan fungerar offline och är läsbar vid 375 px.

## Fas 8: quiz och fallövningar

Mål: användaren övar tolkning och avbrottsbeslut på riktiga EKG.

1. **Quiz** `/ova/quiz`: 10 frågor per pass, genererade ur innehållet. Frågetyper:
   - 12-avlednings-EKG: vilket fynd? (4 val, distraktorer från `confuseWith` först, sedan samma kategori)
   - 12-avlednings-EKG: vilken åtgärd? (3 val)
   - Fyndnamn: vilken åtgärd? (3 val, täcker även blodtrycks- och symtomfynd)

   Direkt återkoppling med länk till fyndkortet. Felbesvarade frågor sparas i `localStorage` och kommer oftare i nästa pass.
2. **Fallövningar** `/ova/fall`: `content/cases/*.json` (ersätter `Scenario`-schemat, status `utkast`). Ett fall har bakgrund, ett normalt utgångs-EKG och 3–5 steg. Varje steg anger belastning (W) och tid enligt `protocol.json`, ett riktigt 12-avlednings-EKG (`stripId`), puls, BT, eventuellt symtom (_Patienten säger: ..._) och eventuellt `findingId`. Steget visar EKG:t med rytmremsa II rullande som en monitor.
3. Användaren väljer _Fortsätt_, _Markera fynd_ eller _Avbryt testet_ inom 20 s. Bedömning ur fyndets `action`:
   - `avbryt`: rätt är _Avbryt testet_. Annat svar eller timeout ger _missat avbrott_ och fallet går till genomgång.
   - `overvag`: rätt är _Markera fynd_ eller _Avbryt testet_.
   - `fortsatt` eller inget fynd: rätt är _Fortsätt_ eller _Markera fynd_. _Avbryt testet_ ger _för tidigt avbrott_.
4. Genomgång efter fallet: varje steg med EKG, rätt åtgärd, användarens val, reaktionstid och länk till fyndkortet.
5. Bedömningen är en ren funktion i `src/practice/`, utan DOM. Tester: varje regel i punkt 3, timeout, distraktorer som alltid är unika och aldrig rätt svar.
6. Skapa 6 fall. Tillsammans ska de täcka alla EKG-fynd som har en 12-avlednings-remsa, minst två blodtrycks- eller symtomfynd och minst ett steg i återhämtningen. Minst hälften ska ha ett grönt fynd som distraktor.

**Acceptanskriterier**

- Testerna är gröna.
- e2e: ett fall spelas till genomgång med rätt bedömning, och ett quizpass på 10 frågor slutförs.

## Fas 9: granskning och release

Kräver fas 0.

1. Anpassa innehållet till klinikens PM. Avvikelser mot AHA 2013 får en egen `sourceId`.
2. Sidan `/granskning` (bara i dev-bygget, utskrivbar): varje fynd, remsa, guidesteg och fall med id och plats för _Godkänd_ och _Kommentar_.
3. Granskarens beslut förs in post för post, bara på Oscars uttryckliga instruktion: `review.status: "granskad"`, `reviewer`, `date`.
4. Grundläggande tillgänglighet: kontrast, touchytor på minst 44 px, fokusmarkering och etiketter.
5. Release-workflow (manuellt startad): `npm run check`, `validate:content -- --strict`, deploy. Om-sidan visar version, innehållsdatum och granskare.

**Acceptanskriterier**

- `validate:content --strict` är grön, och _Ej granskad_ syns ingenstans i den publicerade versionen.
- e2e offline: ladda appen, slå av nätverket, öppna ett fyndkort, guiden och ett fall.

## Utanför planen

Kan läggas till senare vid behov: checklistor, statistiksida, export och import av progress, kontinuerlig simulator, mörkt läge, Lighthouse CI.

## Källor

- `aha-2013`: Fletcher GF et al. Exercise Standards for Testing and Training. Circulation 2013;128:873-934. https://www.ahajournals.org/doi/10.1161/CIR.0b013e31829b5b44
- `mitdb`: MIT-BIH Arrhythmia Database, PhysioNet. Open Data Commons Attribution License v1.0.
- `ptb-xl`: PTB-XL v1.0.3, PhysioNet. Creative Commons Attribution 4.0.
- `incartdb`: St Petersburg INCART 12-lead Arrhythmia Database v1.0.0, PhysioNet. Open Data Commons Attribution License v1.0. Licens och citering kontrollerade på PhysioNet 2026-10-07.
