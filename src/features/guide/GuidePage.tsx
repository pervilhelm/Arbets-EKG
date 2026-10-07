import { Link, useSearchParams } from "react-router";
import { findingById, guide } from "../../content";
import { EcgStrip } from "../../ecg/EcgStrip";
import { useStrip } from "../../ecg/useStrip";
import { Page } from "../../ui/Page";

export function GuidePage() {
  const [params, setParams] = useSearchParams();
  const last = guide.steps.length - 1;
  const index = Math.min(Math.max((Number(params.get("steg")) || 1) - 1, 0), last);
  const step = guide.steps[index];
  const strip = useStrip(step.stripId);
  const go = (i: number) => setParams({ steg: String(i + 1) }, { replace: true });

  return (
    <Page title="Tolka EKG">
      <p className="mb-3 text-sm font-semibold text-slate-700">
        Steg {index + 1} av {guide.steps.length}
      </p>
      <h2 className="mb-2 text-xl font-bold">
        {index + 1}. {step.title}
      </h2>
      {guide.review.status === "utkast" && (
        <p className="mb-3 inline-block rounded-lg border border-yellow-500 bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-950">
          Ej granskad
        </p>
      )}

      {strip === null && <p className="p-4 text-sm text-slate-600">Laddar EKG …</p>}
      {strip === "error" && <p className="p-4 text-sm text-red-800">EKG:t kunde inte laddas.</p>}
      {strip && strip !== "error" && (
        <>
          <EcgStrip
            layout="12-lead"
            leads={strip.leads}
            fs={strip.strip.fs}
            label={`EKG med 12 avledningar: exempel till steget ${step.title.toLowerCase()}`}
          />
          <p className="mt-1 text-xs text-slate-600">
            Riktigt EKG, 12 avledningar. Källa: {strip.strip.dataset.toUpperCase()}, post {strip.strip.record}
            .
          </p>
        </>
      )}

      <p className="mt-4 text-lg">{step.explanation}</p>
      <h3 className="mt-4 mb-1 text-lg font-bold">Under belastning</h3>
      <p>{step.underLoad}</p>

      {step.findingIds.length > 0 && (
        <>
          <h3 className="mt-4 mb-1 text-lg font-bold">Relevanta fynd</h3>
          <ul className="flex flex-wrap gap-2">
            {step.findingIds.map((id) => (
              <li key={id}>
                <Link
                  to={`/fynd/${id}`}
                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-400 bg-white px-3 font-semibold text-sky-800 underline"
                >
                  {findingById.get(id)?.name ?? id}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-6 flex justify-between gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => go(index - 1)}
          className="min-h-11 flex-1 rounded-lg border border-slate-400 bg-white px-4 font-semibold disabled:opacity-40"
        >
          Föregående
        </button>
        <button
          type="button"
          disabled={index === last}
          onClick={() => go(index + 1)}
          className="min-h-11 flex-1 rounded-lg bg-sky-800 px-4 font-semibold text-white disabled:opacity-40"
        >
          Nästa
        </button>
      </div>
    </Page>
  );
}
