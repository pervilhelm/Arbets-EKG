import { useEffect, useMemo, useState } from "react";
import { presetById } from "../../content";
import type { Finding } from "../../content/schema";
import { EcgStrip } from "../../ecg/EcgStrip";
import { generate } from "../../ecg/generator";
import { loadStrip, type LoadedStrip } from "../../ecg/strips";

const SYNTHETIC = "syntetiskt";

function RealStrip({ data, finding }: { data: LoadedStrip; finding: Finding }) {
  const { strip, leads, twelveLead } = data;
  return (
    <>
      {twelveLead ? (
        <EcgStrip
          layout="12-lead"
          leads={leads}
          fs={strip.fs}
          label={`EKG med 12 avledningar: exempel på ${finding.name.toLowerCase()}`}
        />
      ) : (
        <EcgStrip
          samples={leads[Object.keys(leads)[0]]}
          fs={strip.fs}
          label={`EKG med en avledning: exempel på ${finding.name.toLowerCase()}`}
        />
      )}
      <p className="mt-1 text-xs text-slate-600">
        Riktigt EKG, {twelveLead ? "12 avledningar" : "en avledning (extra rytmexempel)"}. Källa:{" "}
        {strip.dataset.toUpperCase()}, post {strip.record}.
      </p>
    </>
  );
}

function SyntheticStrip({ presetId, finding }: { presetId: string; finding: Finding }) {
  const preset = presetById.get(presetId)!;
  const signal = useMemo(() => generate(preset.rhythm, 10), [preset]);
  return (
    <>
      <p className="mb-1 inline-block rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold">
        Syntetiskt EKG, genererat – inte en riktig patient
      </p>
      <EcgStrip
        samples={signal.samples}
        fs={signal.fs}
        label={`Syntetiskt EKG med en avledning: exempel på ${finding.name.toLowerCase()}`}
      />
    </>
  );
}

function useRealStrips(ids: string[]): LoadedStrip[] | "error" | null {
  const key = ids.join(",");
  const [state, setState] = useState<{ key: string; value: LoadedStrip[] | "error" }>();
  useEffect(() => {
    let live = true;
    Promise.all(ids.map(loadStrip)).then(
      // 12-lead first: the single-lead MIT-BIH strips are only extra rhythm examples.
      (all) =>
        live &&
        setState({ key, value: [...all].sort((a, b) => Number(b.twelveLead) - Number(a.twelveLead)) }),
      () => live && setState({ key, value: "error" }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ids is represented by key
  }, [key]);
  return state?.key === key ? state.value : null;
}

/** Real ECGs first (12-lead before single-lead), the synthetic preset last as a labelled complement. */
export function FindingEcg({ finding }: { finding: Finding }) {
  const presetId = finding.ecg?.presetId;
  const real = useRealStrips(finding.ecg?.stripIds ?? []);
  const [selected, setSelected] = useState<string>();

  if (real === null) return <p className="p-4 text-sm text-slate-600">Laddar EKG …</p>;
  if (real === "error") return <p className="p-4 text-sm text-red-800">EKG:t kunde inte laddas.</p>;

  const tabs = [
    ...real.map((r, i) => ({ key: r.strip.id, label: `EKG ${i + 1}` })),
    ...(presetId ? [{ key: SYNTHETIC, label: "Syntetiskt" }] : []),
  ];
  if (tabs.length === 0) return null;
  const active = tabs.find((t) => t.key === selected)?.key ?? tabs[0].key;
  const activeStrip = real.find((r) => r.strip.id === active);

  return (
    <section aria-label="EKG">
      {tabs.length > 1 && (
        <div role="tablist" aria-label="EKG-exempel" className="mb-2 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={t.key === active}
              aria-controls="ekg-panel"
              onClick={() => setSelected(t.key)}
              className={`min-h-11 rounded-lg border px-4 text-sm font-semibold ${
                t.key === active ? "border-sky-800 bg-sky-800 text-white" : "border-slate-400 bg-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div id="ekg-panel" role="tabpanel" aria-labelledby={`tab-${active}`}>
        {activeStrip ? (
          <RealStrip key={active} data={activeStrip} finding={finding} />
        ) : (
          <SyntheticStrip presetId={presetId!} finding={finding} />
        )}
      </div>
    </section>
  );
}
