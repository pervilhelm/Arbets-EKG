// Printable review sheet for the medical reviewer. Dev build only (/granskning).
// Lists every finding, real ECG, synthetic preset, guide step and case with its id
// and room for "Godkänd" and "Kommentar".
import { useEffect, useMemo, type ReactNode } from "react";
import { cases, ecgPresets, findingById, findings, guide, protocol } from "../../content";
import type { EcgPreset, Finding, Review } from "../../content/schema";
import { EcgStrip } from "../../ecg/EcgStrip";
import { generate } from "../../ecg/generator";
import { useStrip } from "../../ecg/useStrip";
import { ACTION_META, ACTIONS } from "../lookup/actions";

const CATEGORY_LABEL: Record<Finding["category"], string> = {
  arytmi: "Arytmi",
  overledning: "Överledning",
  ischemi: "Ischemi",
  blodtryck: "Blodtryck",
  symtom: "Symtom",
  ovrigt: "Övrigt",
};

function Status({ review }: { review: Review }) {
  return review.status === "granskad" ? (
    <span className="text-sm">
      Granskad {review.date} av {review.reviewer}
    </span>
  ) : (
    <span className="rounded bg-amber-200 px-1.5 text-sm font-semibold">Utkast</span>
  );
}

function SignOff() {
  return (
    <div className="mt-3 grid grid-cols-[auto_1fr] items-end gap-x-4 gap-y-2 border-t border-slate-300 pt-2 text-sm">
      <span>
        <span className="mr-1 inline-block h-4 w-4 border border-slate-700 align-middle" /> Godkänd
      </span>
      <span>
        Kommentar: <span className="inline-block w-full border-b border-slate-500" />
      </span>
      <span />
      <span className="block h-6 border-b border-slate-500" />
    </div>
  );
}

function Item({
  id,
  title,
  review,
  children,
}: {
  id: string;
  title: string;
  review: Review;
  children: ReactNode;
}) {
  return (
    <article className="mt-4 break-inside-avoid rounded border border-slate-400 p-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="font-mono text-sm">{id}</span>
      </header>
      <Status review={review} />
      <div className="mt-2 space-y-1">{children}</div>
      <SignOff />
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <span className="font-semibold">{label}:</span> {children}
    </p>
  );
}

function RealEcg({ id }: { id: string }) {
  const data = useStrip(id);
  if (data === null) return <p>Laddar {id} …</p>;
  if (data === "error") return <p className="text-red-800">Remsan {id} kunde inte laddas.</p>;
  const { strip, leads, twelveLead } = data;
  const label = `EKG ${id}`;
  return (
    <figure className="mt-2 break-inside-avoid">
      {twelveLead ? (
        <EcgStrip layout="12-lead" leads={leads} fs={strip.fs} label={label} minPxPerMm={2.5} />
      ) : (
        <EcgStrip samples={leads[Object.keys(leads)[0]]} fs={strip.fs} label={label} />
      )}
      <figcaption className="text-sm">
        <span className="font-mono">{id}</span> · {strip.dataset.toUpperCase()} post {strip.record}, från{" "}
        {strip.startSec.toFixed(1)} s · {twelveLead ? "12 avledningar" : "en avledning"} ·{" "}
        {strip.findingId ? `märkt ${findingById.get(strip.findingId)?.name}` : "normalt EKG"}
      </figcaption>
    </figure>
  );
}

function StripItem({ id }: { id: string }) {
  return (
    <article className="mt-4 break-inside-avoid rounded border border-slate-400 p-3">
      <RealEcg id={id} />
      <p className="mt-1 text-sm">Visar remsan det fynd den är märkt med?</p>
      <SignOff />
    </article>
  );
}

function PresetItem({ preset }: { preset: EcgPreset }) {
  const signal = useMemo(() => generate(preset.rhythm, 10), [preset]);
  const finding = preset.findingId ? findingById.get(preset.findingId) : undefined;
  return (
    <Item id={preset.id} title={finding?.name ?? "Sinusrytm"} review={preset.review}>
      <EcgStrip samples={signal.samples} fs={signal.fs} label={`Syntetiskt EKG ${preset.id}`} />
      <p className="text-sm">
        Avledning {preset.lead}, grundfrekvens {preset.rhythm.baseHr}/min
        {preset.rhythm.st && `, ST ${preset.rhythm.st.mm} mm ${preset.rhythm.st.slope}`}
        {preset.rhythm.qrsMs && `, QRS ${preset.rhythm.qrsMs} ms`}.
      </p>
    </Item>
  );
}

