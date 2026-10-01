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

| Fråga                                                                                                                                                                                                                                     | Vem svarar           | Källa                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------- |
| `protocol.json` följer AHA:s exempel för cykel (start 25 W, steg 25 W var 120 s, återhämtning minst 360 s). Stämmer det med klinikens protokoll?                                                                                          | Oscar (klinikens PM) | Fas 2                  |
| `protocol.bpEverySec: 120` är en platshållare. Hur ofta mäts BT enligt klinikens PM?                                                                                                                                                      | Oscar (klinikens PM) | Fas 2                  |
| Fortsätt-fynden (`ves-enstaka`, `sves-enstaka`, `sinustakykardi`, `puls-85-procent`) är inte avbrottskriterier i AHA:s tabell. Bekräfta klassningen _Fortsätt och observera_.                                                             | Granskaren           | PLAN.md, Seed-innehåll |
| BT-fall >10 mmHg (`bt-fall-med-ischemi`, `bt-fall-utan-ischemi`): mot vilket värde mäts fallet, föregående mätning eller utgångsvärdet? Fyndtexterna anger inget referensvärde tills vidare.                                              | Granskaren           | Fas 2                  |
| `puls-85-procent`: vilken formel för åldersberäknad maxpuls använder kliniken?                                                                                                                                                            | Granskaren           | Fas 2                  |
| Alla `summary`, `recognize`, `confuseWith`, `todo` och `aliases` i `content/findings/` är utkast skrivna av Claude Code och behöver granskas. `todo` hänvisar till _ansvarig läkare enligt klinikens rutin_ tills PM:ets larmrutin finns. | Granskaren           | Fas 2                  |
| `content/ecg-presets/` är stubbar (`rhythm: {}`) som fylls i fas 3.                                                                                                                                                                       | Claude Code          | Fas 2                  |
