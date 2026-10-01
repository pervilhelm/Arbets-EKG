import { useMemo } from "react";
import { ecgPresets, findingById, presetById } from "../content";
import { Page } from "../ui/Page";
import { EcgStrip } from "./EcgStrip";
import { generate } from "./generator";

const STRIP_SEC = 10;

function PresetStrip({ id }: { id: string }) {
  const preset = presetById.get(id)!;
  const signal = useMemo(() => generate(preset.rhythm, STRIP_SEC), [preset]);
  const name = preset.findingId ? findingById.get(preset.findingId)?.name : "Normal sinusrytm";
  return (
    <li className="space-y-1">
      <h2 className="font-mono text-sm font-semibold">
        {preset.id} <span className="font-sans font-normal text-slate-600">{name}</span>
      </h2>
      <EcgStrip samples={signal.samples} fs={signal.fs} label={`EKG-remsa: ${name}`} />
    </li>
  );
}

/** Development-only overview of every ECG preset. */
export function DevEcgPage() {
  const sinus = useMemo(() => generate(presetById.get("sinus")!.rhythm, 30), []);
  return (
    <Page title="EKG-presets (dev)">
      <h2 className="mb-1 font-mono text-sm font-semibold">sinus, sweep</h2>
      <EcgStrip samples={sinus.samples} fs={sinus.fs} mode="sweep" label="EKG-monitor: normal sinusrytm" />
      <ul className="mt-6 space-y-6">
        {ecgPresets.map((p) => (
          <PresetStrip key={p.id} id={p.id} />
        ))}
      </ul>
    </Page>
  );
}
