# Öppna frågor

| Fråga                                                                                 | Vem svarar | Källa |
| ------------------------------------------------------------------------------------- | ---------- | ----- |
| Appens namn. Manifestet använder platshållaren _EKG-träning arbetsprov_ tills vidare. | Oscar      | Fas 0 |
| GitHub Pages sökväg (`BASE_PATH`) bestäms när repot finns.                            | Oscar      | Fas 0 |

## Medvetet utelämnade fynd

Läggs till först efter klinikens PM och granskarens svar.

| Fråga                                                                                     | Vem svarar | Källa                       |
| ----------------------------------------------------------------------------------------- | ---------- | --------------------------- |
| Nytillkommet förmaksflimmer eller fladder: ska det in, och med vilken åtgärd?             | Granskaren | PLAN.md, Medvetet utelämnat |
| Ventrikelflimmer och akut rutin: ska fyndet in, och vilken rutin gäller vid larm?         | Granskaren | PLAN.md, Medvetet utelämnat |
| AV-block I: ska det in, och med vilken åtgärd?                                            | Granskaren | PLAN.md, Medvetet utelämnat |
| Icke-ihållande VT: ska det in, och med vilken åtgärd?                                     | Granskaren | PLAN.md, Medvetet utelämnat |
| Klinikens definition av ihållande VT (`vt-ihallande` anger ingen tidsgräns tills vidare). | Granskaren | PLAN.md, Medvetet utelämnat |
| Bigemini: ska det in, och med vilken åtgärd?                                              | Granskaren | PLAN.md, Medvetet utelämnat |

## Platshållare och utkast

| Fråga                                                                                                                                                                                                                                                                                   | Vem svarar           | Källa                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------- |
| `protocol.json` följer AHA:s exempel för cykel (start 25 W, steg 25 W var 120 s, återhämtning minst 360 s). Stämmer det med klinikens protokoll?                                                                                                                                        | Oscar (klinikens PM) | Fas 2                  |
| `protocol.bpEverySec: 120` är en platshållare. Hur ofta mäts BT enligt klinikens PM?                                                                                                                                                                                                    | Oscar (klinikens PM) | Fas 2                  |
| Fortsätt-fynden (`ves-enstaka`, `sves-enstaka`, `sinustakykardi`, `puls-85-procent`) är inte avbrottskriterier i AHA:s tabell. Bekräfta klassningen _Fortsätt och observera_.                                                                                                           | Granskaren           | PLAN.md, Seed-innehåll |
| BT-fall >10 mmHg (`bt-fall-med-ischemi`, `bt-fall-utan-ischemi`): mot vilket värde mäts fallet, föregående mätning eller utgångsvärdet? Fyndtexterna anger inget referensvärde tills vidare.                                                                                            | Granskaren           | Fas 2                  |
| `puls-85-procent`: vilken formel för åldersberäknad maxpuls använder kliniken?                                                                                                                                                                                                          | Granskaren           | Fas 2                  |
| Alla `summary`, `recognize`, `confuseWith`, `todo` och `aliases` i `content/findings/` är utkast skrivna av Claude Code och behöver granskas. `todo` hänvisar till _ansvarig läkare enligt klinikens rutin_ tills PM:ets larmrutin finns.                                               | Granskaren           | Fas 2                  |
| EKG-presets i `content/ecg-presets/` är syntetiska utkast (avledning II) och behöver granskas mot fyndet: frekvenser, morfologi och ST-nivåer. `av-block-2-3` visar först Mobitz II och sedan grad III i samma preset. `st-hojning` visar +2 mm och `st-sankning` −2,5 mm horisontellt. | Granskaren           | Fas 3                  |

## Riktiga EKG-remsor (fas 4)

| Fråga                                                                                                                                                                                                                                                                | Vem svarar | Källa |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----- |
| Alla remsor är vilo-EKG och `utkast`. Granskaren behöver bekräfta att varje remsa visar fyndet, särskilt `st-hojning` (PTB-XL-koden STE_ är _icke-specifik_ ST-höjning) och `ves-multifokala` (urvalet bygger på att två VES i fönstret har tydligt olika QRS-form). | Granskaren | Fas 4 |
| `skankelblock-nytt`: en remsa kan visa skänkelblock men inte att det är _nytillkommet_. Räcker morfologin?                                                                                                                                                           | Granskaren | Fas 4 |
| Pipelinen körs med Python 3.12 (Homebrew) i stället för planens 3.11, eftersom 3.11 inte fanns installerat. Versionerna av alla paket är låsta i `scripts/ecg/requirements.txt`.                                                                                     | Oscar      | Fas 4 |

## Riktiga 12-avlednings-EKG (fas 5)

| Fråga                                                                                                                                                                                                                                                                              | Vem svarar | Källa |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----- |
| `vt-ihallande-1` kommer från INCART I42: en VT-episod på cirka 60 s i cirka 175/min under ett Holter-EKG. Remsan visar 10 s mitt i episoden. Räcker det som exempel på ihållande VT?                                                                                               | Granskaren | Fas 5 |
| `ves-multifokala-3` (INCART I51) är vald för att två VES i fönstret har olika QRS-form i avledning II, under bigemini. Visar den multiforma VES?                                                                                                                                   | Granskaren | Fas 5 |
| `svt-3` (PTB-XL 8461, kod SVTAC/PSVT) har baslinjevandring i slutet av V4–V6 och avledning II. Byt ut om det stör. Chapman/Shaoxing-databasen (_A large scale 12-lead ECG database for arrhythmia study_, CC BY 4.0) har fler SVT-EKG men saknar VT-kod, och användes därför inte. | Granskaren | Fas 5 |
| INCART är Holter-EKG (257 Hz, omsamplat till 250 Hz), inte vilo-EKG. Ett kvalitetsfilter (baslinje och brus) och utesluten post I06 (brus) valde fönstren. Granskaren bekräftar att varje INCART-remsa visar fyndet.                                                               | Granskaren | Fas 5 |
| Normala EKG `normal-1`–`normal-4` (PTB-XL, NORM och SR, cirka 60, 70, 80 och 90/min). Bekräfta att de är normala.                                                                                                                                                                  | Granskaren | Fas 5 |
