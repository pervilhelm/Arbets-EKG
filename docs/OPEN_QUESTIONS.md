# Öppna frågor

### Besvarat 2026-10-08 (Oscar)

- Det finns inget klinik-PM. Avbrottskriterierna följer AHA 2013, eftersom det är dem appen ska lära ut.
- BT mäts var 3:e minut. Vid avbrott tillkallas läkaren.
- Protokoll: start 50 W eller 75 W, ökning 25 W varannan minut.
- BT-fall räknas mot föregående mätning.
- Tre VES eller fler i följd är VT. Den är icke-ihållande tills den har pågått i 30 sekunder eller mer.
- Förmaksflimmer/fladder, kammarflimmer, AV-block I, icke-ihållande VT och bigemini ska med.
- Appen heter Arbets-EKG. Repo: github.com/pervilhelm/Arbets-EKG (privat). Appen publiceras på GitHub Pages med `noindex`. Sidan är nåbar för den som har länken.
- En läkare granskar innehållet. Fas 9 genomförs utan granskaren, och allt förblir `utkast` tills granskningen är gjord.

| Fråga | Vem svarar | Källa |
| ----- | ---------- | ----- |

## Fynd tillagda i fas 9

| Fråga                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Vem svarar | Källa |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----- |
| `formaksflimmer-fladder` (överväg), `ventrikelflimmer` (avbryt), `av-block-1` (fortsätt) och `ves-bigemini` (överväg) är utkast. Åtgärderna är Claude Codes tolkning av AHA 2013. Bekräfta särskilt `ves-bigemini`, som AHA inte nämner uttryckligen.                                                                                                                                                                                                           | Granskaren | Fas 9 |
| Riktiga EKG hämtade 2026-10-08: `formaksflimmer-fladder-1` (PTB-XL 15834, AFIB), `-2` (PTB-XL 10160, AFLT, flimmervågorna är svåra att se), `-3` (MIT-BIH 222, en avledning), `av-block-1-1` (PTB-XL 9265), `ves-bigemini-1` (INCART I51, samma post som `ves-multifokala-3`) och `ves-bigemini-2` (MIT-BIH 200, en avledning). Visar de fynden? Kammarflimmer har bara ett syntetiskt EKG, eftersom ingen av databaserna har kammarflimmer med 12 avledningar. | Granskaren | Fas 9 |
| `ves-trioler` heter nu _Icke-ihållande VT (tre VES eller fler i följd)_ och `vt-ihallande` gäller VT i 30 sekunder eller mer. Id:na är oförändrade.                                                                                                                                                                                                                                                                                                             | Granskaren | Fas 9 |
| BT-fall räknas nu mot föregående mätning (Oscars besked). AHA 2013 räknar fallet från utgångsvärdet (_from baseline_). Om avvikelsen behålls ska den få en egen `sourceId` enligt fas 9.                                                                                                                                                                                                                                                                        | Granskaren | Fas 9 |
| Fallen har fått nya steg: AV-block I i _Yrsel och trötthet_, bigemini i _Andfåddhet_ och förmaksflimmer i _Högt blodtryck_. Är de rimliga?                                                                                                                                                                                                                                                                                                                      | Granskaren | Fas 9 |
| Startbelastningen är 50 W (alternativt 75 W). Fallens belastning är omräknad, men puls och BT i fallen är oförändrade. Är de fortfarande rimliga?                                                                                                                                                                                                                                                                                                               | Granskaren | Fas 9 |

## Platshållare och utkast

| Fråga                                                                                                                                                                                                                                                                                   | Vem svarar | Källa                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------- |
| Fortsätt-fynden (`ves-enstaka`, `sves-enstaka`, `sinustakykardi`, `puls-85-procent`) är inte avbrottskriterier i AHA:s tabell. Bekräfta klassningen _Fortsätt och observera_.                                                                                                           | Granskaren | PLAN.md, Seed-innehåll |
| `puls-85-procent`: vilken formel för åldersberäknad maxpuls ska användas (220 − ålder eller annan)? Oscar känner inte till någon svensk standard.                                                                                                                                       | Granskaren | Fas 2                  |
| Alla `summary`, `recognize`, `confuseWith`, `todo` och `aliases` i `content/findings/` är utkast skrivna av Claude Code och behöver granskas. `todo` hänvisar till _ansvarig läkare enligt klinikens rutin_ tills PM:ets larmrutin finns.                                               | Granskaren | Fas 2                  |
| EKG-presets i `content/ecg-presets/` är syntetiska utkast (avledning II) och behöver granskas mot fyndet: frekvenser, morfologi och ST-nivåer. `av-block-2-3` visar först Mobitz II och sedan grad III i samma preset. `st-hojning` visar +2 mm och `st-sankning` −2,5 mm horisontellt. | Granskaren | Fas 3                  |

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

## Fler fall (efter fas 9)

| Fråga                                                                                                                                                                                                                                                                                                                             | Vem svarar | Källa     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| Sex nya fall (`blodtrycket-faller`, `hjartsvikt`, `snurrar`, `tilltagande-smarta`, `vill-sluta`, `illamaende`) är utkast skrivna av Claude Code och behöver granskas. De täcker BT-fall med och utan ischemi, trötthet/dyspné, CNS-symtom, angina, patienten vill avbryta och dålig perfusion.                                    | Granskaren | Fler fall |
| Tio fall till (`motionar`, `oregelbunden-puls`, `tyst-ischemi`, `blodtrycket-stiger`, `hjartat-rusar`, `hjartsvikt-efter-infarkt`, `nytt-skankelblock`, `lang-pq`, `det-hoppar`, `fladder-orkar-inte`) är utkast skrivna av Claude Code och behöver granskas. Tre av dem slutar utan avbrott och några har fynd i återhämtningen. | Granskaren | Fler fall |
| Tre fall med unga vältränade (`elitcyklist`, `svimmade-pa-planen`, `lopare-hjartklappning`) är utkast skrivna av Claude Code och behöver granskas. De har höga belastningar (upp till 250 W) och långa testtider.                                                                                                                 | Granskaren | Fler fall |
| Fallen kan bara visa vad patienten säger, inte vad sjuksköterskan ser. I `illamaende` bedöms steget efter `dalig-perfusion`, men blekhet och kallsvett syns inte. Ska stegen få ett fält för observation (t.ex. _Du ser: ..._)? Samma behov finns för `tekniskt-fel`, som därför saknar fall.                                     | Oscar      | Fler fall |
| `ventrikelflimmer` har ingen 12-avlednings-remsa och finns därför inte i något fall.                                                                                                                                                                                                                                              | Oscar      | Fler fall |
