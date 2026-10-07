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

| Fråga                                                                                                                                            | Vem svarar           | Källa |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ----- |
| `ves-multifokala-3` (INCART I51) är vald för att två VES i fönstret har olika QRS-form i avledning II, under bigemini. Visar den multiforma VES? | Oscar och granskaren | Fas 5 |

### Besvarat 2026-10-07 (Oscar)

- `vt-ihallande-1` (INCART I42, 10 s ur en VT-episod på cirka 60 s i cirka 175/min) räcker som exempel på ihållande VT.
- `svt-3` (PTB-XL 8461) behålls trots baslinjevandringen i slutet.
- INCART-remsorna är Holter-EKG. Granskaren bekräftar ändå varje remsa i fas 9.
- De normala EKG:na `normal-1`–`normal-4` behålls. Granskaren bekräftar dem i fas 9.

Remsorna är fortfarande `utkast`. Statusen `granskad` sätts först i fas 9.

## Quiz och fallövningar (fas 8)

| Fråga                                                                                                                                                                                                                                                                | Vem svarar           | Källa |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----- |
| De sex fallen i `content/cases/` (bakgrund, puls, BT, symtomrepliker och vilket fynd varje steg bedöms efter) är utkast skrivna av Claude Code och behöver granskas.                                                                                                 | Granskaren           | Fas 8 |
| EKG:n i fallen är vilo-EKG. Pulsen i steget ligger nära remsans frekvens där det går, men inte alltid (t.ex. `puls-85-procent` visas med `sinustakykardi-1`, cirka 100/min, medan steget anger 134/min). Räcker det att appen säger att puls och BT hör till fallet? | Oscar och granskaren | Fas 8 |
| Planen anger inte vad timeout betyder för andra fynd än `avbryt`. Appen räknar timeout som _Fortsätt_ (ingen agerade): rätt vid inget fynd eller grönt fynd, _missat fynd_ vid `overvag`, _missat avbrott_ vid `avbryt`.                                             | Oscar                | Fas 8 |
| Ett steg med `overvag` där användaren väljer _Fortsätt_ kallas _missat fynd_ i genomgången (planen namnger inte utfallet).                                                                                                                                           | Oscar                | Fas 8 |
| _Avbryt testet_ avslutar fallet direkt, även när det är rätt vid `overvag`. Steg efter det visas i genomgången som _Spelades inte_. Valideringen kräver därför att ett avbrottsfynd ligger i fallets sista steg.                                                     | Oscar                | Fas 8 |
| Fliken _Repetera_ i bottenmenyn är fortfarande tom. Quizet tar redan tillbaka felbesvarade frågor oftare. Ska fliken tas bort eller få innehåll?                                                                                                                     | Oscar                | Fas 8 |