function FindingItem({ finding: f }: { finding: Finding }) {
  return (
    <Item id={f.id} title={f.name} review={f.review}>
      <Field label="Åtgärd">{ACTION_META[f.action].label}</Field>
      <Field label="Kategori">{CATEGORY_LABEL[f.category]}</Field>
      <Field label="Sökord">{f.aliases.join(", ")}</Field>
      <Field label="Sammanfattning">{f.summary}</Field>
      <div>
        <span className="font-semibold">Känns igen på:</span>
        <ul className="ml-5 list-disc">
          {f.recognize.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      {f.confuseWith.length > 0 && (
        <div>
          <span className="font-semibold">Förväxla inte med:</span>
          <ul className="ml-5 list-disc">
            {f.confuseWith.map((c) => (
              <li key={c.findingId}>
                {findingById.get(c.findingId)?.name}: {c.difference}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Field label="Gör så här">{f.todo}</Field>
      <Field label="Källa">{f.sources.map((s) => `${s.sourceId}, ${s.locator}`).join("; ")}</Field>
      <Field label="Riktiga EKG">{f.ecg?.stripIds.length ? f.ecg.stripIds.join(", ") : "saknas"}</Field>
    </Item>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="break-after-avoid border-b-2 border-slate-700 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export function SignoffPage() {
  useEffect(() => {
    document.title = "Granskning · Arbets-EKG";
  }, []);

  const stripIds = useMemo(() => {
    const ids = new Set<string>();
    for (const f of findings) f.ecg?.stripIds.forEach((id) => ids.add(id));
    for (const c of cases)
      [c.baseline.stripId, ...c.steps.map((s) => s.stripId)].forEach((id) => ids.add(id));
    guide.steps.forEach((s) => ids.add(s.stripId));
    return [...ids].sort();
  }, []);

  return (
    <div className="text-slate-900">
      <h1 className="text-2xl font-bold">Granskningsunderlag, Arbets-EKG</h1>
      <p className="mt-2">
        Innehållsversion {__APP_VERSION__}, utskrivet {new Date().toISOString().slice(0, 10)}. Allt innehåll
        nedan är utkast skrivna av Claude Code. Markera <em>Godkänd</em> eller skriv en kommentar per post.
        Källa för avbrottskriterierna är AHA 2013 (Fletcher m.fl., Circulation 2013;128:873–934).
      </p>
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
        <span>Granskare:</span>
        <span className="border-b border-slate-500" />
        <span>Datum:</span>
        <span className="border-b border-slate-500" />
        <span>Signatur:</span>
        <span className="border-b border-slate-500" />
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="mt-4 min-h-11 rounded-lg bg-sky-800 px-4 font-semibold text-white print:hidden"
      >
        Skriv ut
      </button>

      <Section title="1. Protokoll">
        <Item id="protocol" title="Cykelprotokoll" review={protocol.review}>
          <Field label="Startbelastning">
            {[protocol.startW, ...(protocol.altStartW ?? [])].map((w) => `${w} W`).join(" eller ")}
          </Field>
          <Field label="Ökning">
            {protocol.stepW} W var {protocol.stepSec / 60}:e minut
          </Field>
          <Field label="Blodtryck">var {protocol.bpEverySec / 60}:e minut</Field>
          <Field label="Återhämtning">minst {protocol.recoveryMinSec / 60} minuter</Field>
        </Item>
      </Section>

      <Section title={`2. Fynd och åtgärder (${findings.length})`}>
        {ACTIONS.map((action) => (
          <div key={action}>
            <h3 className="mt-6 text-lg font-bold">{ACTION_META[action].label}</h3>
            {findings
              .filter((f) => f.action === action)
              .map((f) => (
                <FindingItem key={f.id} finding={f} />
              ))}
          </div>
        ))}
      </Section>

      <Section title={`3. Riktiga EKG (${stripIds.length})`}>
        {stripIds.map((id) => (
          <StripItem key={id} id={id} />
        ))}
      </Section>

      <Section title={`4. Tolkningsguide (${guide.steps.length} steg)`}>
        {guide.steps.map((s, i) => (
          <Item key={s.id} id={s.id} title={`Steg ${i + 1}: ${s.title}`} review={guide.review}>
            <Field label="Förklaring">{s.explanation}</Field>
            <Field label="Under belastning">{s.underLoad}</Field>
            <Field label="EKG">{s.stripId}</Field>
            <Field label="Länkade fynd">
              {s.findingIds.map((id) => findingById.get(id)?.name).join(", ")}
            </Field>
          </Item>
        ))}
      </Section>

      <Section title={`5. Fallövningar (${cases.length})`}>
        {cases.map((c) => (
          <Item key={c.id} id={c.id} title={c.title} review={c.review}>
            <Field label="Bakgrund">{c.background}</Field>
            <Field label="Utgångsläge">
              EKG {c.baseline.stripId}, puls {c.baseline.hr}, BT {c.baseline.sbp}/{c.baseline.dbp}
            </Field>
            <ol className="ml-5 list-decimal">
              {c.steps.map((s, i) => {
                const f = s.findingId ? findingById.get(s.findingId) : undefined;
                return (
                  <li key={i}>
                    {s.phase === "belastning" ? `${s.watt} W` : "Återhämtning"} {clock(s.timeSec)} · EKG{" "}
                    {s.stripId} · puls {s.hr} · BT {s.sbp}/{s.dbp}
                    {s.symptom && ` · Patienten säger: ”${s.symptom}”`} · Rätt åtgärd:{" "}
                    {f ? `${ACTION_META[f.action].label} (${f.name})` : "Fortsätt (inget fynd)"}
                  </li>
                );
              })}
            </ol>
          </Item>
        ))}
      </Section>

      <Section title={`6. Syntetiska EKG (${ecgPresets.length}, visas som märkt komplement)`}>
        {ecgPresets.map((p) => (
          <PresetItem key={p.id} preset={p} />
        ))}
      </Section>
    </div>
  );
}
