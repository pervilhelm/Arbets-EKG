import { EcgStrip } from "../ecg/EcgStrip";
import type { LoadedStrip } from "../ecg/strips";

/** A real 12-lead ECG with its source line. The label must not give away the answer. */
export function PracticeEcg({ data, label }: { data: LoadedStrip | "error" | null; label: string }) {
  if (data === null) return <p className="p-4 text-sm text-slate-600">Laddar EKG …</p>;
  if (data === "error") return <p className="p-4 text-sm text-red-800">EKG:t kunde inte laddas.</p>;
  return (
    <>
      <EcgStrip layout="12-lead" leads={data.leads} fs={data.strip.fs} label={label} />
      <p className="mt-1 text-xs text-slate-600">
        Riktigt vilo-EKG, 12 avledningar. Källa: {data.strip.dataset.toUpperCase()}, post {data.strip.record}.
      </p>
    </>
  );
}
