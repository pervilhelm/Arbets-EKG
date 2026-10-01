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

| Fråga                                                                                                                                                                                                                                                                                                                                                                      | Vem svarar           | Källa |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----- |
| `vt-ihallande` har ingen riktig remsa. MIT-BIH saknar ihållande snabb VT: alla episoder med minst 120/min är kortare än 5 s, och de långa episoderna i post 223 är långsamma (cirka 105/min) och bidirektionella. Ska vi lägga till en databas med ihållande VT (t.ex. MIT-BIH Malignant Ventricular Ectopy Database på PhysioNet)? Det kräver att `Strip.dataset` utökas. | Oscar och granskaren | Fas 4 |
| Alla remsor är vilo-EKG och `utkast`. Granskaren behöver bekräfta att varje remsa visar fyndet, särskilt `st-hojning` (PTB-XL-koden STE_ är _icke-specifik_ ST-höjning) och `ves-multifokala` (urvalet bygger på att två VES i fönstret har tydligt olika QRS-form).                                                                                                       | Granskaren           | Fas 4 |
| `skankelblock-nytt`: en remsa kan visa skänkelblock men inte att det är _nytillkommet_. Räcker morfologin?                                                                                                                                                                                                                                                                 | Granskaren           | Fas 4 |
| Pipelinen körs med Python 3.12 (Homebrew) i stället för planens 3.11, eftersom 3.11 inte fanns installerat. Versionerna av alla paket är låsta i `scripts/ecg/requirements.txt`.                                                                                                                                                                                           | Oscar                | Fas 4 |
